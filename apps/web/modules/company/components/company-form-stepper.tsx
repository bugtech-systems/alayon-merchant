import { useState } from "react";
import { Button } from "@medusajs/ui";
import { CompanyBasicInfo } from "./company-basic-info";
import { CompanyProductsPricing } from "./company-products-pricing";
import { CompanyReview } from "./company-review";
import { AdminCreateCompany } from "../../../types";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { companySchema, CompanyFormData } from "../../../types/company/schema";

interface CompanyFormStepperProps {
  handleSubmit: (data: AdminCreateCompany) => Promise<void>;
  loading: boolean;
  error?: Error | null;
  onCancel: () => void;
}

const steps = [
  { id: 1, title: "Basic Information", description: "Company details" },
  { id: 2, title: "Products & Pricing", description: "Select products and set prices" },
  { id: 3, title: "Review", description: "Confirm all details" },
];

export function CompanyFormStepper({
  handleSubmit,
  loading,
  error,
  onCancel,
}: CompanyFormStepperProps) {
  const [currentStep, setCurrentStep] = useState(1);
  
  const methods = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      company: {
        name: "",
        handle: "",
        logo: null,
        banner: null,
        municipality: "",
      },
      products: [],
    },
    mode: "onChange",
  });

  const { trigger, getValues } = methods;

  const nextStep = async () => {
    let isValid = false;
    
    if (currentStep === 1) {
      isValid = await trigger("company");
    } else if (currentStep === 2) {
      isValid = await trigger("products");
    }
    
    if (isValid && currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: CompanyFormData) => {
    // Transform data for API
    const apiData: AdminCreateCompany = {
      name: data.company.name,
      handle: data.company.handle,
      municipality: data.company.municipality,
      logo: data.company.logo,
      banner: data.company.banner,
      products: data.products.map(product => ({
        product_id: product.productId,
        variants: product.variants.map(variant => ({
          variant_id: variant.variantId,
          price: variant.customPrice,
        })),
      })),
    };
    await handleSubmit(apiData);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Stepper Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center relative">
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center font-semibold
                        ${currentStep >= step.id 
                          ? "bg-blue-600 text-white" 
                          : "bg-gray-200 text-gray-600"
                        }
                      `}
                    >
                      {step.id}
                    </div>
                    <div className="absolute top-12 whitespace-nowrap">
                      <p className="text-sm font-medium">{step.title}</p>
                      <p className="text-xs text-gray-500">{step.description}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex-1 h-[2px] bg-gray-200 mx-4" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="mt-16">
            {currentStep === 1 && <CompanyBasicInfo />}
            {currentStep === 2 && <CompanyProductsPricing />}
            {currentStep === 3 && <CompanyReview />}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error.message}</p>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="border-t px-6 py-4 flex justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            Previous
          </Button>
          
          <div className="space-x-3">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            
            {currentStep === steps.length ? (
              <Button type="submit" isLoading={loading}>
                Create Company
              </Button>
            ) : (
              <Button type="button" onClick={nextStep}>
                Continue
              </Button>
            )}
          </div>
        </div>
      </form>
    </FormProvider>
  );
}