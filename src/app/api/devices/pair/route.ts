
import { NextResponse, type NextRequest } from 'next/server';
import { firebase } from '@/lib/firebase'; // Direct import
import { collection, query, where, getDocs, doc, limit, writeBatch, collectionGroup } from 'firebase/firestore';
import type { Device } from '@/lib/types';

const generateApiKey = () => `iotc_${crypto.randomUUID().replace(/-/g, '')}`;

export async function POST(req: NextRequest) {
     try {
        const { db } = firebase; // Use destructured from direct import
        const { hardwareId, pairingToken } = await req.json();

        if (!hardwareId || !pairingToken) {
            return NextResponse.json({ success: false, message: 'Missing hardwareId or pairingToken.' }, { status: 400 });
        }

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
            return NextResponse.json({ success: false, message: 'Invalid or expired pairing token.' }, { status: 403 });
        }
        
        const tokenDoc = tokenSnapshot.docs[0];
        const tokenData = tokenDoc.data();
        const userId = tokenData.userId;

        if (!userId) {
             return NextResponse.json({ success: false, message: 'Pairing token is not associated with a user.' }, { status: 500 });
        }
       
        // 2. Check if device hardware ID is already registered anywhere in the system
        const allDevicesQuery = query(collectionGroup(db, 'devices'), where('id', '==', hardwareId), limit(1));
        const allDevicesSnapshot = await getDocs(allDevicesQuery);
        
        if (!allDevicesSnapshot.empty) {
             return NextResponse.json({
                success: false,
                message: 'This hardware is already registered to an account.'
            }, { status: 409 });
        }

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
