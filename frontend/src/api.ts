export const TOKEN_KEY = "shopsphere.token";
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ message: "Service unavailable. Please try again." }));
    throw new Error(
      [
        body.message,
        ...Object.entries(body.fields || {}).map(([k, v]) => `${k}: ${v}`),
      ].join(". "),
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export const money = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    amount,
  );
