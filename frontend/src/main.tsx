import React, { createContext, useContext, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { api, money, TOKEN_KEY } from "./api";
import type { Auth, Cart, Order, Product, User } from "./types";
import "./styles.css";

const Session = createContext<{
  user: User | null;
  setUser: (u: User | null) => void;
}>({ user: null, setUser: () => {} });
function ErrorNotice({ message }: { message: string }) {
  return message ? (
    <div className="error" role="alert">
      {message}
    </div>
  ) : null;
}
function App() {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false);
  useEffect(() => {
    api<User>("/auth/me")
      .then(setUser)
      .catch(() => sessionStorage.removeItem(TOKEN_KEY))
      .finally(() => setReady(true));
  }, []);
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      sessionStorage.removeItem(TOKEN_KEY);
      setUser(null);
      window.location.assign("/");
    }
  }
  return (
    <Session.Provider value={{ user, setUser }}>
      <header>
        <Link className="brand" to="/">
          ◈ ShopSphere
        </Link>
        <nav aria-label="Main navigation">
          <Link to="/">Shop</Link>
          <Link to="/cart">Cart</Link>
          {user ? (
            <>
              <Link to="/orders">Orders</Link>
              <span className="greeting">Hi, {user.name}</span>
              <button className="quiet" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <Link to="/login">Log in</Link>
          )}
        </nav>
      </header>
      <main>
        {ready ? (
          <Routes>
            <Route path="/" element={<Catalog />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage register />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:id" element={<OrderPage />} />
            <Route
              path="*"
              element={
                <>
                  <h1>Page not found</h1>
                  <Link to="/">Back to shop</Link>
                </>
              }
            />
          </Routes>
        ) : (
          <p role="status">Loading your shop…</p>
        )}
      </main>
      <footer>
        ShopSphere / The everyday collection{" "}
        <span>Portfolio demo · All payments are simulated</span>
      </footer>
    </Session.Provider>
  );
}
function Catalog() {
  const [products, setProducts] = useState<Product[]>([]),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState(""),
    [sort, setSort] = useState("name"),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api<Product[]>(
      `/products?${new URLSearchParams({ search, category, sort })}`,
    )
      .then((p) => {
        if (active) setProducts(p);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [search, category, sort]);
  return (
    <>
      <section className="hero">
        <p className="eyebrow">THE EVERYDAY COLLECTION / 01</p>
        <h1>
          Small things.
          <br />
          Better days.
        </h1>
        <p>
          Thoughtfully chosen essentials for your desk, your home, and wherever
          you go next.
        </p>
        <a className="button" href="#collection">
          Explore the collection ↗
        </a>
        <div className="hero-art" aria-hidden="true">
          ☕ <span>🎧</span>
        </div>
      </section>
      <section id="collection">
        <div className="section-title">
          <h2>Find your everyday favorite</h2>
          <span>8 considered essentials</span>
        </div>
        <div className="filters">
          <label>
            Search products
            <input
              type="search"
              placeholder="Try headphones…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label>
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {["Electronics", "Home", "Travel", "Stationery"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="name">Name</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </label>
        </div>
        <ErrorNotice message={error} />
        {loading ? (
          <p role="status">Loading products…</p>
        ) : (
          <>
            <p className="muted">{products.length} products</p>
            <div className="grid">
              {products.map((p) => (
                <article
                  className="product"
                  key={p.id}
                  data-testid="product-card"
                >
                  <Link to={`/products/${p.id}`}>
                    <div
                      className={`product-art tone-${p.id % 4}`}
                      aria-hidden="true"
                    >
                      {p.icon}
                    </div>
                    <p className="eyebrow">{p.category}</p>
                    <h3>{p.name}</h3>
                    <p>
                      {money(p.price)} <span className="arrow">↗</span>
                    </p>
                  </Link>
                </article>
              ))}
            </div>
            {!products.length && (
              <p>No products found. Try a different search.</p>
            )}
          </>
        )}
      </section>
    </>
  );
}
function ProductDetail() {
  const { id } = useParams(),
    { user } = useContext(Session),
    navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [added, setAdded] = useState(false);
  useEffect(() => {
    api<Product>(`/products/${id}`)
      .then(setProduct)
      .catch((e) => setError(e.message));
  }, [id]);
  async function add() {
    if (!user) {
      navigate("/login");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const cart = await api<Cart>("/cart");
      const quantity =
        (cart.items.find((i) => i.product.id === product!.id)?.quantity || 0) +
        1;
      await api(`/cart/items/${id}`, {
        method: "PUT",
        body: JSON.stringify({ quantity }),
      });
      setAdded(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link to="/">← All products</Link>
      <ErrorNotice message={error} />
      {product ? (
        <div className="detail">
          <div className="product-art large" aria-hidden="true">
            {product.icon}
          </div>
          <section>
            <p className="eyebrow">{product.category}</p>
            <h1>{product.name}</h1>
            <p className="price">{money(product.price)}</p>
            <p>{product.description}</p>
            <p className="muted">Free demo shipping · No real charge</p>
            <button disabled={busy} onClick={add}>
              {busy ? "Adding…" : "Add to cart"}
            </button>
            {added && (
              <p role="status">
                Added to cart. <Link to="/cart">View cart</Link>
              </p>
            )}
          </section>
        </div>
      ) : (
        !error && <p>Loading product…</p>
      )}
    </>
  );
}
function AuthPage({ register = false }: { register?: boolean }) {
  const { setUser } = useContext(Session),
    navigate = useNavigate();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const auth = await api<Auth>(`/auth/${register ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      sessionStorage.setItem(TOKEN_KEY, auth.token);
      setUser(auth.user);
      navigate("/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel narrow">
      <p className="eyebrow">YOUR EVERYDAY STARTS HERE</p>
      <h1>{register ? "Create account" : "Welcome back"}</h1>
      <ErrorNotice message={error} />
      <form onSubmit={submit}>
        {register && (
          <label>
            Name
            <input name="name" autoComplete="name" required maxLength={80} />
          </label>
        )}
        <label>
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete={register ? "new-password" : "current-password"}
            required
            minLength={register ? 8 : 1}
            maxLength={64}
          />
        </label>
        {register && (
          <small>Use 8–64 characters (at most 72 UTF-8 bytes).</small>
        )}
        <button disabled={busy}>
          {busy ? "Please wait…" : register ? "Create account" : "Log in"}
        </button>
      </form>
      <p>
        {register ? "Already have an account?" : "New to ShopSphere?"}{" "}
        <Link to={register ? "/login" : "/register"}>
          {register ? "Log in" : "Create account"}
        </Link>
      </p>
    </section>
  );
}
function SignInPrompt() {
  return (
    <section className="panel">
      <h1>Please log in</h1>
      <p>Your cart and orders are saved to your account.</p>
      <Link className="button" to="/login">
        Log in
      </Link>
    </section>
  );
}
function CartPage() {
  const { user } = useContext(Session);
  const [cart, setCart] = useState<Cart | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (user)
      api<Cart>("/cart")
        .then(setCart)
        .catch((e) => setError(e.message));
  }, [user]);
  async function update(id: number, quantity?: number) {
    setBusy(true);
    setError("");
    try {
      setCart(
        await api<Cart>(`/cart/items/${id}`, {
          method: quantity === undefined ? "DELETE" : "PUT",
          ...(quantity === undefined
            ? {}
            : { body: JSON.stringify({ quantity }) }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!user) return <SignInPrompt />;
  return (
    <>
      <h1>Your cart</h1>
      <ErrorNotice message={error} />
      {cart ? (
        cart.items.length ? (
          <>
            <div className="panel">
              {cart.items.map((i) => (
                <div
                  className="cart-row"
                  key={i.product.id}
                  data-testid="cart-item"
                >
                  <span className="mini-art" aria-hidden="true">
                    {i.product.icon}
                  </span>
                  <div>
                    <Link to={`/products/${i.product.id}`}>
                      {i.product.name}
                    </Link>
                    <p>{money(i.product.price)} each</p>
                  </div>
                  <label>
                    Quantity for {i.product.name}
                    <select
                      aria-label={`Quantity for ${i.product.name}`}
                      disabled={busy}
                      value={i.quantity}
                      onChange={(e) =>
                        update(i.product.id, Number(e.target.value))
                      }
                    >
                      {Array.from({ length: 99 }, (_, n) => (
                        <option key={n + 1}>{n + 1}</option>
                      ))}
                    </select>
                  </label>
                  <strong>{money(i.subtotal)}</strong>
                  <button
                    className="quiet"
                    disabled={busy}
                    onClick={() => update(i.product.id)}
                  >
                    Remove {i.product.name}
                  </button>
                </div>
              ))}
            </div>
            <div className="summary">
              <h2>
                Total <span data-testid="cart-total">{money(cart.total)}</span>
              </h2>
              <p>Shipping: free · Tax: $0.00 (demo)</p>
              <Link className="button" to="/checkout">
                Proceed to checkout
              </Link>
            </div>
          </>
        ) : (
          <div className="panel">
            <p>Your cart is empty.</p>
            <Link to="/">Explore the collection</Link>
          </div>
        )
      ) : (
        !error && <p>Loading cart…</p>
      )}
    </>
  );
}
function CheckoutPage() {
  const { user } = useContext(Session),
    navigate = useNavigate();
  const [cart, setCart] = useState<Cart | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (user)
      api<Cart>("/cart")
        .then(setCart)
        .catch((e) => setError(e.message));
  }, [user]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const order = await api<Order>("/orders", {
        method: "POST",
        body: JSON.stringify(data),
      });
      navigate(`/orders/${order.id}?confirmed=1`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!user) return <SignInPrompt />;
  return (
    <section className="panel narrow">
      <h1>Checkout</h1>
      <ErrorNotice message={error} />
      {cart?.items.length ? (
        <>
          <p>
            Total: <strong>{money(cart.total)}</strong> · Free demo shipping
          </p>
          <form onSubmit={submit}>
            <label>
              Full name
              <input
                name="name"
                required
                maxLength={80}
                defaultValue={user.name}
                autoComplete="shipping name"
              />
            </label>
            <label>
              Street address
              <input
                name="address"
                required
                maxLength={200}
                autoComplete="shipping street-address"
              />
            </label>
            <label>
              City
              <input
                name="city"
                required
                maxLength={80}
                autoComplete="shipping address-level2"
              />
            </label>
            <label>
              Postal code
              <input
                name="postalCode"
                required
                maxLength={20}
                autoComplete="shipping postal-code"
              />
            </label>
            <label>
              Mock payment
              <select name="payment">
                <option value="APPROVED">Approve payment</option>
                <option value="DECLINED">Decline payment (test)</option>
              </select>
            </label>
            <p className="muted">
              Simulated payment only. Do not enter card details.
            </p>
            <button disabled={busy}>
              {busy ? "Placing order…" : "Place order"}
            </button>
          </form>
        </>
      ) : cart ? (
        <p>
          Your cart is empty. <Link to="/">Continue shopping</Link>
        </p>
      ) : (
        <p>Loading checkout…</p>
      )}
    </section>
  );
}
function OrdersPage() {
  const { user } = useContext(Session);
  const [orders, setOrders] = useState<Order[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    if (user)
      api<Order[]>("/orders")
        .then(setOrders)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
  }, [user]);
  if (!user) return <SignInPrompt />;
  return (
    <>
      <h1>Order history</h1>
      <ErrorNotice message={error} />
      {loading ? (
        <p>Loading orders…</p>
      ) : orders.length ? (
        orders.map((o) => (
          <article className="panel order-row" key={o.id}>
            <div>
              <p className="eyebrow">{o.status}</p>
              <Link to={`/orders/${o.id}`}>Order {o.id}</Link>
              <p>{new Date(o.placedAt).toLocaleString()}</p>
            </div>
            <strong>{money(o.total)}</strong>
          </article>
        ))
      ) : (
        <p>
          No orders yet. <Link to="/">Start shopping</Link>
        </p>
      )}
    </>
  );
}
function OrderPage() {
  const { id } = useParams(),
    { user } = useContext(Session);
  const [order, setOrder] = useState<Order | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (user)
      api<Order>(`/orders/${id}`)
        .then(setOrder)
        .catch((e) => setError(e.message));
  }, [id, user]);
  if (!user) return <SignInPrompt />;
  return (
    <>
      <ErrorNotice message={error} />
      {order ? (
        <section className="panel">
          <p className="eyebrow">THANK YOU FOR SHOPPING SMALL</p>
          <h1>Order confirmed</h1>
          <p data-testid="order-id">{order.id}</p>
          <p>
            {new Date(order.placedAt).toLocaleString()} · {order.status}
          </p>
          {order.items.map((i) => (
            <div className="order-row" key={i.productId}>
              <span>
                {i.name} × {i.quantity}
              </span>
              <strong>{money(i.unitPrice * i.quantity)}</strong>
            </div>
          ))}
          <h2>
            Total <span data-testid="order-total">{money(order.total)}</span>
          </h2>
          <h3>Shipping to</h3>
          <p>
            {order.name}
            <br />
            {order.address}
            <br />
            {order.city}, {order.postalCode}
          </p>
          <Link to="/orders">View order history</Link>
        </section>
      ) : (
        !error && <p>Loading order…</p>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
