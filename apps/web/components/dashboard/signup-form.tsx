// components/dashboard/signup-form.tsx
"use client";

import { useState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Loader2, User, Building2, Mail, Phone, Lock, CheckCircle, AlertCircle } from "lucide-react";

// Import your signup action
import { signup } from "@/lib/actions";

// Updated validation schema
const signupSchema = z.object({
  user_type: z.enum(["driver", "company"], {
    required_error: "Please select user type",
  }),
  company_id: z.string().optional(),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().optional(), // Email is optional
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => {
  // If user is company, company_id is required
  if (data.user_type === "company" && !data.company_id) {
    return false;
  }
  return true;
}, {
  message: "Please select a company",
  path: ["company_id"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

// Submit button component with loading state
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creating account...
        </>
      ) : (
        "Create account"
      )}
    </Button>
  );
}

interface SignupFormProps {
  companies?: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
}

export function SignupForm({ companies = [] }: SignupFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [userType, setUserType] = useState<"driver" | "company">("driver");

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    trigger,
    setError: setFormError,
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      user_type: "driver",
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      password: "",
    },
    mode: "onChange", // Validate on change for better UX
  });

  const watchedUserType = watch("user_type");
  const watchedCompanyId = watch("company_id");

  // Load saved user type from localStorage
  useEffect(() => {
    const savedUserType = localStorage.getItem("signup_user_type");
    if (savedUserType === "driver" || savedUserType === "company") {
      setUserType(savedUserType);
      setValue("user_type", savedUserType);
    }
  }, [setValue]);

  // Save user type to localStorage when changed
  const handleUserTypeChange = (value: "driver" | "company") => {
    setUserType(value);
    setValue("user_type", value);
    localStorage.setItem("signup_user_type", value);
    
    // Clear company_id if switching to driver
    if (value === "driver") {
      setValue("company_id", undefined);
    }
  };

  // Form submission handler
  const onSubmit = async (data: SignupFormValues) => {
    setServerError("");
    setSuccessMessage("");
    
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          formData.append(key, value.toString());
        }
      });
      
      // Call your signup action
      const result = await signup(null, formData);
      
      if (result?.error) {
        setServerError(result.error);
        // Scroll to top to show error
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (result?.success) {
        setSuccessMessage("Account created successfully! Redirecting to dashboard...");
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      }
    } catch (error) {
      console.error("Signup error:", error);
      setServerError("An unexpected error occurred. Please try again.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Helper to get error message
  const getErrorMessage = (field: keyof SignupFormValues) => {
    const error = errors[field];
    if (!error) return null;
    return typeof error.message === "string" ? error.message : "Invalid input";
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Create an account
        </CardTitle>
        <CardDescription className="text-center">
          Join our platform and start your journey
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Success Message */}
        {successMessage && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Error Message */}
        {serverError && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-600">
              {serverError}
            </AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* User Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="user_type" className="text-sm font-medium">
              I am a... <span className="text-red-500">*</span>
            </Label>
            <Select
              onValueChange={handleUserTypeChange}
              value={watchedUserType || userType}
            >
              <SelectTrigger className={errors.user_type ? "border-red-500 w-full" : "w-full"}>
                <SelectValue placeholder="Select user type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="driver">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Driver</span>
                  </div>
                </SelectItem>
                <SelectItem value="company">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>Company</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" {...register("user_type")} value={watchedUserType || userType} />
            {errors.user_type && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.user_type.message}
              </p>
            )}
          </div>

          {/* Company Selection (conditional) */}
          {(watchedUserType === "company" || userType === "company") && (
            <div className="space-y-2">
              <Label htmlFor="company_id" className="text-sm font-medium">
                Company <span className="text-red-500">*</span>
              </Label>
              <Select 
                onValueChange={(value) => {
                  setValue("company_id", value);
                  trigger("company_id");
                }}
              >
                <SelectTrigger className={errors.company_id ? "border-red-500 w-full" : "w-full"}>
                  <SelectValue placeholder="Select your company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.length === 0 ? (
                    <SelectItem value="no-companies" disabled>
                      No companies available
                    </SelectItem>
                  ) : (
                    companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the company you work with
              </p>
              {errors.company_id && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.company_id.message}
                </p>
              )}
            </div>
          )}

          {/* Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name" className="text-sm font-medium">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="first_name"
                placeholder="John" 
                className={errors.first_name ? "border-red-500" : ""}
                {...register("first_name")}
              />
              {getErrorMessage("first_name") && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {getErrorMessage("first_name")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name" className="text-sm font-medium">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="last_name"
                placeholder="Doe" 
                className={errors.last_name ? "border-red-500" : ""}
                {...register("last_name")}
              />
              {getErrorMessage("last_name") && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {getErrorMessage("last_name")}
                </p>
              )}
            </div>
          </div>

          {/* Email Field (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email <span className="text-gray-400 text-xs font-normal">(Optional)</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                id="email"
                className="pl-10" 
                placeholder="you@example.com" 
                type="email"
                {...register("email")}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Optional - We'll use this for communication
            </p>
            {errors.email && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Phone Field (Required) */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                id="phone"
                className={`pl-10 ${errors.phone ? "border-red-500" : ""}`}
                placeholder="+1 234 567 8900" 
                type="tel"
                {...register("phone")}
              />
            </div>
            {getErrorMessage("phone") && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {getErrorMessage("phone")}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                id="password"
                className={`pl-10 ${errors.password ? "border-red-500" : ""}`}
                placeholder="Create a strong password" 
                type="password"
                {...register("password")}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Password must be at least 6 characters
            </p>
            {getErrorMessage("password") && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {getErrorMessage("password")}
              </p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/login">
                Already have an account? Log in
              </Link>
            </Button>
            <SubmitButton />
          </div>
        </form>
      </CardContent>
      
      <CardFooter className="flex justify-center border-t pt-6">
        <p className="text-xs text-muted-foreground text-center">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-primary">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-primary">
            Privacy Policy
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}