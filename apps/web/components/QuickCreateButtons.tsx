// components/product-list.tsx
import { products } from "@/data/products";
import { ProductCard } from "@/components/product-card";

export function ProductList() {
  return (
    <section className="container mx-auto px-4 py-16">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold">Products</h2>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}