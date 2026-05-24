// types/product.ts
export interface Product {
  id: number;
  title: string;
  price: number;
  compareAtPrice?: number;
  image: string;
  hoverImage?: string;
  slug: string;
}