import { sdk } from "../medusa/config";
import { getAuthHeaders, getCacheHeaders } from "./cookies";

export async function retrieveCart(cartId: string) {

  const { cart } = await sdk.store.cart.retrieve(
    cartId,
    {
      fields:
        "+metadata, +items.*, +items.thumbnail, +items.title, +items.quantity, +items.total, +items.variant",
    },
    {
      ...(await getAuthHeaders()),
      ...(await getCacheHeaders("carts")),
    }
  );

  return cart;
}
