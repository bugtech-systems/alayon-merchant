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
  const { isLoading: authLoading } = useMedusaAuth() as any
  
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
    userType: "company"
  })
  const [errors, setErrors] = useState<Partial<LoginFormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const userTypes = [
    // { value: "customer", label: "Customer", icon: User, color: "blue" },
    { value: "employee", label: "Store", icon: Store, color: "green" },
    { value: "driver", label: "Driver", icon: Truck, color: "orange" },
    { value: "company", label: "Admin", icon: Building2, color: "purple" },
  ]

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginFormData> | any = {}
    
    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    }
    
    // User type validation
    if (!formData.userType) {
      newErrors.userType = "Please select a login type"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
    // Clear general error when user makes changes
    if (generalError) {
      setGeneralError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsSubmitting(true)
    setGeneralError(null)
    
    try {
      // Pass user type to login function
      await login({}, formData)
    } catch (error: any) {
      console.error("Login error:", error)
      setGeneralError(
        error?.message || "Login failed. Please check your credentials and try again."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoading = authLoading || isSubmitting
  const selectedUserType = userTypes.find(type => type.value === formData.userType)
  const SelectedIcon = selectedUserType?.icon || User

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
           <LoginForm />
    </div>
  )
}