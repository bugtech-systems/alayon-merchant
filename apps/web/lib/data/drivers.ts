import { sdk } from "../medusa/config";

import { DriverDTO } from "@/lib/types";
import { getAuthHeaders, getCacheHeaders } from "../medusa/data/cookies";

export async function retrieveDriver(driverId: string): Promise<DriverDTO> {
  const {
    driver,
  }: {
    driver: DriverDTO;
  } = await sdk.client.fetch(`/store/drivers/${driverId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...getCacheHeaders("drivers"),
    } as any,
  });

  return driver;
}
