
import type { Timestamp } from 'firebase/firestore';

export type FilterType = 'all' | 'online' | 'offline' | 'alerts' | 'error';

export interface DeviceDataPoint {
  name: string;
  displayName?: string;
  value: string | number | boolean;
  icon: string;
  unit?: string;
  alert?: {
    enabled: boolean;
    condition: 'above' | 'below';
    threshold: number;
  }
}

export interface DeviceData {
  [key:string]: DeviceDataPoint;
}

export interface Device {
  id: string; // This is the hardware ID (e.g. MAC address)
  firestoreId?: string; // The document ID in Firestore
  name:string;
  apiKey: string;
  online: boolean;
  pinned?: boolean;
  lastSeen?: Date | Timestamp | null;
  error?: string | null;
  history?: { timestamp: number; [key: string]: number | boolean | string }[];
  alertTriggered?: { [key: string]: boolean };
  pendingActions?: { [key: string]: any }; // To send commands to device
  owner: string; // UID of the user who owns the device
  data: DeviceData;
}

export interface Notification {
    id: string;
    message: string;
    timestamp: number;
    read: boolean;
    deviceId: string;
}

export interface PairingToken {
    docId: string; // Firestore document ID
    token: string;
    expires: number; // as timestamp
    userId: string;
    used: boolean;
}

// Backend types
export interface UpdateDeviceDataInput {
    apiKey: string;
    data: { [key:string]: DeviceDataPoint };
}

export interface Automation {
  id: string;
  time: string; // e.g., "22:00"
  deviceId: string;
  deviceName: string;
  variableName: string;
  variableDisplayName: string;
  targetState: boolean; // true for "On", false for "Off"
}
