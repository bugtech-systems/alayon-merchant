"use server"

import "server-only"

import { cookies as nextCookies } from "next/headers"
import { revalidatePath, revalidateTag } from "next/cache"

export const getAuthHeaders = async (): Promise<
  { authorization: string } | {}
> => {
  try {
    const cookies = await nextCookies()
    const token = cookies.get("_medusa_jwt")?.value

    if (token) {
      return { authorization: `Bearer ${token}`, 'x-publishable-api-key': `${process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY}` }
    }

    return {}
  } catch (error) {
    return {}
  }
}

export const getCacheHeaders = async (
  tag: string
): Promise<{ next: { tags: string[] } } | {}> => {
  const cacheTag = await getCacheTag(tag);

  if (cacheTag) {
    return { next: { tags: [`${cacheTag}`] } };
  }

  return {};
};


export const getCacheTag = async (tag: string): Promise<string> => {
  try {
    const cookies = await nextCookies()
    const cacheId = cookies.get("_medusa_cache_id")?.value

    if (!cacheId) {
      return ""
    }

    return `${tag}-${cacheId}`
  } catch (error) {
    return ""
  }
}

export const getCacheOptions = async (
  tag: string
): Promise<{ tags: string[] } | {}> => {
  if (typeof window !== "undefined") {
    return {}
  }

  const cacheTag = await getCacheTag(tag)

  if (!cacheTag) {
    return {}
  }

  return { tags: [`${cacheTag}`] }
}

export const setAuthToken = async (token: string) => {
  const cookies = await nextCookies()

  cookies.set("_medusa_jwt", token, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}
export async function removeAuthToken() {
  try {
    const cookieStore = await nextCookies();
    cookieStore.delete("_medusa_jwt");
    cookieStore.delete("_medusa_cache_id");
    cookieStore.delete("_medusa_company_id");

        // Revalidate to clear cached data

    // Revalidate user cache
    revalidateTag("user", "max");
    revalidatePath("/dashboard");
    
    console.log("Auth token removed successfully");
    return { success: true };
  } catch (error) {
    console.error("Error removing auth token:", error);
    return { success: false };
  }
}

// export const removeAuthToken = async () => {
//   const cookies = await nextCookies()
//   cookies.delete("_medusa_jwt")
// }

export const getCartId = async () => {
  const cookies = await nextCookies()

  return cookies.get("_medusa_cart_id")?.value
}

export const setCartId = async (cartId: string) => {
  const cookies = await nextCookies()

  cookies.set("_medusa_cart_id", cartId, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeCartId = async () => {
  const cookies = await nextCookies()

  cookies.set("_medusa_cart_id", "", {
    maxAge: -1,
  })
  cookies.set("_medusa_company_id", "", {
    maxAge: -1,
  })
    cookies.set("_medusa_cached_id", "", {
    maxAge: -1,
  })
}
