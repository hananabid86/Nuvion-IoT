
import { NextResponse, type NextRequest } from 'next/server';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, limit, writeBatch, collectionGroup } from 'firebase/firestore';
import type { Device } from '@/lib/types';

const generateApiKey = () => `iotc_${crypto.randomUUID().replace(/-/g, '')}`;

export async function POST(req: NextRequest) {
     try {
        console.log("Pairing request received.");
        const db = getFirebaseDb();
        const { hardwareId, pairingToken } = await req.json();

        if (!hardwareId || !pairingToken) {
            console.log("Pairing failed: Missing hardwareId or pairingToken.");
            return NextResponse.json({ success: false, message: 'Missing hardwareId or pairingToken.' }, { status: 400 });
        }
        console.log(`Attempting to pair device: ${hardwareId} with token: ${pairingToken}`);

        // 1. Validate Pairing Token
        const tokensRef = collection(db, 'pairingTokens');
        const tokenQuery = query(
            tokensRef,
            where('token', '==', pairingToken),
            where('used', '==', false),
            where('expires', '>', new Date()),
            limit(1)
        );
        const tokenSnapshot = await getDocs(tokenQuery);

        if (tokenSnapshot.empty) {
            console.log(`Pairing failed for ${hardwareId}: Invalid or expired token.`);
            return NextResponse.json({ success: false, message: 'Invalid or expired pairing token.' }, { status: 403 });
        }
        
        const tokenDoc = tokenSnapshot.docs[0];
        const tokenData = tokenDoc.data();
        const userId = tokenData.userId || "dev-user";
        console.log(`Found valid token for user ${userId}.`);
       
        // 2. Check if device hardware ID is already registered anywhere in the system
        const allDevicesQuery = query(collectionGroup(db, 'devices'), where('id', '==', hardwareId), limit(1));
        const allDevicesSnapshot = await getDocs(allDevicesQuery);
        
        if (!allDevicesSnapshot.empty) {
             console.log(`Pairing failed for ${hardwareId}: Already registered.`);
             return NextResponse.json({
                success: false,
                message: 'This hardware is already registered to an account.'
            }, { status: 409 });
        }
        console.log(`Hardware ID ${hardwareId} is new.`);

        // 3. Create a new device with a default profile
        const newApiKey = generateApiKey();
        const newDevice: Omit<Device, 'firestoreId'> = {
            id: hardwareId,
            name: `New Device ${hardwareId.slice(-5).replace(/:/g, '')}`,
            apiKey: newApiKey,
            online: false, 
            lastSeen: new Date(),
            data: {
              light: {
                name: 'light',
                displayName: 'Smart Light',
                value: false,
                icon: 'lightbulb',
              }
            },
            owner: userId,
            history: [],
            pendingActions: {},
            alertTriggered: {},
            pinned: false,
        };
        
        const batch = writeBatch(db);
        
        const userDevicesRef = collection(db, `users/${userId}/devices`);
        const newDeviceRef = doc(userDevicesRef);

        batch.set(newDeviceRef, newDevice);

        const apiKeyRef = doc(db, 'apiKeys', newApiKey);
        batch.set(apiKeyRef, { 
          userId: userId,
          deviceId: newDeviceRef.id, // This is the Firestore Document ID
          hardwareId: hardwareId // This is the physical device ID
        });

        const pairingTokenDocRef = doc(db, 'pairingTokens', tokenDoc.id);
        batch.update(pairingTokenDocRef, { used: true });

        await batch.commit();
        
        console.log(`Pairing SUCCESS for ${hardwareId}. New device ID: ${newDeviceRef.id}.`);

        return NextResponse.json({
            success: true,
            message: 'Device paired successfully.',
            apiKey: newApiKey,
        });

    } catch (error: any) {
        console.error('Error in /api/devices/pair:', error);
        return NextResponse.json({ success: false, message: `An unexpected server error occurred: ${error.message}` }, { status: 500 });
    }
}

    