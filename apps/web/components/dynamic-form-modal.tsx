// components/dynamic-form-modal.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, X } from "lucide-react";
import { n8nWebhook } from "@/hooks/useN8nQuery";
import { cn } from "@/lib/utils";

// Types for dynamic form configuration
export interface FormFieldConfig {
  name: string;
  label: string;
  type: "text" | "email" | "password" | "textarea" | "select" | "number" | "tel";
  placeholder?: string;
  required?: boolean;
  validation?: {
    // String validations
    min?: number;      // For strings: min length, For numbers: min value
    max?: number;      // For strings: max length, For numbers: max value
    pattern?: string;
    customMessage?: string;
    
    // Number-specific validations
    minValue?: number;
    maxValue?: number;
    integer?: boolean;
    positive?: boolean;
    negative?: boolean;
  };
  options?: Array<{ value: string; label: string }>;
  defaultValue?: any;
  colSpan?: "full" | "half";
}

export interface WebhookConfig {
  createEndpoint: string;
  updateEndpoint: string;
  method?: "POST" | "PUT" | "PATCH";
  params?: Record<string, any>;
  additionalHeaders?: Record<string, string>;
  transformData?: (data: Record<string, any>) => Record<string, any>;
}

export interface FormConfig {
  title: string;
  description?: string;
  fields: FormFieldConfig[];
  submitLabel: {
    create: string;
    update: string;
  };
  webhook: WebhookConfig;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

interface DynamicFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: FormConfig;
  mode: "create" | "update";
  initialData?: Record<string, any>;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

interface ValidationError {
  field: string;
  message: string;
}

// Validation function
const validateField = (value: any, field: FormFieldConfig): string | null => {
  // Required validation
  const isEmpty = !value || value.toString().trim() === "";
  
  if (field.required && isEmpty) {
    return `${field.label} is required`;
  }

  // Skip further validation if field is empty and not required
  if (isEmpty) {
    return null;
  }

  const stringValue = value.toString();
  const numValue = field.type === "number" ? Number(value) : null;

  // Number field validations
  if (field.type === "number") {
    // Check if it's a valid number
    if (isNaN(numValue)) {
      return `${field.label} must be a valid number`;
    }

    // Check if integer is required
    if (field.validation?.integer && !Number.isInteger(numValue)) {
      return field.validation.customMessage || `${field.label} must be an integer`;
    }

    // Check if positive number is required
    if (field.validation?.positive && numValue <= 0) {
      return field.validation.customMessage || `${field.label} must be a positive number`;
    }

    // Check if negative number is required
    if (field.validation?.negative && numValue >= 0) {
      return field.validation.customMessage || `${field.label} must be a negative number`;
    }

    // Min value validation
    const minValue = field.validation?.minValue ?? field.validation?.min;
    if (minValue !== undefined && numValue < minValue) {
      return field.validation.customMessage ||
        `${field.label} must be at least ${minValue}`;
    }

    // Max value validation
    const maxValue = field.validation?.maxValue ?? field.validation?.max;
    if (maxValue !== undefined && numValue > maxValue) {
      return field.validation.customMessage ||
        `${field.label} must not exceed ${maxValue}`;
    }
  } else {
    // String field validations
    
    // Min length validation for strings
    if (field.validation?.min && stringValue.length < field.validation.min) {
      return field.validation.customMessage ||
        `${field.label} must be at least ${field.validation.min} characters`;
    }

    // Max length validation for strings
    if (field.validation?.max && stringValue.length > field.validation.max) {
      return field.validation.customMessage ||
        `${field.label} must not exceed ${field.validation.max} characters`;
    }
  }

  // Email validation
  if (field.type === "email") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(stringValue)) {
      return `Please enter a valid email address`;
    }
  }

  // Pattern validation
  if (field.validation?.pattern) {
    try {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(stringValue)) {
        return field.validation.customMessage || `Invalid ${field.label} format`;
      }
    } catch (e) {
      console.error("Invalid regex pattern:", field.validation.pattern);
    }
  }

  return null;
};

