import { HttpTypes } from "@medusajs/types"
import ProductActions from "@/modules/products/components/product-actions"
import { getProductsById } from "@/lib/medusa/data/products"

/**
 * Fetches real time pricing for a product and renders the product actions component.
 */
export default async function ProductActionsWrapper({
  id,
  region,
  company
}: {
  id: string
  region: HttpTypes.StoreRegion
  company?: any
}) {
  const [product] = await getProductsById({
    ids: [id],
    regionId: region.id,
    company: company
  })

  if (!product) {
    return null
  }

  return <ProductActions product={product} region={region} company={company} />
}
