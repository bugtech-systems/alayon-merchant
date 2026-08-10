"use client"

import { useState } from "react"
import { useMedusaAuth } from "@/providers/MedusaAuthProvider"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Store, Truck, User, Building2 } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import Link from "next/link"
import { login } from "@/lib/actions"
import { LoginForm } from "@/components/dashboard/login-form"

type UserType = "customer" | "company" | "driver" | "user"

interface LoginFormData {
  email: string
  password: string
  userType: UserType
}

export default function LoginPage() {
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
           <LoginForm />
    </div>
  )
}