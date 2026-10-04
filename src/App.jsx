import { useEffect, useState } from "react";
import api from "./api";
import "./App.css";

const emptyForm = { product_name: "", description: "", price: "", quantity: "" };

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem("access_token"));
  const [mode, setMode] = useState("login");
  const [auth, setAuth] = useState({ username: "", email: "", password: "" });
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const showError = (e) =>
    setError(e.response?.data?.error || e.message || "Something went wrong");

  const loadProducts = async () => {
    try {
      const { data } = await api.get("/products");
      setProducts(data.data);
    } catch (e) {
      showError(e);
    }
  };

  useEffect(() => {
    if (loggedIn) loadProducts();
  }, [loggedIn]);

  const submitAuth = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      if (mode === "register") {
        await api.post("/auth/register", auth);
        setMsg("Registered! You can now log in.");
        setMode("login");
        return;
      }
      const { data } = await api.post("/auth/login", {
        username: auth.username,
        password: auth.password,
      });
      localStorage.setItem("access_token", data.tokens.access_token);
      localStorage.setItem("refresh_token", data.tokens.refresh_token);
      setLoggedIn(true);
    } catch (e) {
      showError(e);
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout", {
        refresh_token: localStorage.getItem("refresh_token"),
      });
    } catch {
      /* ignore */
    }
    localStorage.clear();
    setLoggedIn(false);
    setProducts([]);
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");
    const body = {
      product_name: form.product_name,
      description: form.description,
      price: Number(form.price),
      quantity: Number(form.quantity),
    };
    try {
      if (editId) {
        await api.put(`/products/${editId}`, body);
        setMsg("Product updated");
      } else {
        await api.post("/products", body);
        setMsg("Product added");
      }
      setForm(emptyForm);
      setEditId(null);
      loadProducts();
    } catch (e) {
      showError(e);
    }
  };

  const startEdit = (p) => {
    setEditId(p.id);
    setForm({
      product_name: p.product_name,
      description: p.description || "",
      price: p.price,
      quantity: p.quantity,
    });
  };

  const removeProduct = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await api.delete(`/products/${id}`);
      setMsg("Product deleted");
      loadProducts();
    } catch (e) {
      showError(e);
    }
  };

  if (!loggedIn) {
    return (
      <div className="card">
        <h1>{mode === "login" ? "Login" : "Register"}</h1>
        <p className="subtitle">
  {mode === "login" ? "Sign in to manage your products" : "Create an account to get started"}
</p>
        {error && <p className="error">{error}</p>}
        {msg && <p className="ok">{msg}</p>}
        <form onSubmit={submitAuth}>
          <input
            placeholder="Username"
            value={auth.username}
            onChange={(e) => setAuth({ ...auth, username: e.target.value })}
            required
          />
          {mode === "register" && (
            <input
              type="email"
              placeholder="Email"
              value={auth.email}
              onChange={(e) => setAuth({ ...auth, email: e.target.value })}
              required
            />
          )}
          <input
            type="password"
            placeholder="Password"
            value={auth.password}
            onChange={(e) => setAuth({ ...auth, password: e.target.value })}
            required
          />
          <button type="submit">{mode === "login" ? "Login" : "Register"}</button>
        </form>
        <p>
          <button
            className="link"
            onClick={() => {
              setError("");
              setMsg("");
              setMode(mode === "login" ? "register" : "login");
            }}
          >
            {mode === "login" ? "Create an account" : "Back to login"}
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="card wide">
      <div className="bar">
        <h1>Product Management</h1>
        <button onClick={logout}>Logout</button>
      </div>
      {error && <p className="error">{error}</p>}
      {msg && <p className="ok">{msg}</p>}

      <form onSubmit={saveProduct} className="grid">
        <input
          placeholder="Product name"
          value={form.product_name}
          onChange={(e) => setForm({ ...form, product_name: e.target.value })}
          required
        />
        <input
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="Price"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          required
        />
        <input
          type="number"
          min="0"
          placeholder="Quantity"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          required
        />
        <button type="submit">{editId ? "Update" : "Add"} Product</button>
        {editId && (
          <button
            type="button"
            onClick={() => {
              setEditId(null);
              setForm(emptyForm);
            }}
          >
            Cancel
          </button>
        )}
      </form>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Description</th>
            <th>Price</th>
            <th>Qty</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.product_name}</td>
              <td>{p.description}</td>
              <td>₱{Number(p.price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
              <td>{p.quantity}</td>
              <td>
                <button onClick={() => startEdit(p)}>Edit</button>{" "}
                <button onClick={() => removeProduct(p.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}