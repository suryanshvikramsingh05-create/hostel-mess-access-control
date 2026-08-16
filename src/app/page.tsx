import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import LandingPage from "@/components/marketing/LandingPage";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect(`/${user.role}`);
  return <LandingPage />;
}
