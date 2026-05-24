// modules/account/components/register.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LOGIN_VIEW } from "@/modules/account/templates/login-template"
import { register } from "@/lib/data/customer"
import { Command } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff
} from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const formSchema = z.object({
  first_name: z.string().min(1, { message: "First name is required." }),
  last_name: z.string().min(1, { message: "Last name is required." }),
  email: z.string().email({ message: "Please enter a valid email address." }).optional().or(z.literal('')),
  phone: z.string().min(1, { message: "Phone number is required." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
})

type FormData = z.infer<typeof formSchema>

const Register = ({ setCurrentView }: Props) => {
  const [serverError, setServerError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      password: "",
    },
  })

  // Password strength checker
  const getPasswordStrength = (password: string) => {
    if (!password) return 0
    let strength = 0
    if (password.length >= 6) strength++
    if (password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
    if (password.length >= 8 && /[0-9]/.test(password)) strength++
    if (password.length >= 8 && /[^a-zA-Z0-9]/.test(password)) strength++
    return Math.min(strength, 4)
  }

  const password = form.watch("password")
  const passwordStrength = getPasswordStrength(password)
  const isValidPassword = password.length >= 6

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    setIsLoading(true)
    
    try {
      const formData = new FormData()
      formData.append("first_name", data.first_name)
      formData.append("last_name", data.last_name)
      if (data.email) formData.append("email", data.email)
      formData.append("phone", data.phone)
      formData.append("password", data.password)
      
      const result = await register({}, formData)
      
      if (result && result.error) {
        setServerError(result.error)
      } else if (result && result.success) {
        // Switch to login view on successful registration
        setCurrentView(LOGIN_VIEW.SIGN_IN)
      }
    } catch (error) {
      console.error("Registration error:", error)
      setServerError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-[90vh] w-full">
      <div className="flex w-full items-center justify-center bg-background p-8 lg:w-2/3">
        <div className="w-full max-w-md space-y-10 py-24 lg:py-32">
          <div className="space-y-4 text-center">
            <div className="font-medium tracking-tight">Register</div>
            <div className="mx-auto max-w-xl text-muted-foreground">
              Fill in your details below. We promise not to quiz you about your first pet&apos;s name (this time).
            </div>
          </div>
          
          <div className="space-y-4">
            <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="space-y-4">
                {/* Name Fields - Two Columns */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="first_name" className="text-sm font-medium">
                      First Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="first_name"
                        type="text"
                        placeholder="Juan"
                        className="pl-9"
                        disabled={isLoading}
                        {...form.register("first_name")}
                        aria-invalid={!!form.formState.errors.first_name}
                        data-testid="first-name-input"
                      />
                    </div>
                    {form.formState.errors.first_name && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.first_name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="last_name" className="text-sm font-medium">
                      Last Name
                    </Label>
                    <Input
                      id="last_name"
                      type="text"
                      placeholder="Dela Cruz"
                      disabled={isLoading}
                      {...form.register("last_name")}
                      aria-invalid={!!form.formState.errors.last_name}
                      data-testid="last-name-input"
                    />
                    {form.formState.errors.last_name && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.last_name.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email Field - Optional */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address <span className="text-muted-foreground text-xs">(Optional)</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-9"
                      disabled={isLoading}
                      {...form.register("email")}
                      aria-invalid={!!form.formState.errors.email}
                      data-testid="email-input"
                    />
                  </div>
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {/* Phone Field - Required */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm font-medium">
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+63 XXX XXX XXXX"
                      className="pl-9"
                      disabled={isLoading}
                      {...form.register("phone")}
                      aria-invalid={!!form.formState.errors.phone}
                      data-testid="phone-input"
                    />
                  </div>
                  {form.formState.errors.phone && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.phone.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Enter your mobile number for order updates
                  </p>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 6 characters"
                      className={cn(
                        "pl-9 pr-9",
                        !isValidPassword && password.length > 0 && "border-destructive focus-visible:ring-destructive"
                      )}
                      disabled={isLoading}
                      {...form.register("password")}
                      aria-invalid={!!form.formState.errors.password}
                      data-testid="password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  
                  {form.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.password.message}
                    </p>
                  )}

                  {/* Password Strength Indicator */}
                  {password && !form.formState.errors.password && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={cn(
                              "h-1 flex-1 rounded-full transition-all",
                              level <= passwordStrength
                                ? level === 1
                                  ? "bg-red-500"
                                  : level === 2
                                  ? "bg-orange-500"
                                  : level === 3
                                  ? "bg-yellow-500"
                                  : "bg-emerald-500"
                                : "bg-gray-200"
                            )}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {passwordStrength === 1 && "Weak password"}
                        {passwordStrength === 2 && "Fair password"}
                        {passwordStrength === 3 && "Good password"}
                        {passwordStrength === 4 && "Strong password!"}
                      </p>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Minimum 6 characters. Stronger passwords use a mix of letters, numbers, and symbols.
                  </p>
                </div>

                {/* Server Error Message */}
                {serverError && (
                  <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" data-testid="register-error">
                    {serverError}
                  </div>
                )}

                {/* Terms and Conditions */}
                <div className="text-center text-xs text-muted-foreground">
                  By creating an account, you agree to our{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline transition-colors"
                  >
                    Privacy Policy
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline transition-colors"
                  >
                    Terms of Use
                  </button>.
                </div>
              </div>

              <Button 
                className="w-full" 
                type="submit" 
                disabled={isLoading}
                data-testid="register-button"
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
            </form>

            <p className="text-center text-muted-foreground text-xs">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
                className="text-primary hover:underline transition-colors"
                data-testid="login-link"
              >
                Login
              </button>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden bg-primary lg:block lg:w-1/3">
        <div className="flex h-full flex-col items-center justify-center p-12 text-center">
          <div className="space-y-6">
            <Command className="mx-auto size-12 text-primary-foreground" />
            <div className="space-y-2">
              <h1 className="font-light text-5xl text-primary-foreground">Welcome!</h1>
              <p className="text-primary-foreground/80 text-xl">You&apos;re in the right place.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register