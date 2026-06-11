import { jwtVerify } from "jose";
import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import "server-only";

const jwtSecret = process.env.JWT_SECRET || "supersecret";

// ✅ FIXED: Make function async and await cookies()
export async function createSession(token: string) {
  if (!token) {
    return;
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  // Await cookies() before using it
  const cookieStore = await cookies();
  
  cookieStore.set("_medusa_jwt", token, {
    httpOnly: true,
    secure: process.env.VERCEL_ENV === "production",
    expires: expiresAt,
    sameSite: "strict",
    path: "/",
  });
}

// ✅ FIXED: Make function async and await cookies()
export async function retrieveSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("_medusa_jwt")?.value;

  if (!token) {
    return null;
  }

  return token;
}

// ✅ FIXED: Make function async and await cookies()
export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete("_medusa_jwt");
  cookieStore.delete("customer_group_id");
  cookieStore.delete("medusa_region_id");
  cookieStore.delete("_medusa_cache_id");
  cookieStore.delete("_medusa_company_id");
  
  revalidateTag("user", "max");
}

// This function is fine as is (no cookies used)
export async function decrypt(
  session: string | undefined = ""
): Promise<object | { message: string }> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(jwtSecret);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const { payload } = await jwtVerify(session, cryptoKey, {
      algorithms: ["HS256"],
    });

    return payload;
  } catch (error) {
    console.error(error);
    return { message: "Error decrypting session" };
  }
}