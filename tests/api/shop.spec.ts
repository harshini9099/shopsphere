import { test, expect } from "../fixtures/shop.fixture";
import { apiURL, bearer, setCartItem } from "../utils/api-client";
import { customer, shipping } from "../data/customer";
test("catalog returns seeded products, filters and validates sort", async ({
  request,
}) => {
  const response = await request.get(
    `${apiURL}/api/products?category=Home&sort=price-asc`,
  );
  expect(response.status()).toBe(200);
  const items = await response.json();
  expect(items.map((p: { name: string }) => p.name)).toEqual([
    "Ceramic Coffee Mug",
    "Desk Lamp",
  ]);
  expect((await request.get(`${apiURL}/api/products/99999`)).status()).toBe(
    404,
  );
  expect(
    (await request.get(`${apiURL}/api/products?sort=invalid`)).status(),
  ).toBe(400);
});
test("authentication, duplicate email, validation and token revocation", async ({
  request,
  account,
}) => {
  expect((await request.get(`${apiURL}/api/cart`)).status()).toBe(401);
  expect(
    (
      await request.post(`${apiURL}/api/auth/register`, {
        data: {
          name: account.name,
          email: account.email,
          password: account.password,
        },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.post(`${apiURL}/api/auth/register`, {
        data: { name: "", email: "bad", password: "short" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post(`${apiURL}/api/auth/login`, {
        data: { email: account.email, password: "wrong" },
      })
    ).status(),
  ).toBe(401);
  const login = await request.post(`${apiURL}/api/auth/login`, {
    data: { email: account.email, password: account.password },
  });
  expect(login.status()).toBe(200);
  const { token } = await login.json();
  expect(
    (
      await request.post(`${apiURL}/api/auth/logout`, {
        headers: bearer(token),
      })
    ).status(),
  ).toBe(204);
  expect(
    (
      await request.get(`${apiURL}/api/cart`, { headers: bearer(token) })
    ).status(),
  ).toBe(401);
});
test("cart validation, totals, decline, ownership and empty checkout", async ({
  request,
  account,
}) => {
  const headers = bearer(account.token);
  for (const quantity of [0, -1, 100])
    expect(
      (
        await request.put(`${apiURL}/api/cart/items/1`, {
          headers,
          data: { quantity },
        })
      ).status(),
    ).toBe(400);
  const cart = await setCartItem(request, account.token, 1, 2);
  expect(cart.total).toBe(159.98);
  expect(
    (
      await request.post(`${apiURL}/api/orders`, {
        headers,
        data: { ...shipping, payment: "DECLINED" },
      })
    ).status(),
  ).toBe(402);
  expect(
    (await (await request.get(`${apiURL}/api/cart`, { headers })).json()).items,
  ).toHaveLength(1);
  expect(
    (
      await request.post(`${apiURL}/api/orders`, {
        headers,
        data: { ...shipping, address: "" },
      })
    ).status(),
  ).toBe(400);
  const placed = await request.post(`${apiURL}/api/orders`, {
    headers,
    data: shipping,
  });
  expect(placed.status()).toBe(201);
  const order = await placed.json();
  expect(order.total).toBe(159.98);
  expect(order.items[0].quantity).toBe(2);
  const other = await request.post(`${apiURL}/api/auth/register`, {
    data: customer(),
  });
  expect(other.status()).toBe(201);
  const otherToken = (await other.json()).token;
  expect(
    (
      await request.get(`${apiURL}/api/orders/${order.id}`, {
        headers: bearer(otherToken),
      })
    ).status(),
  ).toBe(404);
  expect(
    (await (await request.get(`${apiURL}/api/cart`, { headers })).json()).items,
  ).toHaveLength(0);
  expect(
    (
      await request.post(`${apiURL}/api/orders`, { headers, data: shipping })
    ).status(),
  ).toBe(400);
});
test("parallel checkout creates only one order", async ({
  request,
  account,
}) => {
  await setCartItem(request, account.token, 4, 1);
  const responses = await Promise.all(
    [1, 2].map(() =>
      request.post(`${apiURL}/api/orders`, {
        headers: bearer(account.token),
        data: shipping,
      }),
    ),
  );
  expect(responses.map((r) => r.status()).sort()).toEqual([201, 400]);
  const history = await request.get(`${apiURL}/api/orders`, {
    headers: bearer(account.token),
  });
  expect(await history.json()).toHaveLength(1);
});
