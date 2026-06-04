import { Metadata } from "next";

export function generateMeta({
  title,
  description,
  canonical
}: {
  title: string;
  description: string;
  canonical: string;
}): Metadata {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  
  return {
    title: `${title} - Shadcn UI Dashboard`,
    description: description,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical
    },
    openGraph: {
      images: [`${baseUrl}/seo.png`]
    }
  };
}