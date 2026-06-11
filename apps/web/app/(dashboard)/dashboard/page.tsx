// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { retrieveCustomer } from "@/lib/actions";
import { DashboardClient } from "./DashboardClient";
import { retrieveUser } from "@/lib/data";

export default async function Page() {
  const user = await retrieveUser() || {} as any;
  

  console.log(user, 'USER TYPEE')
  

  if (!user?.id) {
    redirect("/login");
  }
  
  if(user.employee && !user?.employee?.is_admin){
    redirect('/pos')
  }


  const userRole = (user?.metadata?.role as string || "store");
  
  // Pass user data to client component
  return <DashboardClient user={user} userRole={userRole} />;
}