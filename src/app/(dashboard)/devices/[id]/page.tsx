import { DeviceDetailPage } from "@/components/device-detail-page";

export default function DeviceDetails({ params }: { params: { id: string } }) {
  // The ID in the URL is the Firestore document ID, not the hardware ID
  return <DeviceDetailPage deviceId={params.id} />;
}
