import { useFormContext } from "react-hook-form";
import { CompanyFormData } from "../schemas/company-schema";
import { Badge, Table } from "@medusajs/ui";

export function CompanyReview() {
  const { watch } = useFormContext<CompanyFormData>();
  const formData = watch();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h3 className="text-lg font-semibold mb-2">Review Company Details</h3>
        <p className="text-sm text-gray-500 mb-6">
          Please review all information before creating the company
        </p>
      </div>

      {/* Company Information */}
      <div className="border rounded-lg p-4">
        <h4 className="font-semibold mb-3">Company Information</h4>
        <div className="space-y-2">
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Company Name:</span>
            <span className="font-medium">{formData.company.name}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Handle:</span>
            <span className="font-mono text-sm">{formData.company.handle}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Municipality:</span>
            <span>{formData.company.municipality}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-600">Logo:</span>
            <span>{formData.company.logo ? "Uploaded" : "Not uploaded"}</span>
          </div>
        </div>
      </div>

      {/* Products & Pricing */}
      <div className="border rounded-lg p-4">
        <h4 className="font-semibold mb-3">Products & Custom Pricing</h4>
        {formData.products.length > 0 ? (
          <div className="space-y-4">
            {formData.products.map((product, index) => (
              <div key={index} className="border-b last:border-b-0 pb-3">
                <p className="font-medium mb-2">{product.productName}</p>
                <div className="pl-4 space-y-1">
                  {product.variants.map((variant, vIndex) => (
                    <div key={vIndex} className="flex justify-between text-sm">
                      <span>{variant.variantName}</span>
                      <Badge>
                        ${(variant.customPrice / 100).toFixed(2)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No products selected</p>
        )}
      </div>
    </div>
  );
}