// Size mappings for dialog
const sizeClasses = {
  sm: "sm:max-w-[425px]",
  md: "sm:max-w-[600px]",
  lg: "sm:max-w-[800px]",
  xl: "sm:max-w-[1000px]",
  full: "sm:max-w-[95vw] sm:h-[95vh]",
};

export function DynamicFormModal({
  isOpen,
  onClose,
  config,
  mode,
  initialData,
  onSuccess,
  onError,
}: DynamicFormModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Initialize form data
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData);
      } else {
        const defaultValues: Record<string, any> = {};
        config.fields.forEach((field) => {
          if (field.defaultValue !== undefined) {
            defaultValues[field.name] = field.defaultValue;
          } else {
            defaultValues[field.name] = "";
          }
        });
        setFormData(defaultValues);
      }
      setErrors([]);
      setTouched(new Set());
      setSubmitError(null);
      
      // Focus first input after modal opens
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialData, config.fields]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isSubmitting]);

  // Validate a single field
  const validateSingleField = useCallback((fieldName: string, value: any) => {
    const field = config.fields.find(f => f.name === fieldName);
    if (!field) return null;

    const error = validateField(value, field);
    
    setErrors(prev => {
      const filtered = prev.filter(e => e.field !== fieldName);
      if (error) {
        return [...filtered, { field: fieldName, message: error }];
      }
      return filtered;
    });
    
    return error;
  }, [config.fields]);

  // Validate all fields
  const validateAllFields = useCallback(() => {
    const newErrors: ValidationError[] = [];
    
    config.fields.forEach(field => {
      const value = formData[field.name];
      const error = validateField(value, field);
      if (error) {
        newErrors.push({ field: field.name, message: error });
      }
    });
    
    setErrors(newErrors);
    
    // Scroll to first error
    if (newErrors.length > 0) {
      setTimeout(() => {
        const firstErrorField = document.querySelector(`[name="${newErrors[0].field}"]`);
        firstErrorField?.scrollIntoView({ behavior: "smooth", block: "center" });
        (firstErrorField as HTMLElement)?.focus();
      }, 100);
    }
    
    return newErrors.length === 0;
  }, [config.fields, formData]);

  // Handle field change
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    if (touched.has(fieldName)) {
      validateSingleField(fieldName, value);
    }
  };

  // Handle field blur
  const handleFieldBlur = (fieldName: string) => {
    if (!touched.has(fieldName)) {
      setTouched(prev => new Set(prev).add(fieldName));
      validateSingleField(fieldName, formData[fieldName]);
    }
  };

  // Get error message for a field
  const getFieldError = (fieldName: string): string | undefined => {
    return errors.find(e => e.field === fieldName)?.message;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    
    // Mark all fields as touched
    const allFields = new Set(config.fields.map(f => f.name));
    setTouched(allFields);
    
    // Validate all fields
    const isValid = validateAllFields();
    
    if (!isValid) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const endpoint = mode === "create" 
        ? config.webhook.createEndpoint 
        : config.webhook.updateEndpoint;
      
      const method = config.webhook.method || "POST";
      
      let dataToSubmit = formData;
      if (config.webhook.transformData) {
        dataToSubmit = config.webhook.transformData(formData);
      }
      
      const webhookOptions = {
        endpoint,
        method,
        params: config.webhook.params || {},
        body: dataToSubmit,
        headers: config.webhook.additionalHeaders || {},
      } as any;
      
      const result = await n8nWebhook(webhookOptions);
      
      onSuccess?.(result);
      onClose();
      
      // Reset form
      setFormData({});
      setErrors([]);
      setTouched(new Set());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      setSubmitError(errorMessage);
      onError?.(error as Error);
      
      // Scroll to error message
      setTimeout(() => {
        const errorElement = document.querySelector('[role="alert"]');
        errorElement?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Enter key for submission
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      // Cmd+Enter or Ctrl+Enter to submit
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  const renderField = (field: FormFieldConfig) => {
    const value = formData[field.name] || "";
    const error = getFieldError(field.name);
    const isTouched = touched.has(field.name);
    
    const baseInputClasses = cn(
      "w-full transition-all duration-200",
      error && isTouched 
        ? "border-red-500 focus-visible:ring-red-500" 
        : "border-gray-200 focus-visible:ring-blue-500",
      "rounded-md"
    );

    const fieldWrapperClasses = cn(
      "space-y-2",
      field.colSpan === "half" ? "col-span-1" : "col-span-2"
    );

    switch (field.type) {
      case "textarea":
        return (
          <div key={field.name} className={fieldWrapperClasses}>
            <Label htmlFor={field.name} className="text-sm font-semibold">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              ref={field === config.fields[0] ? firstInputRef as any : undefined}
              id={field.name}
              name={field.name}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => handleFieldBlur(field.name)}
              onKeyDown={handleKeyDown}
              className={cn(baseInputClasses, "resize-none")}
              rows={4}
              disabled={isSubmitting}
            />
            {error && isTouched && (
              <p className="text-sm text-red-500 animate-in slide-in-from-top-1">{error}</p>
            )}
          </div>
        );

      case "select":
        return (
          <div key={field.name} className={fieldWrapperClasses}>
            <Label htmlFor={field.name} className="text-sm font-semibold">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(val) => handleFieldChange(field.name, val)}
              onOpenChange={() => handleFieldBlur(field.name)}
              disabled={isSubmitting}
            >
              <SelectTrigger className={error && isTouched ? "border-red-500 w-full" : "w-full"}>
                <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && isTouched && (
              <p className="text-sm text-red-500 animate-in slide-in-from-top-1">{error}</p>
            )}
          </div>
        );

      default:
        return (
          <div key={field.name} className={fieldWrapperClasses}>
            <Label htmlFor={field.name} className="text-sm font-semibold">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              ref={field === config.fields[0] ? firstInputRef : undefined}
              id={field.name}
              name={field.name}
              type={field.type}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => handleFieldBlur(field.name)}
              onKeyDown={handleKeyDown}
              className={baseInputClasses}
              disabled={isSubmitting}
            />
            {error && isTouched && (
              <p className="text-sm text-red-500 animate-in slide-in-from-top-1">{error}</p>
            )}
          </div>
        );
    }
  };

  const modalSize = sizeClasses[config.size || "lg"];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          "flex flex-col p-0 gap-0 overflow-hidden",
          modalSize,
          "max-h-[90vh]"
        )}
        onPointerDownOutside={(e) => {
          if (!isSubmitting) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (!isSubmitting) onClose();
        }}
      >
        {/* Header - Sticky */}
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b bg-background z-10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">{config.title}</DialogTitle>
              {config.description && (
                <DialogDescription className="mt-1">{config.description}</DialogDescription>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto min-h-0"
        >
          <form 
            ref={formRef}
            onSubmit={handleSubmit} 
            className="h-full"
          >
            <div className="p-6 space-y-6">
              {submitError && (
                <Alert variant="destructive" className="animate-in slide-in-from-top-2" role="alert">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}
              
              <div className="grid grid-cols-2 gap-4 gap-y-6">
                {config.fields.map((field) => renderField(field))}
              </div>
            </div>
          </form>
        </div>

        {/* Footer - Sticky at bottom */}
        <div className="flex-shrink-0 px-6 py-4 border-t bg-background/95 backdrop-blur-sm sticky bottom-0 z-10">
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              onClick={() => formRef.current?.requestSubmit()}
              disabled={isSubmitting}
              className="min-w-[100px]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                  <span>Submitting...</span>
                </div>
              ) : (
                mode === "create" ? config.submitLabel.create : config.submitLabel.update
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}