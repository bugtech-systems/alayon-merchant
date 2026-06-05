"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/apiClient"
import { n8nFetcher } from "@/hooks/useN8nQuery"
import { getAuthHeaders, removeAuthToken, setAuthToken } from "@/lib/medusa/data/cookies"
import { loginUser, retrieveUser } from "@/lib/data"
import { removeCartId, removeSession } from "@/lib/data/cookies"

type User = {
  id: string
  email: string
  actor_type?: string
}

type AuthContextType = {
  user: User | null
  session?: any
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  session_id?: any
  company?: any
}


const AuthContext = createContext<AuthContextType | null>(null)

export function MedusaAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const router = useRouter()

  // ----------------------------
  // SESSION CHECK
  // ----------------------------
  const fetchAuthSession = async () => {
    try {
      
  //  let res = await apiFetch(
  //     `/webhook/auth/session`, { 
  //     method: "POST",
  //     // body: { email, password, actorType },
  //   })

    // console.log(res, 'rewee')

      const res = await retrieveUser();
      //   const userData = await resUser.json() as any;
        if(res.user || res.customer || res.company || res.driver){
        setUser({...(res.user || res.customer || res.company || res.driver), actor_type: res.actor_type})
        return {...(res.user || res.customer || res.company || res.driver), actor_type: res.actor_type}
        }

        // fetchSession(res?.user?.id)
      return null
    } catch {
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }

  
  

  useEffect(() => {
    fetchAuthSession()
  }, [])

  // ----------------------------
  // LOGIN
  // ----------------------------
  const login = async (email: string, password: string, actorType: string) => {
   let res = await loginUser

    console.log(res, 'rewee')
    if(res.token){
       
    // Re-fetch session (sets user state)
       router.push("/")
    } else {
      removeAuthToken()
      localStorage.removeItem('signup_company_id')
      localStorage.removeItem('signup_user_type')
    }

    // ✅ redirect after login success
  }

  // ----------------------------
  // LOGOUT
  // ----------------------------
  const logout = async () => {

    setUser(null)
    setCompany(null)
    localStorage.removeItem('session_id')
    localStorage.removeItem('token')
    removeAuthToken();
    removeSession()
    removeCartId()
    router.push("/login")
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, company }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useMedusaAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useMedusaAuth must be used inside provider")
  return ctx
}