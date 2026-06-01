// app/page.tsx
import { retrieveCustomer } from "@/lib/actions";
import { retrieveUser } from "@/lib/data";
import { redirect } from "next/navigation";

export default async function HomePage() {
  // Optional: Check if user is authenticated
  const user = await retrieveCustomer();

  console.log(user, 'USSER CUSTOM')
  // Redirect to dashboard if authenticated, otherwise to login
  if (user) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}