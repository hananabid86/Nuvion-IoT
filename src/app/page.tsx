
import { LandingPage } from "@/components/landing-page";

export default function Home() {
  // The AuthGuard and middleware now handle redirection for logged-in users,
  // so this page can simply always render the landing page.
  return <LandingPage />;
}
