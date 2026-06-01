import { useFormContext } from "react-hook-form";
import { Input } from "@medusajs/ui";
import { CompanyFormData } from "@/types/company/schema";
import { ImageUpload } from "@/modules/company/components/image-upload";
import { MunicipalitySelect } from "@/modules/company/components/municipality-select";

export function CompanyBasicInfo() {
  const { register, setValue, watch, formState: { errors } } = useFormContext<CompanyFormData>();
  const companyName = watch("company.name");

  // Auto-generate handle from company name
  const generateHandle = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue("company.name", name);
    setValue("company.handle", generateHandle(name));
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h3 className="text-lg font-semibold mb-4">Company Information</h3>
        <p className="text-sm text-gray-500 mb-6">
          Provide the basic details about the company
        </p>
      </div>

      <div className="space-y-4">
        {/* Company Name */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Company Name *
          </label>
          <Input
            {...register("company.name")}
            onChange={handleNameChange}
            placeholder="Enter company name"
            className="w-full"
          />
          {errors.company?.name && (
            <p className="text-sm text-red-500 mt-1">{errors.company.name.message}</p>
          )}
        </div>

        {/* Handle (URL Path) */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Handle (URL Path) *
          </label>
          <Input
            {...register("company.handle")}
            placeholder="company-handle"
            className="w-full font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Used in the URL: /companies/{companyName ? generateHandle(companyName) : "company-handle"}
          </p>
          {errors.company?.handle && (
            <p className="text-sm text-red-500 mt-1">{errors.company.handle.message}</p>
          )}
        </div>

        {/* Municipality */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Municipality *
          </label>
          <MunicipalitySelect
            value={watch("company.municipality")}
            onChange={(value) => setValue("company.municipality", value)}
          />
          {errors.company?.municipality && (
            <p className="text-sm text-red-500 mt-1">{errors.company.municipality.message}</p>
          )}
        </div>

        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Company Logo *
          </label>
          <ImageUpload
            value={watch("company.logo")}
            onChange={(file) => setValue("company.logo", file)}
            accept="image/*"
            maxSize={5 * 1024 * 1024} // 5MB
          />
          {errors.company?.logo && (
            <p className="text-sm text-red-500 mt-1">{errors.company.logo.message}</p>
          )}
        </div>

        {/* Banner Upload */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Company Banner
          </label>
          <ImageUpload
            value={watch("company.banner")}
            onChange={(file) => setValue("company.banner", file)}
            accept="image/*"
            maxSize={10 * 1024 * 1024} // 10MB
          />
          <p className="text-xs text-gray-500 mt-1">
            Recommended size: 1200x400px
          </p>
        </div>
      </div>
    </div>
  );
}