import { expect, type APIRequestContext } from "@playwright/test";
export const apiURL = process.env.API_URL || "http://localhost:8080";
export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
export async function setCartItem(
  request: APIRequestContext,
  token: string,
  id: number,
  quantity: number,
) {
  const response = await request.put(`${apiURL}/api/cart/items/${id}`, {
    headers: bearer(token),
    data: { quantity },
  });
  expect(response.status()).toBe(200);
  return response.json();
}
