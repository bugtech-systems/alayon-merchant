// modules/account/components/login.tsx
"use client"

import { login } from "@/lib/data/customer"
import { LOGIN_VIEW } from "@/modules/account/templates/login-template"
import { useState } from "react"
import { redirect, useRouter } from "next/navigation"
import { Command } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
  remember: z.boolean().optional(),
})

type FormData = z.infer<typeof formSchema>

const Login = ({ setCurrentView }: Props) => {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  })

  const onSubmit = async (data: FormData) => {
    // Clear previous errors
    setServerError(null)
    setIsLoading(true)
    
    try {
      const formData = new FormData()
      formData.append("email", data.email)
      formData.append("password", data.password)
      if (data.remember) {
        formData.append("remember_me", "true")
      }
      
      const result = await login(data)
        console.log(result, 'LOGIN RESUl')
      // Check if login was successful
      if (result && String(result).toLowerCase().includes('error')) {
        setServerError(result)
      } else if (result && result.success) {
        // Redirect to home page or dashboard on successful login
        router.push("/")
        router.refresh() // Refresh server components
      }
    } catch (error) {
      console.error("Login error:", error)
      setServerError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-dvh w-full">
      <div className="hidden bg-primary lg:block lg:w-1/3">
        <div className="flex h-full flex-col items-center justify-center p-12 text-center">
          <div className="space-y-6">
            <Command className="mx-auto size-12 text-primary-foreground" />
            <div className="space-y-2">
              <h1 className="font-light text-5xl text-primary-foreground">Alayon</h1>
              <p className="text-primary-foreground/80 text-xl">Login to continue</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-background p-8 lg:w-2/3">
        <div className="w-full max-w-md space-y-10 py-24 lg:py-32">
          <div className="space-y-4 text-center">
            <div className="font-medium tracking-tight">Login</div>
            <div className="mx-auto max-w-xl text-muted-foreground">
              Welcome back. Enter your email and password, let&apos;s hope you remember them this time.
            </div>
          </div>
          
          <div className="space-y-4">
            <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="space-y-4">
                {/* Email Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={isLoading}
                    {...form.register("email")}
                    aria-invalid={!!form.formState.errors.email}
                    data-testid="email-input"
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password" className="text-sm font-medium">
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => redirect('/admin/login')}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                      data-testid="forgot-password-button"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={isLoading}
                    {...form.register("password")}
                    aria-invalid={!!form.formState.errors.password}
                    data-testid="password-input"
                  />
                  {form.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="login-remember"
                    checked={form.watch("remember")}
                    onCheckedChange={(checked) => form.setValue("remember", Boolean(checked))}
                    disabled={isLoading}
                    data-testid="remember-me-checkbox"
                  />
                  <Label
                    htmlFor="login-remember"
                    className="text-sm font-normal cursor-pointer text-muted-foreground"
                  >
                    Remember me for 30 days
                  </Label>
                </div>

                {/* Server Error Message */}
                {serverError && (
                  <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" data-testid="login-error-message">
                    {serverError}
                  </div>
                )}
              </div>

              <Button 
                className="w-full" 
                type="submit" 
                disabled={isLoading}
                data-testid="sign-in-button"
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>

            <p className="text-center text-muted-foreground text-xs">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
                className="text-primary hover:underline transition-colors"
                data-testid="register-button"
              >
                Register
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login