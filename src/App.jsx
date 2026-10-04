import { useEffect, useMemo, useState } from "react";
import api from "./api";
import "./App.css";

const peso = (n) =>
  "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 });
const stockOf = (q) =>
  q <= 0 ? ["out", "Out of stock"] : q <= 10 ? ["low", "Low stock"] : ["ok", "In stock"];
const errMsg = (e) => e.response?.data?.error || e.message || "Something went wrong";

function Field({ label, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}

function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const isLogin = mode === "login";

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setOk("");
    setBusy(true);
    try {
      if (!isLogin) {
        await api.post("/auth/register", f);
        setOk("Account created. Sign in to continue.");
        setMode("login");
      } else {
        const { data } = await api.post("/auth/login", {
          username: f.username,
          password: f.password,
        });
        localStorage.setItem("access_token", data.tokens.access_token);
        localStorage.setItem("refresh_token", data.tokens.refresh_token);
        localStorage.setItem("username", data.user?.username || f.username);
        onLogin();
      }
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <aside className="auth-brand">
        <div className="brand">
          <span className="mark">S</span> StockRoom
        </div>
        <div>
          <h1>Know exactly what is on your shelves.</h1>
          <p>Add, update and track every product from one place, behind a secure login.</p>
        </div>
        <small>Product Management System</small>
      </aside>

      <main className="auth-form">
        <form onSubmit={submit}>
          <h2>{isLogin ? "Sign in" : "Create your account"}</h2>
          <p className="sub">
            {isLogin ? "Use your account to manage products." : "It only takes a moment."}
          </p>
          {error && <div className="notice error">{error}</div>}
          {ok && <div className="notice ok">{ok}</div>}
          <Field label="Username" value={f.username} onChange={set("username")} required />
          {!isLogin && (
            <Field label="Email" type="email" value={f.email} onChange={set("email")} required />
          )}
          <Field
            label="Password"
            type="password"
            value={f.password}
            onChange={set("password")}
            required
          />
          <button className="btn primary block" disabled={busy}>
            {busy ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
          </button>
          <p className="switch">
            {isLogin ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="linkbtn"
              onClick={() => {
                setError("");
                setOk("");
                setMode(isLogin ? "register" : "login");
              }}
            >
              {isLogin ? "Create an account" : "Sign in"}
            </button>
          </p>
        </form>
      </main>
    </div>
  );
}

function Dashboard({ onLogout }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const [toast, setToast] = useState(null);
  const user = localStorage.getItem("username") || "user";

  const notify = (type, text) => setToast({ type, text });
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const load = async () => {
    try {
      const { data } = await api.get("/products");
      setProducts(data.data);
    } catch (e) {
      notify("error", errMsg(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(
    () => ({
      count: products.length,
      units: products.reduce((s, p) => s + Number(p.quantity), 0),
      value: products.reduce((s, p) => s + Number(p.price) * Number(p.quantity), 0),
      low: products.filter((p) => Number(p.quantity) <= 10).length,
    }),
    [products]
  );

  const shown = products.filter((p) =>
    `${p.product_name} ${p.description || ""}`.toLowerCase().includes(q.toLowerCase())
  );

  const openEdit = (p) =>
    setForm({
      id: p.id,
      product_name: p.product_name,
      description: p.description || "",
      price: p.price,
      quantity: p.quantity,
    });

  const save = async (e) => {
    e.preventDefault();
    const body = {
      product_name: form.product_name,
      description: form.description,
      price: Number(form.price),
      quantity: Number(form.quantity),
    };
    try {
      if (form.id) {
        await api.put(`/products/${form.id}`, body);
        notify("ok", "Product updated");
      } else {
        await api.post("/products", body);
        notify("ok", "Product added");
      }
      setForm(null);
      load();
    } catch (err) {
      notify("error", errMsg(err));
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/products/${del.id}`);
      notify("ok", "Product deleted");
      load();
    } catch (err) {
      notify("error", errMsg(err));
    }
    setDel(null);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout", {
        refresh_token: localStorage.getItem("refresh_token"),
      });
    } catch {
      /* ignore: we clear the session either way */
    }
    localStorage.clear();
    onLogout();
  };

  const setF = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <span className="mark">S</span> StockRoom
        </div>
        <nav>
          <a className="active" href="#products">Products</a>
        </nav>
        <div className="me">
          <span className="avatar">{user.slice(0, 1).toUpperCase()}</span>
          <span className="who">{user}</span>
          <button className="btn ghost-light" onClick={logout}>Log out</button>
        </div>
      </aside>

      <main className="main" id="products">
        <header className="head">
          <div>
            <h1>Products</h1>
            <p className="sub">Manage your inventory, prices and stock levels.</p>
          </div>
          <button
            className="btn primary"
            onClick={() => setForm({ product_name: "", description: "", price: "", quantity: "" })}
          >
            Add product
          </button>
        </header>

        <section className="stats">
          <div><b>{stats.count}</b><span>Products</span></div>
          <div><b>{stats.units.toLocaleString()}</b><span>Units in stock</span></div>
          <div><b>{peso(stats.value)}</b><span>Inventory value</span></div>
          <div><b className={stats.low ? "warn" : ""}>{stats.low}</b><span>Need restocking</span></div>
        </section>

        <section className="panel">
          <div className="toolbar">
            <input
              className="search"
              placeholder="Search by name or description"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search products"
            />
            <span className="sub">{shown.length} shown</span>
          </div>

          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="num">Price</th>
                  <th className="num">Quantity</th>
                  <th>Status</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => {
                  const [cls, label] = stockOf(Number(p.quantity));
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="pname">{p.product_name}</div>
                        <div className="pdesc">{p.description}</div>
                      </td>
                      <td className="num">{peso(p.price)}</td>
                      <td className="num">{p.quantity}</td>
                      <td><span className={`pill ${cls}`}>{label}</span></td>
                      <td className="right">
                        <button className="btn small" onClick={() => openEdit(p)}>Edit</button>{" "}
                        <button className="btn small danger" onClick={() => setDel(p)}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!loading && shown.length === 0 && (
              <div className="empty">
                {q ? "No products match your search." : "No products yet. Add your first product to get started."}
              </div>
            )}
            {loading && <div className="empty">Loading products...</div>}
          </div>
        </section>
      </main>

      {form && (
        <div className="overlay" onClick={() => setForm(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h2>{form.id ? "Edit product" : "Add product"}</h2>
            <Field label="Product name" value={form.product_name} onChange={setF("product_name")} required maxLength={100} />
            <Field label="Description" value={form.description} onChange={setF("description")} />
            <div className="two">
              <Field label="Price (₱)" type="number" step="0.01" min="0" value={form.price} onChange={setF("price")} required />
              <Field label="Quantity" type="number" min="0" value={form.quantity} onChange={setF("quantity")} required />
            </div>
            <div className="actions">
              <button type="button" className="btn" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn primary">{form.id ? "Save changes" : "Add product"}</button>
            </div>
          </form>
        </div>
      )}

      {del && (
        <div className="overlay" onClick={() => setDel(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete product?</h2>
            <p className="sub">
              {del.product_name} will be removed from your inventory. This cannot be undone.
            </p>
            <div className="actions">
              <button className="btn" onClick={() => setDel(null)}>Cancel</button>
              <button className="btn dangerfill" onClick={remove}>Delete product</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`} role="status">{toast.text}</div>}
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem("access_token"));
  return authed ? (
    <Dashboard onLogout={() => setAuthed(false)} />
  ) : (
    <Login onLogin={() => setAuthed(true)} />
  );
}
