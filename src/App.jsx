
import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth";

import {
  LayoutDashboard,
  Package,
  Settings,
  Search,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Boxes,
  IndianRupee,
  X,
  Menu
} from "lucide-react";

import "./App.css";

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);


  useEffect(() => {
    if (!session) {
      setProducts([]);
      setOrganizationId(null);
      setDataLoading(false);
      return;
    }

    async function loadProducts() {
      setDataLoading(true);
      setDbError("");

      try {
        const { data: organization, error: orgError } = await supabase
          .from("organizations")
          .select("id, default_low_stock_threshold")
          .eq("owner_id", session.user.id)
          .single();

        if (orgError) throw orgError;

        setOrganizationId(organization.id);
        setThreshold(organization.default_low_stock_threshold);

        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("organization_id", organization.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setProducts(data.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          description: p.description || "",
          quantity: p.quantity,
          cost: p.cost_price ?? 0,
          price: p.selling_price ?? 0,
          low: p.low_stock_threshold
        })));
      } catch (error) {
        setDbError(error.message);
      } finally {
        setDataLoading(false);
      }
    }

    loadProducts();
  }, [session]);


  const [activePage, setActivePage] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [threshold, setThreshold] = useState(5);
  const [organizationId, setOrganizationId] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dbError, setDbError] = useState("");

  const [products, setProducts] = useState([]);

  const emptyForm = {
    name: "", sku: "", description: "",
    quantity: "", cost: "", price: "", low: ""
  };

  const [form, setForm] = useState(emptyForm);

  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + p.quantity, 0);
  const lowStock = products.filter(
    p => p.quantity <= (p.low ?? threshold)
  );

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  
  async function handleSubmit(e) {
    e.preventDefault();

    if (!organizationId) {
      alert("Organization not found. Please log in again.");
      return;
    }

    const productData = {
      organization_id: organizationId,
      name: form.name.trim(),
      sku: form.sku.trim(),
      description: form.description.trim() || null,
      quantity: Number(form.quantity),
      cost_price: form.cost === "" ? null : Number(form.cost),
      selling_price: form.price === "" ? null : Number(form.price),
      low_stock_threshold: form.low === "" ? null : Number(form.low),
      updated_at: new Date().toISOString()
    };

    try {
      let error;

      if (editingId) {
        ({ error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingId)
          .eq("organization_id", organizationId));
      } else {
        ({ error } = await supabase
          .from("products")
          .insert(productData));
      }

      if (error) throw error;

      const { data, error: fetchError } = await supabase
        .from("products")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setProducts(data.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        description: p.description || "",
        quantity: p.quantity,
        cost: p.cost_price ?? 0,
        price: p.selling_price ?? 0,
        low: p.low_stock_threshold
      })));

      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      alert(error.message);
    }
  }


  function editProduct(product) {
    setForm({
      name: product.name,
      sku: product.sku,
      description: product.description || "",
      quantity: product.quantity,
      cost: product.cost,
      price: product.price,
      low: product.low ?? ""
    });
    setEditingId(product.id);
    setShowForm(true);
  }

  
  async function deleteProduct(id) {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) {
      alert(error.message);
      return;
    }

    setProducts(products.filter(p => p.id !== id));
  }


  function changePage(page) {
    setActivePage(page);
    setShowForm(false);
  }

  if (authLoading) {
    return <h2>Loading StockFlow...</h2>;
  }

  if (!session) {
    return <Auth />;
  }

  if (dataLoading) {
    return <h2>Loading your inventory...</h2>;
  }

  if (dbError) {
    return <div style={{ padding: "30px" }}>
      <h2>Unable to load inventory</h2>
      <p>{dbError}</p>
      <button onClick={() => window.location.reload()}>
        Try Again
      </button>
    </div>;
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Boxes size={25} /></div>
          <h2>StockFlow</h2>
        </div>

        <p className="menu-heading">MENU</p>

        {[
          { name: "Dashboard", icon: LayoutDashboard },
          { name: "Products", icon: Package },
          { name: "Settings", icon: Settings }
        ].map(item => (
          <button
            key={item.name}
            className={`nav-item ${activePage === item.name ? "active" : ""}`}
            onClick={() => changePage(item.name)}
          >
            <item.icon size={19} />
            {item.name}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="profile-avatar">A</div>
          <div>
            <strong>Admin User</strong>
            <small>Store Owner</small>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>{activePage}</h1>
            <p>Welcome back! Here's your inventory overview.</p>
          </div>
          
          <div className="topbar-right">
            <span className="status-dot"></span>
            <span>{session.user.email}</span>

            <button
              className="secondary-btn"
              onClick={async () => {
                const { error } = await supabase.auth.signOut();
                if (error) alert(error.message);
              }}
            >
              Logout
            </button>
          </div>

        </header>

        {activePage === "Dashboard" && (
          <>
            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon purple"><Package /></div>
                <p>Total Products</p>
                <h2>{totalProducts}</h2>
                <small>Products in your inventory</small>
              </div>

              <div className="stat-card">
                <div className="stat-icon blue"><Boxes /></div>
                <p>Total Stock</p>
                <h2>{totalStock}</h2>
                <small>Total units available</small>
              </div>

              <div className="stat-card">
                <div className="stat-icon orange"><AlertTriangle /></div>
                <p>Low Stock Items</p>
                <h2>{lowStock.length}</h2>
                <small>Products need attention</small>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Low Stock Alerts</h2>
                  <p>Products that need restocking</p>
                </div>
                <button className="secondary-btn" onClick={() => changePage("Products")}>
                  View Products
                </button>
              </div>

              {lowStock.length === 0 ? (
                <p className="empty-message">No low-stock products. Great job!</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th>SKU</th>
                        <th>Quantity</th>
                        <th>Threshold</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStock.map(p => (
                        <tr key={p.id}>
                          <td><strong>{p.name}</strong></td>
                          <td>{p.sku}</td>
                          <td>{p.quantity}</td>
                          <td>{p.low ?? threshold}</td>
                          <td><span className="badge-low">Low Stock</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {activePage === "Products" && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Product Inventory</h2>
                <p>Manage and track your products</p>
              </div>
              <button className="primary-btn" onClick={() => {
                setForm(emptyForm);
                setEditingId(null);
                setShowForm(true);
              }}>
                <Plus size={18} /> Add Product
              </button>
            </div>

            <div className="search-box">
              <Search size={18} />
              <input
                placeholder="Search by product name or SKU..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>SKU</th>
                    <th>Quantity</th>
                    <th>Selling Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(p => (
                    <tr key={p.id}>
                      <td><strong>{p.name}</strong></td>
                      <td>{p.sku}</td>
                      <td>{p.quantity}</td>
                      <td>₹{p.price.toLocaleString("en-IN")}</td>
                      <td>
                        <span className={p.quantity <= (p.low || threshold) ? "badge-low" : "badge-good"}>
                          {p.quantity <= (p.low || threshold) ? "Low Stock" : "In Stock"}
                        </span>
                      </td>
                      <td className="actions">
                        <button className="edit-btn" onClick={() => editProduct(p)} title="Edit">
                          <Pencil size={17} />
                        </button>
                        <button className="delete-btn" onClick={() => deleteProduct(p.id)} title="Delete">
                          <Trash2 size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr><td colSpan="6" className="empty-message">No products found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activePage === "Settings" && (
          <section className="panel settings-panel">
            <h2>Inventory Settings</h2>
            <p>Configure your default inventory preferences.</p>
            <label>Default Low Stock Threshold</label>
            <input
              type="number"
              min="0"
              value={threshold}
              onChange={async (e) => {
                const newThreshold = Number(e.target.value);

                setThreshold(newThreshold);

                const { error } = await supabase
                  .from("organizations")
                  .update({
                    default_low_stock_threshold: newThreshold
                  })
                  .eq("id", organizationId);

                if (error) {
                  alert(error.message);
                }
              }}
            />
            <small>Products with quantity at or below this value are considered low stock when they have no individual threshold.</small>
          </section>
        )}
      </main>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingId ? "Edit Product" : "Add New Product"}</h2>
              <button className="close-btn" onClick={() => setShowForm(false)}><X /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <label>Product Name *</label>
              <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Enter product name" />

              <label>SKU *</label>
              <input required value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="Enter unique SKU" />

              <label>Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Product description" />

              <div className="form-grid">
                <div>
                  <label>Quantity *</label>
                  <input type="number" min="0" required value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
                </div>
                <div>
                  <label>Cost Price</label>
                  <input type="number" min="0" step="0.01" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} />
                </div>
                <div>
                  <label>Selling Price</label>
                  <input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                </div>
                <div>
                  <label>Low Stock Threshold</label>
                  <input type="number" min="0" value={form.low} onChange={e => setForm({...form, low: e.target.value})} placeholder={`Default: ${threshold}`} />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="primary-btn">{editingId ? "Save Changes" : "Add Product"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
