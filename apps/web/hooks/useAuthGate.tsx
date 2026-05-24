"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/apiClient"

export function useAuthGate() {
  const router = useRouter()
  useEffect(() => {
    const check = async () => {
        const res = await apiFetch("/auth/session", { method: "POST"})
      console.log(res, "RESSS")
      if (!res.ok) {
        router.replace("/login")
      } else {
         router.replace("/dashboard")
      }
    }

    check()
  }, [])
}