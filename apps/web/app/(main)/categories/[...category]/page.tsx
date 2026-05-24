import { getCategoryByHandle, listCategories } from "@/lib/data/categories"
import { listRegions } from "@/lib/data/regions"
import CategoryTemplate from "@/modules/categories/templates"
import { SortOptions } from "@/modules/store/components/refinement-list/sort-products"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const dynamicParams = true

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
  searchParams: Promise<{
    sortBy?: SortOptions
    page?: string
  }>
}

type ParamsType = {
  countryCode: string
  category: string[]
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params

  try {
    const product_category = await getCategoryByHandle(params.category)

    if (!product_category) {
      notFound()
    }

    const title = product_category.name
    const description = product_category.description ?? `${title} category.`

    return {
      title: `${title} | Medusa Store`,
      description,
      alternates: {
        canonical: `/${params.countryCode}/categories/${params.category.join("/")}`,
      },
    }
  } catch (error) {
    notFound()
  }
}

export async function generateStaticParams(): Promise<ParamsType[]> {
  try {
    // Get regions
    const regions = await listRegions()
    
    if (!regions || regions.length === 0) {
      console.warn("No regions found for generateStaticParams")
      return []
    }

    // Extract country codes from regions
    const countryCodes = regions
      .map((r) => r.countries?.map((c) => c.iso_2))
      .flat()
      .filter(Boolean) as string[]

    if (!countryCodes || countryCodes.length === 0) {
      console.warn("No country codes found for generateStaticParams")
      return []
    }

    // Get categories
    const categories = await listCategories()
    
    if (!categories || categories.length === 0) {
      console.warn("No categories found for generateStaticParams")
      return []
    }

    // Generate params array
    const params: ParamsType[] = []
    
    for (const countryCode of countryCodes) {
      for (const category of categories) {
        params.push({
          countryCode,
          category: category.handle.split("/"),
        })
      }
    }

    return params
  } catch (error) {
    console.error("Error in generateStaticParams:", error)
    return []
  }
}

export default async function CategoryPage(props: Props) {
  const searchParams = await props.searchParams
  const params = await props.params
  const { sortBy, page } = searchParams

  try {
    const categories = await listCategories()
    
    if (!categories) {
      notFound()
    }

    const currentCategory = categories.find(
      (category) => category.handle === params.category.join("/")
    )

    if (!currentCategory) {
      notFound()
    }

    return (
      <CategoryTemplate
        categories={categories}
        currentCategory={currentCategory}
        sortBy={sortBy}
        page={page}
        countryCode={params.countryCode}
      />
    )
  } catch (error) {
    console.error("Error rendering category page:", error)
    notFound()
  }
}