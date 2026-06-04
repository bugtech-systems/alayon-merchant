"use server"

import "server-only"

import { cookies as nextCookies } from "next/headers"

export const getAuthHeaders = async (): Promise<
  { authorization: string } | {}
> => {
  try {
    const cookies = await nextCookies()
    const token = cookies.get("_medusa_jwt")?.value

    if (token) {
      return { authorization: `Bearer ${token}` }
    }

    return {}
  } catch (error) {
    return {}
  }
}

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


export const getCacheHeaders = async (
  tag: string
): Promise<{ next: { tags: string[] } } | {}> => {
  const cacheTag = await getCacheTag(tag);

  if (cacheTag) {
    return { next: { tags: [`${cacheTag}`] } };
  }

  return {};
};


export const setAuthToken = async (token: string) => {
  const cookies = await nextCookies()

  cookies.set("_medusa_jwt", token, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeAuthToken = async () => {
  const cookies = await nextCookies()

  cookies.delete("_medusa_jwt")
}

export const getCartId = async () => {
  const cookies = await nextCookies()

  return cookies.get("_medusa_cart_id")?.value
}

export const getCachedId = async () => {
  const cookies = await nextCookies()

  return cookies.get("_medusa_cache_id")?.value
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

export const getCompanyId = async () => {
  const cookies = await nextCookies()

   return cookies.get("_medusa_company_id")?.value

}

export const setCompanyId = async (companyId: string) => {
  const cookies = await nextCookies()

  cookies.set("_medusa_company_id", companyId, {
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
}


export const removeSession = async () => {
  const cookies = await nextCookies()

  cookies.set("customer_group_id", "", {
    maxAge: -1,
  })
    cookies.set("user_region", "", {
    maxAge: -1,
  })
    cookies.set("medusa_region_id", "", {
    maxAge: -1,
  })

}


export const setCustomerGroupId = async (groupId: string) => {
  const cookies = await nextCookies()

  cookies.set("customer_group_id", groupId, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const getCustomerGroupId = async () => {
  const cookies = await nextCookies()

  return cookies.get("customer_group_id")?.value
}