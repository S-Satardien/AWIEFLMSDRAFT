import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";
import DashboardNav from "../dashboard/Nav";
import { getUserProfile } from "./actions";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }

  const user = await getUserProfile();

  return (
    <div className="min-h-screen bg-vacfa-light">
      <DashboardNav />
      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <ProfileClient user={user} />
      </main>
    </div>
  );
}
