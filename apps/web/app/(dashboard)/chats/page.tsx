import ChatApp from "./component/chat-app";
import { Metadata } from "next";
import { generateMeta } from "@/lib/generate-meta";

export async function generateMetadata(): Promise<Metadata> {
  return generateMeta({
    title: "Chat App",
    description:
      "Chat app is a ui template used for instant messaging and communication between users. Built with shadcn/ui, Tailwind CSS, Next.js and React.",
    canonical: "/chats"
  });
}

export default function Page() {
  return <ChatApp />;
}
