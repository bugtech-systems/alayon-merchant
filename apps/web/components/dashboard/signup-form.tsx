// components/dashboard/signup-form.tsx
"use client";

import { useState, useEffect, useTransition } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  User,
  Building2,
  Mail,
  Phone,
  Lock,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

// Import your signup action
import { signup } from "@/lib/actions/users";

// Simplified validation schema
const signupSchema = z.object({
  user_type: z.enum(["driver", "company"], {
    required_error: "Please select user type",
  }),
  company_id: z.string().optional(),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().optional(),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
}).refine((data) => {
  if (data.user_type === "company" && !data.company_id) {
    return false;
  }
  return true;
}, {
  message: "Please select a company",
  path: ["company_id"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

interface SignupFormProps {
  companies?: Array<{
    id: string;
    name: string;
  }>;
}

export function SignupForm({ companies = [] }: SignupFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, touchedFields },
    setValue,
    watch,
    trigger,
    setError,
    clearErrors,
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      user_type: "driver",
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      password: "",
      confirm_password: "",
      company_id: undefined,
    },
    mode: "onBlur",
  });

  const watchedUserType = watch("user_type");

  const onSubmit = async (data: SignupFormValues) => {
    setServerError("");
    setSuccessMessage("");
    clearErrors();
    
    startTransition(async () => {
      try {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            formData.append(key, value.toString());
          }
        });
        
        const result = await signup(data, formData);
        
        if (result?.error) {
          setServerError(result.error);
          
          if (result.fieldErrors) {
            Object.entries(result.fieldErrors).forEach(([field, messages]) => {
              setError(field as any, {
                type: "manual",
                message: messages[0],
              });
            });
          }
          
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (result?.success) {
          setSuccessMessage("Account created successfully! Redirecting...");
          
          setTimeout(() => {
            router.push("/dashboard");
            router.refresh();
          }, 2000);
        }
      } catch (error) {
        console.error("Form submission error:", error);
        setServerError("An unexpected error occurred. Please try again.");
      }
    });
  };

  const getErrorMessage = (field: keyof SignupFormValues): string | null => {
    const error = errors[field];
    if (!error) return null;
    return typeof error.message === "string" ? error.message : "Invalid input";
  };

  const hasError = (field: keyof SignupFormValues): boolean => {
    return !!errors[field] && touchedFields[field];
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
        {successMessage && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}
        
        {serverError && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-600">
              {serverError}
            </AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* User Type Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Account Type <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setValue("user_type", "driver");
                  setValue("company_id", undefined);
                  trigger("user_type");
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  watchedUserType === "driver"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <User className="h-4 w-4" />
                <span>Driver</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setValue("user_type", "company");
                  trigger("user_type");
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  watchedUserType === "company"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Building2 className="h-4 w-4" />
                <span>Company</span>
              </button>
            </div>
            <input type="hidden" {...register("user_type")} />
            {hasError("user_type") && (
              <p className="text-sm text-red-600">{getErrorMessage("user_type")}</p>
            )}
          </div>

          {/* Company Selection */}
          {watchedUserType === "company" && (
            <div className="space-y-2">
              <Label>Company <span className="text-red-500">*</span></Label>
              <Select 
                onValueChange={(value) => {
                  setValue("company_id", value);
                  trigger("company_id");
                }}
              >
                <SelectTrigger className={hasError("company_id") ? "border-red-500 w-full" : "w-full"}>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasError("company_id") && (
                <p className="text-sm text-red-600">{getErrorMessage("company_id")}</p>
              )}
            </div>
          )}

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name <span className="text-red-500">*</span></Label>
              <Input 
                placeholder="John" 
                className={hasError("first_name") ? "border-red-500" : ""}
                {...register("first_name")}
              />
              {hasError("first_name") && (
                <p className="text-sm text-red-600">{getErrorMessage("first_name")}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Last Name <span className="text-red-500">*</span></Label>
              <Input 
                placeholder="Doe" 
                className={hasError("last_name") ? "border-red-500" : ""}
                {...register("last_name")}
              />
              {hasError("last_name") && (
                <p className="text-sm text-red-600">{getErrorMessage("last_name")}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label>Email <span className="text-gray-400 text-xs">(Optional)</span></Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                className="pl-10"
                placeholder="you@example.com" 
                type="email"
                {...register("email")}
              />
            </div>
            {hasError("email") && (
              <p className="text-sm text-red-600">{getErrorMessage("email")}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label>Phone Number <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                className="pl-10"
                placeholder="+63 912 345 6789" 
                type="tel"
                {...register("phone")}
              />
            </div>
            {hasError("phone") && (
              <p className="text-sm text-red-600">{getErrorMessage("phone")}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label>Password <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                className={`pl-10 pr-10 ${hasError("password") ? "border-red-500" : ""}`}
                placeholder="Minimum 6 characters" 
                type={showPassword ? "text" : "password"}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {hasError("password") && (
              <p className="text-sm text-red-600">{getErrorMessage("password")}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label>Confirm Password <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                className={`pl-10 pr-10 ${hasError("confirm_password") ? "border-red-500" : ""}`}
                placeholder="Confirm your password" 
                type={showConfirmPassword ? "text" : "password"}
                {...register("confirm_password")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {hasError("confirm_password") && (
              <p className="text-sm text-red-600">{getErrorMessage("confirm_password")}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
            <Button variant="outline" asChild className="w-full sm:w-auto" type="button">
              <Link href="/login">Already have an account? Log in</Link>
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || isPending}
              className="w-full sm:w-auto"
            >
              {(isSubmitting || isPending) ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>
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