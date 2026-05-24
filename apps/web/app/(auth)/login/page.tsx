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

type UserType = "customer" | "company" | "driver" | "user"

interface LoginFormData {
  email: string
  password: string
  userType: UserType
}

export default function LoginPage() {
  const { login, isLoading: authLoading } = useMedusaAuth() as any
  
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
    { value: "company", label: "Merchant", icon: Store, color: "green" },
    { value: "driver", label: "Driver", icon: Truck, color: "orange" },
    { value: "user", label: "Admin", icon: Building2, color: "purple" },
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
      console.log(formData, 'ffor')
      await login(formData.email, formData.password, formData.userType)
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
      <div className="w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="mb-8 text-center">
          <Link href="/">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Store className="h-8 w-8 text-primary" />
          </div>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account to continue
          </p>
        </div>

        {/* Login Form Card */}
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* User Type Dropdown */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Login as
                </label>
                <Select
                  value={formData.userType}
                  onValueChange={(value) => handleInputChange("userType", value as UserType)}
                  disabled={isLoading}
                >
                  <SelectTrigger className={cn(
                    "w-full",
                    errors.userType && "border-red-500 ring-red-500"
                  )}>
                    <SelectValue placeholder="Select login type">
                      {selectedUserType && (
                        <div className="flex items-center gap-2">
                          <SelectedIcon className="h-4 w-4" />
                          <span>{selectedUserType.label}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {userTypes.map((type) => {
                      const Icon = type.icon
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className={cn(
                              "h-4 w-4",
                              type.color === "blue" && "text-blue-600",
                              type.color === "green" && "text-green-600",
                              type.color === "orange" && "text-orange-600",
                              type.color === "purple" && "text-purple-600"
                            )} />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {errors.userType && (
                  <p className="text-xs text-red-500">{errors.userType}</p>
                )}
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  disabled={isLoading}
                  className={cn(errors.email && "border-red-500 focus:ring-red-500")}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email}</p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  disabled={isLoading}
                  className={cn(errors.password && "border-red-500 focus:ring-red-500")}
                />
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password}</p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    disabled={isLoading}
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                  onClick={() => {
                    // Implement forgot password logic
                    console.log("Forgot password clicked")
                  }}
                >
                  Forgot password?
                </button>
              </div>

              {/* General Error Alert */}
              {generalError && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{generalError}</AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Logging in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <div className="border-t bg-gray-50 p-4 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
            <Link href="/signup">
              <button
                type="button"
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Create an account
              </button>
              </Link>
            </p>
          </div>
        </div>

        {/* Demo Credentials Hint (Optional - remove in production) */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-800">Demo Credentials:</p>
            <div className="mt-2 space-y-1 text-xs text-blue-700">
              <p>Customer: customer@example.com / password123</p>
              <p>Restaurant: restaurant@example.com / password123</p>
              <p>Driver: driver@example.com / password123</p>
              <p>Company: company@example.com / password123</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}