
import { LandingPage } from "@/components/landing-page";

export default function Home() {
  // Directly return the LandingPage component.
  // The original logic for redirecting authenticated users can be handled by middleware
  // or by a user action (e.g., clicking "Go to Dashboard").
  return <LandingPage />;
}
