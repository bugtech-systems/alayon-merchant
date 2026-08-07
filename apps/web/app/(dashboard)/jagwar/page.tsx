// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { retrieveUser } from "@/lib/data";
import WaterProductionDashboard from "./WaterProductionDashboard";

export default async function Page() {
  const user = await retrieveUser() || {} as any;
  

  

  if (!user?.id) {
    redirect("/login");
  }
  
  if(user.employee && !user?.employee?.is_admin){
    redirect('/pos')
  }


  const userRole = (user?.metadata?.role as string || "store");
  








  // Pass user data to client component
  return <WaterProductionDashboard user={user} userRole={userRole} />;
}