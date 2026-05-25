import { MenuActions } from "@/components/dashboard/menu/menu-actions";
import { MenuProductActions } from "@/components/dashboard/menu/menu-product-actions";
import {
  listCategories,
  retrieveCompany,
  retrieveUser,
} from "@/lib/data";
import { RestaurantAdminDTO } from "@/lib/types";
import { ProductDTO, ProductVariantDTO } from "@medusajs/types";
import { Heading, Table, Text } from "@medusajs/ui";
import Image from "next/image";
import { Suspense } from "react";

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Loading skeleton
function MenuPageSkeleton() {
  return (
    <div className="flex flex-col gap-10 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded w-32"></div>
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex flex-col gap-4">
          <div className="h-6 bg-gray-200 rounded w-48"></div>
          <div className="space-y-2">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Main content component that fetches data
async function MenuContent() {
  const user = (await retrieveUser()) as RestaurantAdminDTO;
  const companyId = user?.company_id;

  if (!companyId) {
    return (
      <div className="flex flex-col gap-4">
        <Heading level="h1" className="text-2xl">Access Denied</Heading>
        <Text>You don't have permission to view this page.</Text>
      </div>
    )
  }

  const company = await retrieveCompany(companyId) as any;
  const categories = await listCategories();

  const categoryProductMap = new Map();

  company?.products?.forEach((product: any) => {
    if (product.categories) {
      product.categories.forEach((category: any) => {
        if (categoryProductMap.has(category.id)) {
          categoryProductMap.get(category.id).products.push(product);
        } else {
          categoryProductMap.set(category.id, {
            category_name: category.name,
            products: [product],
          });
        }
      });
    }
  });

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Heading level="h1" className="text-2xl">
            {company.name} | Menu Dashboard
          </Heading>
          <Text>View and manage your company&apos;s menu</Text>
        </div>
        <Suspense fallback={<div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>}>
          <MenuActions company={company} categories={categories} />
        </Suspense>
      </div>
      {Array.from(categoryProductMap).map(([categoryId, category]) => (
        <div key={categoryId} className="flex flex-col gap-4">
          <Heading level="h2" className="text-xl">
            {category.category_name}
          </Heading>
          <Table className="table-fixed">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Thumbnail</Table.HeaderCell>
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell>Description</Table.HeaderCell>
                <Table.HeaderCell>Price</Table.HeaderCell>
                <Table.HeaderCell>Actions</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {category.products?.map((product: ProductDTO) => {
                const variants = product.variants as (ProductVariantDTO & {
                  price_set: any;
                  price: any;
                })[] | any;
                
                // Safely get thumbnail URL
                let thumbnail = product.thumbnail
                if (process.env.NEXT_PUBLIC_DEMO_MODE === "true" && thumbnail) {
                  thumbnail = thumbnail.replace(
                    "http://localhost:3000",
                    "https://medusa-eats.vercel.app"
                  )
                }

                // Safely get price
                const price = variants?.[0]?.price?.calculated_amount || variants?.[0]?.calculated_price?.calculated_amount || 0

                return (
                  <Table.Row key={product.id}>
                    <Table.Cell>
                      {thumbnail && (
                        <Image
                          src={thumbnail}
                          className="h-12 w-12 rounded-md m-2 object-cover"
                          width={48}
                          height={48}
                          alt={`Thumbnail for ${product.title}`}
                        />
                      )}
                    </Table.Cell>
                    <Table.Cell>{product.title}</Table.Cell>
                    <Table.Cell className="truncate max-w-md">
                      {product.description}
                    </Table.Cell>
                    <Table.Cell>
                      ₱{typeof price === 'number' ? price.toLocaleString() : price}
                    </Table.Cell>
                    <Table.Cell>
                      <Suspense fallback={<div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>}>
                        <MenuProductActions product={product} company={company} />
                      </Suspense>
                    </Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table>
        </div>
      ))}
    </div>
  )
}

export default function MenuPage() {
  return (
    <Suspense fallback={<MenuPageSkeleton />}>
      <MenuContent />
    </Suspense>
  )
}