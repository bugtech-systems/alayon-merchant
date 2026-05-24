// lib/apiClient.ts

import { getAuthHeaders } from "./data/cookies";


const BASE_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

export async function apiFetch(url: string, options: RequestInit = {}) {
  let res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    credentials: "include", // 👈 this is your "token"
    body: options?.body ? JSON.stringify(options.body) : '',
    headers: {
      "Content-Type": "application/json",
      ...(await getAuthHeaders()),  
      ...(options.headers || {}),
    },
  })

  // if(!res.ok) return;
  let user = await res.json();

  return user

}