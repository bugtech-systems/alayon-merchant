import { z } from "zod";

export const companySchema = z.object({
  company: z.object({
    name: z.string().min(1, "Company name is required"),
    handle: z.string()
      .min(1, "Handle is required")
      .regex(/^[a-z0-9-]+$/, "Handle can only contain lowercase letters, numbers, and hyphens"),
    logo: z.any().nullable(),
    banner: z.any().nullable(),
    municipality: z.string().min(1, "Municipality is required"),
  }),
  products: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    variants: z.array(z.object({
      variantId: z.string(),
      variantName: z.string(),
      originalPrice: z.number(),
      customPrice: z.number().min(0, "Price must be greater than or equal to 0"),
    })),
  })),
});

export type CompanyFormData = z.infer<typeof companySchema>;