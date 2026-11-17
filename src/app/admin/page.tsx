import { getAdminData } from "./actions";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";
import DashboardNav from "../dashboard/Nav";

export default async function AdminPage() {
  const data = await getAdminData();
  
  if (!data) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <DashboardNav />
      
      <main className="max-w-[1540px] mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <AdminClient initialData={data} />
      </main>
    </div>
  );
}
