// app/page.tsx
import { retrieveUser } from "@/lib/data";
import { redirect } from "next/navigation";

export default async function HomePage() {
  // Optional: Check if user is authenticated
  const user = await retrieveUser();

  // Redirect to dashboard if authenticated, otherwise to login
  if (user) {
    redirect("/home");
  } else {
    redirect("/login"); 
  }
}