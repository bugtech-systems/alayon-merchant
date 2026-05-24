"use client"

import { useEffect, useState } from "react"
import {

  getOrCreateSessionId,

} from "@/modules/chat/components";


export function useSession() {
  const [session, setSession] = useState("")

  useEffect(() => {
    setSession(getOrCreateSessionId())
  }, [])

  return session
}