export type User = { id: number; name: string; email: string };
export type Auth = { token: string; user: User };
export type Product = {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  icon: string;
};
export type Cart = {
  items: { product: Product; quantity: number; subtotal: number }[];
  total: number;
};
export type Order = {
  id: string;
  placedAt: string;
  total: number;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  status: string;
  items: {
    productId: number;
    name: string;
    unitPrice: number;
    quantity: number;
  }[];
};
