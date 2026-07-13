// components/dashboard/login-form.tsx
"use client";

import { useState, useTransition } from "react";
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
  Truck,
  Mail,
  Lock,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Store,
} from "lucide-react";

// Import your login action
import { login } from "@/lib/actions";
import { removeCartId, removeSession } from "@/lib/data/cookies";

// Login validation schema
const loginSchema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
  user_type: z.enum(["customer", "company", "driver", "user", "store"], {
    required_error: "Please select login type",
  }),
  remember_me: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// User type configuration
const userTypes = [
  // { value: "customer", label: "Customer", icon: User, color: "blue", description: "Shop as a customer" },
  { value: "store", label: "Store", icon: Store, color: "green", description: "Manage your store", email: "cashier@example.com", password: "123123" },
  { value: "driver", label: "Driver", icon: Truck, color: "orange", description: "Fullfilment operations", email: "driver@example.com", password: "123123" },
  { value: "company", label: "Admin", icon: Building2, color: "purple", description: "Platform management", email: "company@example.com", password: "123123" },
];

interface LoginFormProps {
  redirectUrl?: string;
  onSuccess?: () => void;
}

export function LoginForm({onSuccess }: LoginFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, touchedFields },
    setValue,
    watch,
    trigger,
    setError,
    clearErrors,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      user_type: "company",
      remember_me: false,
    },
    mode: "onBlur",
  });

  const watchedUserType = watch("user_type");
  const selectedUserType = userTypes.find(type => type.value === watchedUserType);

  const onSubmit = async (data: LoginFormValues) => {
    setServerError("");
    setSuccessMessage("");
    clearErrors();

    console.log('LOGGING')
    let redirectUrl = watchedUserType == 'store' ? '/pos' : '/dashboard';
    startTransition(async () => {
      try {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value.toString());
          }
        });
        localStorage.removeItem('pos_cart_id');
        await removeCartId()
        removeSession();
        console.log( data, 'DATAA')
        const result = await login(data, formData);
        console.log(result, 'RESSS')
        if (!result?.success) {
          setServerError(result.error ?? result);
          
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
          setSuccessMessage("Login successful! Redirecting...");
          
          setTimeout(() => {
            if (onSuccess) {
              onSuccess();
            } else {
              router.push(redirectUrl);
              router.refresh();
            }
          }, 1000);
        }
      } catch (error) {
        console.error("Login error:", error);
        setServerError("An unexpected error occurred. Please try again.");
      }
    });
  };

  const getErrorMessage = (field: keyof LoginFormValues): string | null => {
    const error = errors[field];
    if (!error) return null;
    return typeof error.message === "string" ? error.message : "Invalid input";
  };

  const hasError = (field: keyof LoginFormValues): boolean => {
    return !!errors[field] && touchedFields[field];
  };

  const handleDemoLogin = (userType: LoginFormValues["user_type"], email: string, password: string) => {
    setValue("user_type", userType);
    setValue("email", email);
    setValue("password", password);
    trigger();
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Store className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">
          Welcome Back
        </CardTitle>
        <CardDescription>
          Sign in to your account to continue
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
              Login as <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {userTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = watchedUserType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => {
                      setValue("user_type", type.value);
                      trigger("user_type");
                    }}
                    className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 transition-all ${
                      isSelected
                        ? `border-${type.color}-500 bg-${type.color}-50`
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${
                      isSelected ? `text-${type.color}-600` : "text-gray-500"
                    }`} />
                    <span className={`text-xs font-medium ${
                      isSelected ? `text-${type.color}-700` : "text-gray-600"
                    }`}>
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <input type="hidden" {...register("user_type")} />
            {hasError("user_type") && (
              <p className="text-sm text-red-600">{getErrorMessage("user_type")}</p>
            )}
          </div>

          {/* Selected User Type Hint */}
          {selectedUserType && (
            <div className="text-center text-xs text-muted-foreground">
              {selectedUserType.description}
            </div>
          )}

          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                className={`pl-10 ${hasError("email") ? "border-red-500" : ""}`}
                placeholder="you@example.com"
                {...register("email")}
              />
            </div>
            {hasError("email") && (
              <p className="text-sm text-red-600">{getErrorMessage("email")}</p>
            )}
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">
                Password <span className="text-red-500">*</span>
              </Label>
              <button
                type="button"
                onClick={() => {
                  // Implement forgot password logic
                  console.log("Forgot password clicked");
                }}
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                className={`pl-10 pr-10 ${hasError("password") ? "border-red-500" : ""}`}
                placeholder="••••••••"
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

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 cursor-pointer"
                {...register("remember_me")}
              />
              <span>Remember me</span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col gap-3 pt-2">
            <Button 
              type="submit" 
              disabled={isSubmitting || isPending}
              className="w-full"
              size="lg"
            >
              {(isSubmitting || isPending) ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </div>
        </form>

        {/* Demo Credentials Section - Only in development */}
        {/* {process.env.NODE_ENV === "development" && ( */}
          <div className="mt-6 pt-4 border-t">
            <p className="text-xs font-medium text-center text-muted-foreground mb-3">
              Demo Credentials (Click to auto-fill)
            </p>
            <div className="space-y-2">
              {userTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleDemoLogin(
                    type.value,
                    `${type.email}`,
                    `${type.password}`
                  )}
                  className="w-full text-left p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <type.icon className={`h-3 w-3 text-${type.color}-600`} />
                      <span className="font-medium">{type.label}:</span>
                    </div>
                    <span className="text-muted-foreground">
                      {type.email} / ••••••
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        {/* )} */}
      </CardContent>
      
      <CardFooter className="flex justify-center border-t pt-6">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/signup" className="text-primary hover:text-primary/80 font-medium transition-colors">
            Create an account
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}