import { useState, useRef, useEffect, Fragment } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────
const DEFAULT_BUSINESSES = {
  dreamworld: { name: "Dream World Fashion & Design School", shortName: "Dream World", tagline: "Where Fashion Dreams Come True", color: "#7C3AED", accent: "#A78BFA", light: "#EDE9FE", phone: "", email: "", address: "" },
  babyhsu:    { name: "Baby Hsu", shortName: "Baby Hsu", tagline: "Quality Care for Little Ones", color: "#E11D48", accent: "#FB7185", light: "#FFF1F2", phone: "", email: "", address: "" },
};
const CURRENCIES      = ["MMK", "USD", "THB", "SGD", "EUR"];
const PAYMENT_METHODS = ["Cash", "COD (Cash on Delivery)", "Bank Transfer", "KBZ Pay", "Wave Pay", "CB Pay", "AYA Pay", "Credit Card", "Other"];
const TEMPLATES       = { modern: "Modern Clean", classic: "Classic Formal", minimal: "Minimal", bold: "Bold & Colorful" };
const LAYOUT_SECTIONS = [
  { id: "header",  label: "Business Info",    icon: "🏢" },
  { id: "client",  label: "Client / Bill To", icon: "👤" },
  { id: "items",   label: "Items & Services", icon: "📦" },
  { id: "summary", label: "Summary & Totals", icon: "💰" },
  { id: "payment", label: "Payment & Notes",  icon: "💳" },
];
const defaultItem = () => ({ id: Date.now() + Math.random(), description: "", quantity: 1, unitPrice: 0, discount: 0, discountType: "%" });

// ─── Storage ─────────────────────────────────────────────────────────────────
const getBusinesses    = () => { try { return JSON.parse(localStorage.getItem("invoice-businesses")) || DEFAULT_BUSINESSES; } catch { return DEFAULT_BUSINESSES; } };
const saveBusinesses   = (data) => localStorage.setItem("invoice-businesses", JSON.stringify(data));
const getSavedInvoices = () => { try { return JSON.parse(localStorage.getItem("invoice-saved")) || []; } catch { return []; } };
const upsertInvoice    = (inv) => { const list = getSavedInvoices(); const i = list.findIndex(x => x.id === inv.id); if (i >= 0) list[i] = inv; else list.unshift(inv); localStorage.setItem("invoice-saved", JSON.stringify(list)); };
const removeInvoice    = (id)  => localStorage.setItem("invoice-saved", JSON.stringify(getSavedInvoices().filter(x => x.id !== id)));

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (amount, currency) => {
  const n = Number(amount) || 0;
  if (currency === "MMK") return `${n.toLocaleString()} Ks`;
  if (currency === "THB") return `฿${n.toLocaleString()}`;
  if (currency === "SGD") return `S$${n.toLocaleString("en", { minimumFractionDigits: 2 })}`;
  if (currency === "EUR") return `€${n.toLocaleString("en", { minimumFractionDigits: 2 })}`;
  return `$${n.toLocaleString("en", { minimumFractionDigits: 2 })}`;
};
const resizeImage = (file, maxSize = 240) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = e.target.result;
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const lightenColor = (hex) => {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return "#F3F4F6";
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgb(${Math.round(r*.12+255*.88)},${Math.round(g*.12+255*.88)},${Math.round(b*.12+255*.88)})`;
};

// ─── Theme ───────────────────────────────────────────────────────────────────
const mkTheme = (dark) => ({
  bg:          dark ? "#0D1117" : "#F4F6FA",
  card:        dark ? "#161B22" : "#FFFFFF",
  cardAlt:     dark ? "#1C2128" : "#F6F8FA",
  border:      dark ? "#21262D" : "#E4E8EF",
  inputBg:     dark ? "#0D1117" : "#FFFFFF",
  inputBorder: dark ? "#30363D" : "#D0D7DE",
  text:        dark ? "#E6EDF3" : "#1C2128",
  textSub:     dark ? "#8B949E" : "#57606A",
  textMuted:   dark ? "#484F58" : "#9BA8B6",
  shadow:      dark ? "0 0 0 1px rgba(255,255,255,0.04),0 8px 24px rgba(0,0,0,0.5)" : "0 0 0 1px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.06)",
  shadowSm:    dark ? "0 1px 4px rgba(0,0,0,0.4)" : "0 1px 4px rgba(0,0,0,0.06)",
});

// ─── ColorPicker ─────────────────────────────────────────────────────────────
function ColorPicker({ value, onChange, t }) {
  const safe = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#000000";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input type="color" value={safe} onChange={e => onChange(e.target.value)}
        style={{ width: 40, height: 40, padding: 3, border: `1px solid ${t.border}`, borderRadius: 8, cursor: "pointer", background: "none", flexShrink: 0 }} />
      <input value={value} maxLength={7} placeholder="#000000"
        onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) onChange(e.target.value); }}
        style={{ flex: 1, padding: "9px 12px", border: `1px solid ${t.inputBorder}`, borderRadius: 8, fontSize: 13, fontFamily: "monospace", outline: "none", background: t.inputBg, color: t.text, boxSizing: "border-box" }} />
      <div style={{ width: 40, height: 40, borderRadius: 8, background: safe, border: `1px solid ${t.border}`, flexShrink: 0 }} />
    </div>
  );
}

// ─── NumInput ────────────────────────────────────────────────────────────────
function NumInput({ value, onChange, style, min = 0 }) {
  const [text, setText] = useState(String(value ?? 0));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setText(String(value ?? 0)); }, [value]);
  return (
    <input type="text" inputMode="numeric" value={text} style={style}
      onFocus={e => { focused.current = true; e.target.select(); }}
      onChange={e => { const raw = e.target.value; if (raw === "" || /^\d*\.?\d*$/.test(raw)) { setText(raw); const n = parseFloat(raw); onChange(isNaN(n) ? 0 : n); } }}
      onBlur={() => { focused.current = false; const n = Math.max(min, parseFloat(text) || 0); setText(String(n)); onChange(n); }}
    />
  );
}

// ─── App Shell ───────────────────────────────────────────────────────────────
export default function InvoiceApp() {
  const [page, setPage]               = useState("home");
  const [selectedBiz, setSelectedBiz] = useState(null);
  const [collapsed, setCollapsed]     = useState(false);
  const [loadedInvoice, setLoaded]    = useState(null);
  const [dark, setDark]               = useState(() => localStorage.getItem("invoice-dark") === "true");
  const [businesses, setBusinesses] = useState(getBusinesses);

  const t = mkTheme(dark);
  const toggleDark = () => setDark(d => { const v = !d; localStorage.setItem("invoice-dark", v); return v; });
  const loadBusinesses = () => setBusinesses(getBusinesses());

  const goEditor = (bizKey, inv = null) => { setSelectedBiz(bizKey); setLoaded(inv); setPage("editor"); };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter','Segoe UI',sans-serif", background: t.bg, color: t.text }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />
      <Sidebar page={page} onNavigate={setPage} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} dark={dark} onToggleDark={toggleDark} />
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
        {page === "home"     && <HomeScreen    businesses={businesses} onSelect={biz => goEditor(biz)} t={t} />}
        {page === "editor"   && <InvoiceEditor businesses={businesses} business={selectedBiz} onBack={() => setPage("home")} loadedInvoice={loadedInvoice} t={t} />}
        {page === "settings" && <SettingsPage  businesses={businesses} onSaved={loadBusinesses} t={t} />}
        {page === "saved"    && <SavedPage     businesses={businesses} onLoad={inv => goEditor(inv.bizKey, inv)} onNew={() => setPage("home")} t={t} />}
      </div>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ page, onNavigate, collapsed, onToggle, dark, onToggleDark }) {
  const sections = [
    {
      label: "Menu",
      items: [
        { id: "home",  icon: "📄", label: "New Invoice" },
        { id: "saved", icon: "🗂️", label: "Invoices"    },
      ],
    },
    {
      label: "General",
      items: [
        { id: "settings", icon: "⚙️", label: "Settings" },
      ],
    },
  ];

  const S = {
    bg:        dark ? "#161B22" : "#FFFFFF",
    border:    dark ? "#21262D" : "#EAECF0",
    text:      dark ? "#E6EDF3" : "#1C2128",
    textSub:   dark ? "#8B949E" : "#6B7280",
    label:     dark ? "#484F58" : "#9BA8B6",
    iconBg:    dark ? "#21262D" : "#F3F4F6",
    activeBg:  dark ? "rgba(124,58,237,0.18)" : "#F0EBFF",
    activeIcon:dark ? "rgba(124,58,237,0.3)"  : "#E4D9FF",
    activeText:"#7C3AED",
    cardBg:    dark ? "#1C2128" : "#F4F6FF",
    cardBorder:dark ? "#21262D" : "#E0E7FF",
  };

  return (
    <div style={{ width: collapsed ? 64 : 240, minWidth: collapsed ? 64 : 240, background: S.bg, display: "flex", flexDirection: "column", transition: "width .2s,min-width .2s", overflow: "hidden", borderRight: `1px solid ${S.border}`, position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>

      {/* Header */}
      <div style={{ padding: "14px 14px 12px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${S.border}` }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#7C3AED,#A78BFA)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📋</div>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: S.textSub, fontWeight: 500, letterSpacing: 0.3 }}>Invoice App ✦</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: S.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Invoice Creator</div>
          </div>
        )}
        <button onClick={onToggle} style={{ background: "none", border: `1px solid ${S.border}`, borderRadius: 6, color: S.textSub, cursor: "pointer", fontSize: 12, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: collapsed ? "auto" : 0 }}>
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {/* Nav sections */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
        {sections.map(({ label, items }) => (
          <div key={label} style={{ marginBottom: 6 }}>
            {!collapsed && (
              <div style={{ fontSize: 11, fontWeight: 600, color: S.label, letterSpacing: 0.8, padding: "8px 8px 6px", textTransform: "uppercase" }}>{label}</div>
            )}
            {items.map(item => {
              const active = page === item.id || (page === "editor" && item.id === "home");
              return (
                <button key={item.id} onClick={() => onNavigate(item.id)} title={collapsed ? item.label : undefined}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "6px 8px", borderRadius: 10, border: "none", background: active ? S.activeBg : "transparent", color: active ? S.activeText : S.text, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: active ? 600 : 400, transition: "all .15s", textAlign: "left", marginBottom: 3 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: active ? S.activeIcon : S.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0, transition: "all .15s" }}>
                    {item.icon}
                  </div>
                  {!collapsed && <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom card */}
      <div style={{ padding: "0 10px 14px" }}>
        {!collapsed ? (
          <div style={{ background: S.cardBg, border: `1px solid ${S.cardBorder}`, borderRadius: 14, padding: "14px 14px 12px" }}>
            <button onClick={onToggleDark} style={{ width: 36, height: 36, borderRadius: "50%", background: dark ? "#E6EDF3" : "#1C2128", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", fontSize: 17, marginBottom: 8, color: dark ? "#1C2128" : "#F9FAFB" }}>
              {dark ? "☀" : "☾"}
            </button>
            <div style={{ fontSize: 13, fontWeight: 600, color: S.text }}>{dark ? "Light Mode" : "Dark Mode"}</div>
            <div style={{ fontSize: 11, color: S.textSub, marginTop: 2 }}>
              Or switch <span style={{ color: "#7C3AED", cursor: "pointer", fontWeight: 500 }} onClick={onToggleDark}>appearance</span>
            </div>
          </div>
        ) : (
          <button onClick={onToggleDark} title={dark ? "Light mode" : "Dark mode"}
            style={{ width: "100%", height: 40, borderRadius: 10, background: S.iconBg, border: "none", color: S.textSub, cursor: "pointer", fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {dark ? "☀" : "☾"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Home Screen ─────────────────────────────────────────────────────────────
function HomeScreen({ businesses, onSelect, t }) {
  return (
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div style={{ maxWidth: 480, width: "100%" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 700, color: t.text, letterSpacing: -0.5 }}>New Invoice</h1>
          <p style={{ margin: 0, fontSize: 14, color: t.textSub }}>Select a business profile to continue</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Object.entries(businesses).map(([key, biz]) => (
            <button key={key} onClick={() => onSelect(key)}
              style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16, transition: "all .15s", textAlign: "left", boxShadow: t.shadowSm }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = biz.color; e.currentTarget.style.boxShadow = `0 0 0 3px ${biz.color}18`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.boxShadow = t.shadowSm; }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: biz.logo ? t.cardAlt : `linear-gradient(135deg,${biz.color},${biz.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#fff", fontWeight: 700, fontFamily: "'Playfair Display',serif", flexShrink: 0, overflow: "hidden", border: `1px solid ${t.border}` }}>
                {biz.logo
                  ? <img src={biz.logo} alt={biz.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  : (biz.shortName || biz.name)[0]
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: t.text, fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{biz.name}</div>
                <div style={{ color: t.textSub, fontSize: 13 }}>{biz.tagline}</div>
              </div>
              <div style={{ color: t.textMuted, fontSize: 18 }}>›</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Settings Page ───────────────────────────────────────────────────────────
function SettingsPage({ businesses: init, onSaved, t }) {
  const [businesses, setBusinesses] = useState(init);
  const [status, setStatus]         = useState(null);

  useEffect(() => { setBusinesses(init); }, [init]);

  const update = (key, field, val) => setBusinesses(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } }));

  const handleSave = async () => {
    setStatus("ok");
    saveBusinesses(businesses);
    onSaved?.();
    setTimeout(() => setStatus(null), 2200);
  };

  const inp  = { width: "100%", padding: "9px 12px", border: `1px solid ${t.inputBorder}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", background: t.inputBg, color: t.text, boxSizing: "border-box" };
  const lbl  = { display: "block", fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" };
  const card = { background: t.card, borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: t.shadowSm, border: `1px solid ${t.border}` };

  return (
    <div style={{ minHeight: "100vh", background: t.bg }}>
      <div style={{ height: 52, background: t.card, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", padding: "0 24px", gap: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 15, color: t.text }}>Settings</span>
        <span style={{ fontSize: 13, color: t.textMuted }}>— Business Profiles</span>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
        {Object.entries(businesses).map(([key, biz]) => (
          <div key={key} style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${t.border}` }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: `linear-gradient(135deg,${biz.color},${biz.accent})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16, fontFamily: "'Playfair Display',serif" }}>{(biz.shortName || biz.name)[0]}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: t.text }}>{biz.name}</div>
                <div style={{ fontSize: 12, color: t.textSub }}>{key === "dreamworld" ? "Dream World profile" : "Baby Hsu profile"}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
              <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Business Name</label><input value={biz.name}         onChange={e => update(key,"name",    e.target.value)} style={inp} /></div>
              <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Tagline</label>      <input value={biz.tagline||""}  onChange={e => update(key,"tagline", e.target.value)} style={inp} placeholder="Tagline shown on invoice" /></div>
              <div><label style={lbl}>Phone</label>  <input value={biz.phone||""}   onChange={e => update(key,"phone",   e.target.value)} style={inp} placeholder="+95 9 xxx xxx" /></div>
              <div><label style={lbl}>Email</label>  <input value={biz.email||""}   onChange={e => update(key,"email",   e.target.value)} style={inp} placeholder="hello@example.com" /></div>
              <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Address</label>      <input value={biz.address||""} onChange={e => update(key,"address", e.target.value)} style={inp} placeholder="Street, City, Country" /></div>
              <div><label style={lbl}>Primary Color</label><ColorPicker value={biz.color}  onChange={v => update(key,"color",  v)} t={t} /></div>
              <div><label style={lbl}>Accent Color</label> <ColorPicker value={biz.accent} onChange={v => update(key,"accent", v)} t={t} /></div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Default Invoice Template</label>
                <select value={biz.defaultTemplate || "modern"} onChange={e => update(key, "defaultTemplate", e.target.value)} style={inp}>
                  {Object.entries(TEMPLATES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>Business Logo</label>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ width: 80, height: 80, borderRadius: 14, overflow: "hidden", flexShrink: 0, border: `1px solid ${t.border}`, background: biz.logo ? t.cardAlt : `linear-gradient(135deg,${biz.color},${biz.accent})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {biz.logo
                      ? <img src={biz.logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                      : <span style={{ color: "#fff", fontWeight: 700, fontSize: 28, fontFamily: "'Playfair Display',serif" }}>{(biz.shortName||biz.name)[0]}</span>
                    }
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ background: `linear-gradient(135deg,${biz.color},${biz.accent})`, color: "#fff", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "inline-block" }}>
                      {biz.logo ? "Change Logo" : "Upload Logo"}
                      <input type="file" accept="image/*" style={{ display: "none" }}
                        onChange={async e => {
                          const file = e.target.files?.[0]; if (!file) return;
                          try { update(key, "logo", await resizeImage(file)); } catch {}
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {biz.logo && (
                      <button onClick={() => update(key, "logo", null)} style={{ background: t.cardAlt, color: "#EF4444", border: `1px solid ${t.border}`, borderRadius: 8, padding: "7px 18px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                        Remove Logo
                      </button>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.6 }}>PNG, JPG, SVG · Max 240×240px<br />Resized &amp; compressed automatically</span>
                </div>
              </div>

            </div>
          </div>
        ))}

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={handleSave}
            style={{ background: status === "ok" ? "#16A34A" : "linear-gradient(135deg,#7C3AED,#A78BFA)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "background .3s" }}>
            {status === "ok" ? "✓ Saved" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Rebuild template props from a saved invoice ─────────────────────────────
function buildTplProps(inv, businesses) {
  const d   = inv.data || {};
  const biz = businesses[inv.bizKey] || DEFAULT_BUSINESSES[inv.bizKey] || {};
  const calcItemTotal = item => {
    const base = item.quantity * item.unitPrice;
    return Math.max(0, base - (item.discountType === "%" ? base * (item.discount / 100) : item.discount));
  };
  const items        = d.items || [];
  const subtotal     = items.reduce((s, i) => s + calcItemTotal(i), 0);
  const globalDiscAmt = d.globalDiscountType === "%" ? subtotal * ((d.globalDiscount || 0) / 100) : (d.globalDiscount || 0);
  const afterDiscount = Math.max(0, subtotal - globalDiscAmt);
  const taxAmt        = afterDiscount * ((d.taxRate || 0) / 100);
  const deliveryFee   = d.deliveryFee || 0;
  const grandTotal    = afterDiscount + taxAmt + (inv.bizKey === "babyhsu" ? deliveryFee : 0);
  return {
    template: d.template || "modern", biz, bizKey: inv.bizKey,
    client: d.client || { name: "", phone: "", email: "", address: "" },
    invoiceNum: inv.invoiceNum, invoiceDate: inv.invoiceDate, dueDate: d.dueDate || "",
    items, calcItemTotal, currency: inv.currency,
    subtotal, globalDiscount: d.globalDiscount || 0, globalDiscountType: d.globalDiscountType || "%",
    globalDiscAmt, taxRate: d.taxRate || 0, taxAmt, grandTotal,
    paymentMethod: d.paymentMethod || "", note: d.note || "",
    formatCurrency: a => fmt(a, inv.currency),
    layout: d.layout || LAYOUT_SECTIONS.map(s => ({ ...s, visible: true })),
    courseStartDate: d.courseStartDate || "", courseDuration: d.courseDuration || 1,
    courseDurationUnit: d.courseDurationUnit || "month", deposit: d.deposit || 0, deliveryFee,
  };
}

// ─── Saved Invoices Page ─────────────────────────────────────────────────────
function SavedPage({ businesses, onLoad, onNew, t }) {
  const [invoices,   setInvoices]   = useState(getSavedInvoices);
  const [previewInv, setPreviewInv] = useState(null);
  const printRef = useRef();

  const load = () => setInvoices(getSavedInvoices());
  const del  = (id) => { removeInvoice(id); setInvoices(prev => prev.filter(i => i.id !== id)); };

  const handleDownload = async (type, invoiceNum) => {
    const el = printRef.current; if (!el) return;
    if (!window.html2canvas) { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"; document.head.appendChild(s); await new Promise(r => s.onload = r); }
    const canvas = await window.html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#fff" });
    if (type === "image") { const a = document.createElement("a"); a.download = `${invoiceNum}.png`; a.href = canvas.toDataURL("image/png"); a.click(); }
    else {
      if (!window.jspdf) { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"; document.head.appendChild(s); await new Promise(r => s.onload = r); }
      const { jsPDF } = window.jspdf; const pdf = new jsPDF("p","mm","a4"); const w = pdf.internal.pageSize.getWidth();
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, w, (canvas.height*w)/canvas.width); pdf.save(`${invoiceNum}.pdf`);
    }
  };

  const card    = { background: t.card, borderRadius: 12, border: `1px solid ${t.border}`, boxShadow: t.shadowSm };
  const btnGrad = { background: "linear-gradient(135deg,#7C3AED,#A78BFA)", color: "#fff", border: "none", borderRadius: 7, padding: "6px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" };
  const btnOut  = { background: t.cardAlt, color: t.text, border: `1px solid ${t.border}`, borderRadius: 7, padding: "6px 12px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" };

  return (
    <div style={{ minHeight: "100vh", background: t.bg }}>
      {/* Top bar */}
      <div style={{ height: 52, background: t.card, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", padding: "0 24px", gap: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 15, color: t.text }}>Invoices</span>
        <span style={{ fontSize: 12, color: t.textMuted, background: t.cardAlt, border: `1px solid ${t.border}`, borderRadius: 20, padding: "2px 10px" }}>{invoices.length}</span>
        <div style={{ flex: 1 }} />
        <button onClick={load} style={{ ...btnOut, padding: "6px 14px" }}>↺ Refresh</button>
        <button onClick={onNew} style={{ ...btnGrad, padding: "7px 16px" }}>+ New Invoice</button>
      </div>

      {/* Invoice list */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: 24 }}>
        {invoices.length === 0 ? (
          <div style={{ ...card, textAlign: "center", padding: "56px 24px" }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.25 }}>≡</div>
            <div style={{ fontWeight: 600, fontSize: 16, color: t.text, marginBottom: 6 }}>No invoices yet</div>
            <div style={{ fontSize: 13, color: t.textSub, marginBottom: 20 }}>Generate an invoice and click "Save Invoice" to store it here</div>
            <button onClick={onNew} style={{ ...btnGrad, padding: "9px 20px", fontSize: 14 }}>Create Invoice</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {invoices.map(inv => {
              const biz = businesses[inv.bizKey] || DEFAULT_BUSINESSES[inv.bizKey] || {};
              return (
                <div key={inv.id} style={{ ...card, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: biz.logo ? t.cardAlt : `linear-gradient(135deg,${biz.color||"#7C3AED"},${biz.accent||"#A78BFA"})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 15, flexShrink: 0, overflow: "hidden", border: `1px solid ${t.border}` }}>
                    {biz.logo ? <img src={biz.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : (biz.shortName||biz.name||"?")[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: t.text }}>{inv.invoiceNum}</div>
                    <div style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>{biz.name} · {inv.clientName||"No client"} · {inv.invoiceDate}</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: biz.color||"#7C3AED", flexShrink: 0 }}>{fmt(inv.grandTotal, inv.currency)}</div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => setPreviewInv(inv)} style={{ ...btnOut }}>👁 Preview</button>
                    <button onClick={() => onLoad(inv)} style={{ ...btnGrad }}>Load</button>
                    <button onClick={() => del(inv.id)} style={{ ...btnOut, color: "#EF4444" }}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewInv && (() => {
        const props = buildTplProps(previewInv, businesses);
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
            onClick={e => { if (e.target === e.currentTarget) setPreviewInv(null); }}>
            <div style={{ background: t.bg, borderRadius: 16, width: "100%", maxWidth: 880, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.4)", overflow: "hidden" }}>
              <div style={{ height: 52, background: t.card, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", padding: "0 20px", gap: 10, flexShrink: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: t.text, flex: 1 }}>{previewInv.invoiceNum}</span>
                <button onClick={() => handleDownload("pdf",   previewInv.invoiceNum)} style={{ ...btnGrad, padding: "7px 16px", fontSize: 13 }}>↓ PDF</button>
                <button onClick={() => handleDownload("image", previewInv.invoiceNum)} style={{ ...btnOut,  padding: "7px 14px", fontSize: 13, marginLeft: 4 }}>↓ PNG</button>
                <button onClick={() => setPreviewInv(null)} style={{ ...btnOut, marginLeft: 4 }}>✕ Close</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 24, background: t.cardAlt }}>
                <div ref={printRef} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.1)", maxWidth: 800, margin: "0 auto" }}>
                  <InvoiceTemplate {...props} />
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Invoice Editor ──────────────────────────────────────────────────────────
function InvoiceEditor({ businesses, business: bizKey, onBack, loadedInvoice, t }) {
  const d   = loadedInvoice?.data;
  const biz = businesses[bizKey] || DEFAULT_BUSINESSES[bizKey];
  const printRef  = useRef();
  const dragIndex = useRef(null);

  const [invoiceNum,         setInvoiceNum]         = useState(d?.invoiceNum         || `INV-${String(Date.now()).slice(-6)}`);
  const [invoiceDate,        setInvoiceDate]        = useState(d?.invoiceDate        || new Date().toISOString().split("T")[0]);
  const [dueDate,            setDueDate]            = useState(d?.dueDate            || "");
  const [currency,           setCurrency]           = useState(d?.currency           || "MMK");
  const [template,           setTemplate]           = useState(d?.template || biz.defaultTemplate || "modern");
  const [showPreview,        setShowPreview]        = useState(false);
  const [layout,             setLayout]             = useState(d?.layout             || LAYOUT_SECTIONS.map(s => ({ ...s, visible: true })));
  const [client,             setClient]             = useState(d?.client             || { name: "", phone: "", email: "", address: "" });
  const [courseStartDate,    setCourseStartDate]    = useState(d?.courseStartDate    || "");
  const [courseDuration,     setCourseDuration]     = useState(d?.courseDuration     || 1);
  const [courseDurationUnit, setCourseDurationUnit] = useState(d?.courseDurationUnit || "month");
  const [deposit,            setDeposit]            = useState(d?.deposit            ?? 0);
  const [deliveryFee,        setDeliveryFee]        = useState(d?.deliveryFee        ?? 0);
  const [items,              setItems]              = useState(d?.items              || [defaultItem()]);
  const [taxRate,            setTaxRate]            = useState(d?.taxRate            ?? 0);
  const [globalDiscount,     setGlobalDiscount]     = useState(d?.globalDiscount     ?? 0);
  const [globalDiscountType, setGlobalDiscountType] = useState(d?.globalDiscountType || "%");
  const [paymentMethod, setPaymentMethod] = useState(d?.paymentMethod || "");
  const [note,          setNote]          = useState(d?.note          || "");
  const [saveStatus,         setSaveStatus]         = useState(null); // null|"saving"|"ok"|"error"
  const [dragOver,           setDragOver]           = useState(null);

  const calcItemTotal = item => { const base = item.quantity * item.unitPrice; return Math.max(0, base - (item.discountType === "%" ? base*(item.discount/100) : item.discount)); };
  const subtotal      = items.reduce((s,i) => s + calcItemTotal(i), 0);
  const globalDiscAmt = globalDiscountType === "%" ? subtotal*(globalDiscount/100) : globalDiscount;
  const afterDiscount = Math.max(0, subtotal - globalDiscAmt);
  const taxAmt        = afterDiscount * (taxRate/100);
  const grandTotal    = afterDiscount + taxAmt + (bizKey === "babyhsu" ? deliveryFee : 0);

  const updateItem = (id, field, val) => setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: val } : i));
  const addItem    = () => setItems(prev => [...prev, defaultItem()]);
  const removeItem = id => setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev);

  const handleSave = async () => {
    upsertInvoice({
      id:          loadedInvoice?.id || `inv-${Date.now()}`,
      bizKey,
      invoiceNum,
      invoiceDate,
      clientName:  client.name,
      grandTotal,
      currency,
      savedAt:     new Date().toISOString(),
      data:        { invoiceNum, invoiceDate, dueDate, currency, template, client, courseStartDate, courseDuration, courseDurationUnit, deposit, deliveryFee, items, taxRate, globalDiscount, globalDiscountType, paymentMethod, note, layout },
    });
    setSaveStatus("ok");
    setTimeout(() => setSaveStatus(null), 2200);
  };

  const handleDownload = async type => {
    const el = printRef.current; if (!el) return;
    if (!window.html2canvas) { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"; document.head.appendChild(s); await new Promise(r => s.onload = r); }
    const canvas = await window.html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#fff" });
    if (type === "image") { const a = document.createElement("a"); a.download = `${invoiceNum}.png`; a.href = canvas.toDataURL("image/png"); a.click(); }
    else {
      if (!window.jspdf) { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"; document.head.appendChild(s); await new Promise(r => s.onload = r); }
      const { jsPDF } = window.jspdf; const pdf = new jsPDF("p","mm","a4"); const w = pdf.internal.pageSize.getWidth();
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, w, (canvas.height*w)/canvas.width); pdf.save(`${invoiceNum}.pdf`);
    }
  };

  const inp      = { width: "100%", padding: "9px 12px", border: `1px solid ${t.inputBorder}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", background: t.inputBg, color: t.text, boxSizing: "border-box", transition: "border-color .15s" };
  const lbl      = { display: "block", fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" };
  const sec      = { background: t.card, borderRadius: 12, padding: 20, marginBottom: 14, border: `1px solid ${t.border}`, boxShadow: t.shadowSm };
  const secTitle = { fontSize: 11, fontWeight: 600, color: t.textMuted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 16 };
  const btnP     = { background: `linear-gradient(135deg,${biz.color},${biz.accent})`, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
  const btnS     = { background: t.cardAlt, color: t.text, border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" };

  const saveBtnStyle = { ...btnP, background: saveStatus === "ok" ? "#16A34A" : saveStatus === "error" ? "#DC2626" : `linear-gradient(135deg,${biz.color},${biz.accent})` };
  const saveBtnLabel = saveStatus === "saving" ? "Saving…" : saveStatus === "ok" ? "✓ Saved" : saveStatus === "error" ? "✕ Failed" : "Save";

  const tplProps = { template, biz, bizKey, client, invoiceNum, invoiceDate, dueDate, items, calcItemTotal, currency, subtotal, globalDiscount, globalDiscountType, globalDiscAmt, taxRate, taxAmt, grandTotal, paymentMethod, note, formatCurrency: a => fmt(a, currency), layout, courseStartDate, courseDuration, courseDurationUnit, deposit, deliveryFee };

  return (
    <div style={{ minHeight: "100vh", background: t.bg }}>
      {/* Topbar */}
      <div style={{ height: 52, background: t.card, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", padding: "0 20px", gap: 10, position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={onBack} style={{ ...btnS, padding: "6px 14px" }}>←</button>
        <div style={{ width: 1, height: 20, background: t.border }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: biz.logo ? t.cardAlt : `linear-gradient(135deg,${biz.color},${biz.accent})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, overflow: "hidden", border: `1px solid ${t.border}` }}>
            {biz.logo ? <img src={biz.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : (biz.shortName||biz.name)[0]}
          </div>
          <span style={{ fontWeight: 500, fontSize: 14, color: t.text }}>{biz.name}</span>
          <span style={{ color: t.textMuted }}>›</span>
          <span style={{ fontSize: 13, color: t.textSub }}>New Invoice</span>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={handleSave} disabled={saveStatus === "saving"} style={saveBtnStyle}>{saveBtnLabel}</button>
        <button onClick={() => handleDownload("pdf")} style={{ ...btnS, marginLeft: 2 }}>↓ PDF</button>
      </div>



      <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 20px 40px" }}>

        {/* Invoice Settings */}
        <div style={sec}>
          <div style={secTitle}>Invoice Settings</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12 }}>
            <div><label style={lbl}>Invoice #</label><input value={invoiceNum} onChange={e => setInvoiceNum(e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Date</label><input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Due Date</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Currency</label><select value={currency} onChange={e => setCurrency(e.target.value)} style={inp}>{CURRENCIES.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label style={lbl}>Template</label><select value={template} onChange={e => setTemplate(e.target.value)} style={inp}>{Object.entries(TEMPLATES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          </div>
        </div>

        {/* Layout */}
        <div style={{ ...sec, background: "#0D1117", border: "1px solid #21262D" }}>
          <div style={{ ...secTitle, color: "#484F58" }}>Invoice Layout</div>
          <div style={{ fontSize: 12, color: "#484F58", marginBottom: 14, marginTop: -10 }}>Drag to reorder · toggle to show/hide</div>
          {layout.map((section, idx) => (
            <div key={section.id} draggable
              onDragStart={() => { dragIndex.current = idx; }}
              onDragOver={e => { e.preventDefault(); setDragOver(idx); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => { setDragOver(null); const from = dragIndex.current; if (from === null || from === idx) return; const next = [...layout]; const [m] = next.splice(from,1); next.splice(idx,0,m); dragIndex.current = null; setLayout(next); }}
              onDragEnd={() => { dragIndex.current = null; setDragOver(null); }}
              style={{ display: "flex", alignItems: "center", gap: 10, background: dragOver === idx ? "#161B22" : "#0D1117", border: `1px solid ${dragOver === idx ? biz.color : "#21262D"}`, borderRadius: 8, padding: "10px 12px", marginBottom: 6, cursor: "grab", userSelect: "none", opacity: section.visible ? 1 : 0.35, transition: "all .15s" }}>
              <span style={{ color: "#30363D", fontSize: 14 }}>⠿</span>
              <span style={{ fontSize: 14 }}>{section.icon}</span>
              <span style={{ flex: 1, fontSize: 13, color: "#8B949E" }}>{section.label}</span>
              <button onClick={() => setLayout(prev => prev.map((s,i) => i===idx ? {...s,visible:!s.visible} : s))}
                style={{ background: section.visible ? biz.color : "#21262D", border: "none", borderRadius: 20, width: 40, height: 22, cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
                <span style={{ position: "absolute", top: 1, left: section.visible ? 20 : 1, width: 20, height: 20, background: "#fff", borderRadius: "50%", transition: "left .2s", display: "block" }} />
              </button>
            </div>
          ))}
        </div>

        {/* Client */}
        <div style={sec}>
          <div style={secTitle}>Client / Bill To</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
            <div><label style={lbl}>Name</label>   <input value={client.name}    onChange={e => setClient(p=>({...p,name:   e.target.value}))} style={inp} placeholder="Client name" /></div>
            <div><label style={lbl}>Phone</label>  <input value={client.phone}   onChange={e => setClient(p=>({...p,phone:  e.target.value}))} style={inp} placeholder="Phone" /></div>
            <div><label style={lbl}>Email</label>  <input value={client.email}   onChange={e => setClient(p=>({...p,email:  e.target.value}))} style={inp} placeholder="Email" /></div>
            <div><label style={lbl}>Address</label><input value={client.address} onChange={e => setClient(p=>({...p,address:e.target.value}))} style={inp} placeholder="Address" /></div>
          </div>
        </div>

        {/* Course Details — Dream World only */}
        {bizKey === "dreamworld" && (
          <div style={sec}>
            <div style={secTitle}>Course Details</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={lbl}>Start Date of Course</label>
                <input type="date" value={courseStartDate} onChange={e => setCourseStartDate(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Deposit Paid</label>
                <NumInput min={0} value={deposit} onChange={v => setDeposit(v)} style={inp} />
                {deposit > 0 && grandTotal > 0 && (
                  <div style={{ marginTop: 6, fontSize: 12, color: "#EF4444", fontWeight: 500 }}>
                    Balance due: {fmt(Math.max(0, grandTotal - deposit), currency)}
                  </div>
                )}
              </div>
              <div>
                <label style={lbl}>Duration</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <NumInput min={1} value={courseDuration} onChange={v => setCourseDuration(v)} style={{ ...inp, width: "100px" }} />
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {["day","week","month","year"].map(u => (
                      <button key={u} type="button" onClick={() => setCourseDurationUnit(u)} style={{
                        padding: "6px 16px", borderRadius: 20,
                        border: `1px solid ${courseDurationUnit === u ? biz.color : t.inputBorder}`,
                        background: courseDurationUnit === u ? biz.color : "transparent",
                        color: courseDurationUnit === u ? "#fff" : t.text,
                        cursor: "pointer", fontFamily: "inherit", fontSize: 13,
                        fontWeight: courseDurationUnit === u ? 600 : 400, transition: "all .15s",
                      }}>
                        {u.charAt(0).toUpperCase() + u.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Items */}
        <div style={sec}>
          <div style={secTitle}>Items / Services</div>
          {items.map((item, idx) => (
            <div key={item.id} style={{ background: t.cardAlt, borderRadius: 9, padding: 14, marginBottom: 10, border: `1px solid ${t.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: t.textMuted }}>Item {idx+1}</span>
                <button onClick={() => removeItem(item.id)} style={{ background: "transparent", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 12, padding: "3px 8px", borderRadius: 6, fontFamily: "inherit" }}>Remove</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10 }}>
                <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Description</label><input value={item.description} onChange={e => updateItem(item.id,"description",e.target.value)} style={inp} placeholder="Item or service" /></div>
                <div><label style={lbl}>Qty</label>        <NumInput min={0} value={item.quantity}  onChange={v => updateItem(item.id,"quantity", v)} style={inp} /></div>
                <div><label style={lbl}>Unit Price</label> <NumInput min={0} value={item.unitPrice} onChange={v => updateItem(item.id,"unitPrice",v)} style={inp} /></div>
                <div>
                  <label style={lbl}>Discount</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    <NumInput min={0} value={item.discount} onChange={v => updateItem(item.id,"discount",v)} style={{ ...inp, flex: 1 }} />
                    <select value={item.discountType} onChange={e => updateItem(item.id,"discountType",e.target.value)} style={{ ...inp, width: 52, flex: "none", padding: "9px 4px" }}><option value="%">%</option><option value="flat">Flat</option></select>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Total</label>
                  <div style={{ padding: "9px 12px", background: lightenColor(biz.color), borderRadius: 8, fontWeight: 600, fontSize: 14, color: biz.color }}>{fmt(calcItemTotal(item), currency)}</div>
                </div>
              </div>
            </div>
          ))}
          <button onClick={addItem} style={{ width: "100%", padding: "9px", background: "transparent", color: biz.color, border: `1px dashed ${biz.color}60`, borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 500 }}>+ Add Item</button>
        </div>

        {/* Summary */}
        <div style={sec}>
          <div style={secTitle}>Summary</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={lbl}>Discount</label>
              <div style={{ display: "flex", gap: 4 }}>
                <NumInput min={0} value={globalDiscount} onChange={v => setGlobalDiscount(v)} style={{ ...inp, flex: 1 }} />
                <select value={globalDiscountType} onChange={e => setGlobalDiscountType(e.target.value)} style={{ ...inp, width: 52, flex: "none", padding: "9px 4px" }}><option value="%">%</option><option value="flat">Flat</option></select>
              </div>
            </div>
            <div><label style={lbl}>Tax Rate (%)</label><NumInput min={0} value={taxRate} onChange={v => setTaxRate(v)} style={inp} /></div>
            {bizKey === "babyhsu" && (
              <div>
                <label style={lbl}>Delivery Fee <span style={{ color: t.textMuted, fontWeight: 400 }}>(optional)</span></label>
                <NumInput min={0} value={deliveryFee} onChange={v => setDeliveryFee(v)} style={inp} />
              </div>
            )}
          </div>
          <div style={{ background: t.cardAlt, borderRadius: 9, padding: "12px 16px", border: `1px solid ${t.border}` }}>
            {[["Subtotal",subtotal],...(globalDiscAmt>0?[["Discount",-globalDiscAmt]]:[]),...(taxAmt>0?[[`Tax (${taxRate}%)`,taxAmt]]:[]),...(deliveryFee>0&&bizKey==="babyhsu"?[["Delivery Fee",deliveryFee]]:[])].map(([label,val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, color: t.textSub }}>
                <span>{label}</span>
                <span style={{ fontWeight: 500, color: val<0?"#EF4444":t.text }}>{val<0?"− ":""}{fmt(Math.abs(val),currency)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", marginTop: 8, borderTop: `1px solid ${t.border}`, fontSize: 16, fontWeight: 700, color: biz.color }}>
              <span>Grand Total</span><span>{fmt(grandTotal,currency)}</span>
            </div>
          </div>
        </div>

        {/* Payment & Notes */}
        <div style={sec}>
          <div style={secTitle}>Payment & Notes</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
            <div><label style={lbl}>Payment Method</label><select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={inp}><option value="">Select method</option>{PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}</select></div>
            <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Notes / Terms</label><textarea value={note} onChange={e => setNote(e.target.value)} rows={3} style={{ ...inp, resize: "vertical" }} placeholder="Thank you for your business!" /></div>
          </div>
        </div>

        {/* Bottom actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setShowPreview(true)}    style={{ ...btnP,  flex: 1, minWidth: 120 }}>👁 Preview Invoice</button>
          <button onClick={handleSave} disabled={saveStatus==="saving"} style={{ ...saveBtnStyle, flex: 1, minWidth: 120 }}>{saveStatus==="saving"?"Saving…":saveStatus==="ok"?"✓ Saved":saveStatus==="error"?"✕ Failed":"Save Invoice"}</button>
          <button onClick={() => handleDownload("pdf")}   style={{ ...btnS,  flex: 1, minWidth: 120 }}>Download PDF</button>
          <button onClick={() => handleDownload("image")} style={{ ...btnS,  flex: 1, minWidth: 120 }}>Download PNG</button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowPreview(false); }}>
          <div style={{ background: t.bg, borderRadius: 16, width: "100%", maxWidth: 880, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.4)", overflow: "hidden" }}>
            {/* Modal topbar */}
            <div style={{ height: 52, background: t.card, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", padding: "0 20px", gap: 10, flexShrink: 0 }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: t.text, flex: 1 }}>Invoice Preview</span>
              <button onClick={() => handleDownload("pdf")}   style={btnP}>↓ PDF</button>
              <button onClick={() => handleDownload("image")} style={{ ...btnS, marginLeft: 4 }}>↓ PNG</button>
              <button onClick={() => setShowPreview(false)} style={{ ...btnS, marginLeft: 4 }}>✕ Close</button>
            </div>
            {/* Invoice content */}
            <div style={{ flex: 1, overflowY: "auto", padding: 24, background: t.cardAlt }}>
              <div ref={printRef} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.1)", maxWidth: 800, margin: "0 auto" }}>
                <InvoiceTemplate {...tplProps} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Invoice Template Renderer ───────────────────────────────────────────────
function InvoiceTemplate({ template, biz, bizKey, client, invoiceNum, invoiceDate, dueDate, items, calcItemTotal, currency, subtotal, globalDiscAmt, taxRate, taxAmt, grandTotal, paymentMethod, note, formatCurrency, layout, courseStartDate, courseDuration, courseDurationUnit, deposit, deliveryFee }) {
  const color  = biz.color  || DEFAULT_BUSINESSES[bizKey]?.color  || "#7C3AED";
  const accent = biz.accent || DEFAULT_BUSINESSES[bizKey]?.accent || "#A78BFA";
  const base   = { fontFamily: "'Inter','Segoe UI',sans-serif", background: "#fff", color: "#1C2128", padding: "clamp(24px,5vw,48px)", fontSize: 14, lineHeight: 1.6, minHeight: 600 };

  const headerModern = (
    <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"space-between", alignItems:"flex-start", gap:20, marginBottom:36 }}>
      <div>
        <div style={{ width:90, height:90, borderRadius:14, background:biz.logo?"#F6F8FA":`linear-gradient(135deg,${color},${accent})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, color:"#fff", fontWeight:700, fontFamily:"'Playfair Display',serif", marginBottom:12, overflow:"hidden", border:biz.logo?"1px solid #E4E8EF":"none" }}>
          {biz.logo ? <img src={biz.logo} alt={biz.name} style={{ width:"100%", height:"100%", objectFit:"contain" }} /> : (biz.name?.[0]||"?")}
        </div>
        <div style={{ fontWeight:700, fontSize:16 }}>{biz.name}</div>
        {biz.phone&&<div style={{ color:"#57606A", fontSize:12, marginTop:3 }}>{biz.phone}</div>}
        {biz.email&&<div style={{ color:"#57606A", fontSize:12 }}>{biz.email}</div>}
        {biz.address&&<div style={{ color:"#57606A", fontSize:12 }}>{biz.address}</div>}
      </div>
      <div style={{ textAlign:"right" }}>
        <div style={{ fontSize:32, fontWeight:700, color, fontFamily:"'Playfair Display',serif", letterSpacing:-1 }}>INVOICE</div>
        <div style={{ color:"#57606A", fontSize:12, marginTop:8, lineHeight:1.8 }}>
          <div><strong style={{ color:"#1C2128" }}>{invoiceNum}</strong></div>
          <div>Issued {invoiceDate}</div>
          {dueDate&&<div>Due {dueDate}</div>}
        </div>
      </div>
    </div>
  );
  const headerClassic = (
    <div style={{ textAlign:"center", borderBottom:`2px solid ${color}`, paddingBottom:20, marginBottom:28 }}>
      {biz.logo && <div style={{ display:"flex", justifyContent:"center", marginBottom:12 }}><img src={biz.logo} alt={biz.name} style={{ height:80, objectFit:"contain" }} /></div>}
      <div style={{ fontWeight:700, fontSize:24, fontFamily:"'Playfair Display',serif", color }}>{biz.name}</div>
      {biz.tagline&&<div style={{ color:"#57606A", fontStyle:"italic", fontSize:13, marginTop:4 }}>{biz.tagline}</div>}
      <div style={{ color:"#57606A", fontSize:12, marginTop:6 }}>{[biz.phone,biz.email,biz.address].filter(Boolean).join("  ·  ")}</div>
      <div style={{ marginTop:16, fontSize:20, fontWeight:700, letterSpacing:4, color:"#1C2128" }}>INVOICE</div>
      <div style={{ color:"#57606A", fontSize:12, marginTop:4 }}>{invoiceNum} · {invoiceDate}{dueDate?` · Due ${dueDate}`:""}</div>
    </div>
  );
  const headerMinimal = (
    <div style={{ marginBottom:32 }}>
      <div style={{ fontSize:10, fontWeight:600, color:"#9BA8B6", letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>Invoice</div>
      <div style={{ fontSize:22, fontWeight:700, color:"#1C2128", marginBottom:20 }}>{invoiceNum}</div>
      <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"space-between", gap:16 }}>
        <div>
          {biz.logo && <img src={biz.logo} alt={biz.name} style={{ height:60, objectFit:"contain", marginBottom:8, display:"block" }} />}
          <div style={{ fontWeight:600 }}>{biz.name}</div>
          <div style={{ color:"#57606A", fontSize:12 }}>{[biz.phone,biz.email].filter(Boolean).join(" · ")}</div>
          {biz.address&&<div style={{ color:"#57606A",fontSize:12 }}>{biz.address}</div>}
        </div>
        <div style={{ color:"#57606A", fontSize:12, textAlign:"right" }}><div>{invoiceDate}</div>{dueDate&&<div>Due: {dueDate}</div>}</div>
      </div>
    </div>
  );
  const headerBold = (
    <div style={{ background:`linear-gradient(135deg,${color},${accent})`, margin:"-clamp(24px,5vw,48px)", marginBottom:28, padding:"clamp(24px,5vw,40px)", color:"#fff" }}>
      <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"space-between", alignItems:"flex-end", gap:16 }}>
        <div>
          {biz.logo && <img src={biz.logo} alt={biz.name} style={{ height:70, objectFit:"contain", marginBottom:10, display:"block", filter:"brightness(0) invert(1)", opacity:.9 }} />}
          <div style={{ fontSize:"clamp(22px,5vw,30px)", fontWeight:700, fontFamily:"'Playfair Display',serif" }}>{biz.name}</div>
          <div style={{ opacity:.8, fontSize:12, marginTop:6 }}>{[biz.phone,biz.email,biz.address].filter(Boolean).join("  ·  ")}</div>
        </div>
        <div style={{ textAlign:"right" }}><div style={{ fontSize:28, fontWeight:700, letterSpacing:-1 }}>INVOICE</div><div style={{ opacity:.8, fontSize:12 }}>{invoiceNum} · {invoiceDate}</div>{dueDate&&<div style={{ opacity:.8, fontSize:12 }}>Due: {dueDate}</div>}</div>
      </div>
    </div>
  );

  const headers = { modern:headerModern, classic:headerClassic, minimal:headerMinimal, bold:headerBold };

  const clientSection = client.name ? (
    <div style={{ background:"#F6F8FA", borderRadius:10, padding:14, marginBottom:24, border:"1px solid #E4E8EF" }}>
      <div style={{ fontSize:10, fontWeight:600, color:"#9BA8B6", letterSpacing:1.5, marginBottom:8, textTransform:"uppercase" }}>Bill To</div>
      <div style={{ fontWeight:600 }}>{client.name}</div>
      {client.phone&&<div style={{ color:"#57606A", fontSize:12 }}>{client.phone}</div>}
      {client.email&&<div style={{ color:"#57606A", fontSize:12 }}>{client.email}</div>}
      {client.address&&<div style={{ color:"#57606A", fontSize:12 }}>{client.address}</div>}
    </div>
  ) : null;

  const itemsTable = (
    <div style={{ marginBottom:24, overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
        <thead><tr style={{ borderBottom:`2px solid ${color}` }}>{["#","Description","Qty","Price","Discount","Total"].map((h,i)=><th key={h} style={{ padding:"10px 8px", textAlign:i>1?"right":"left", fontWeight:600, color:"#57606A", fontSize:11, letterSpacing:.5, textTransform:"uppercase" }}>{h}</th>)}</tr></thead>
        <tbody>
          {items.map((item,idx)=>(
            <tr key={item.id} style={{ borderBottom:"1px solid #E4E8EF" }}>
              <td style={{ padding:"10px 8px", color:"#9BA8B6" }}>{idx+1}</td>
              <td style={{ padding:"10px 8px", fontWeight:500 }}>{item.description||"—"}</td>
              <td style={{ padding:"10px 8px", textAlign:"right" }}>{item.quantity}</td>
              <td style={{ padding:"10px 8px", textAlign:"right" }}>{formatCurrency(item.unitPrice)}</td>
              <td style={{ padding:"10px 8px", textAlign:"right", color:item.discount>0?"#EF4444":"#9BA8B6" }}>{item.discount>0?`${item.discount}${item.discountType==="%"?"%":` ${currency}`}`:"—"}</td>
              <td style={{ padding:"10px 8px", textAlign:"right", fontWeight:600 }}>{formatCurrency(calcItemTotal(item))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const summarySection = (
    <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:24 }}>
      <div style={{ width:"100%", maxWidth:280 }}>
        {[
          ["Subtotal", formatCurrency(subtotal)],
          ...(globalDiscAmt > 0 ? [["Discount", `− ${formatCurrency(globalDiscAmt)}`]] : []),
          ...(taxAmt > 0       ? [[`Tax (${taxRate}%)`, formatCurrency(taxAmt)]]       : []),
          ...(deliveryFee > 0  ? [["Delivery Fee", formatCurrency(deliveryFee)]]        : []),
        ].map(([l, v]) => (
          <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:13, color:"#57606A" }}><span>{l}</span><span style={{ fontWeight:500 }}>{v}</span></div>
        ))}
        <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 0 0", marginTop:8, borderTop:`2px solid ${color}`, fontSize:18, fontWeight:700, color }}><span>Total</span><span>{formatCurrency(grandTotal)}</span></div>
        {deposit > 0 && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0 0", marginTop:6, borderTop:"1px dashed #E4E8EF", fontSize:14, color:"#57606A" }}>
              <span>Deposit Paid</span>
              <span style={{ fontWeight:600, color:"#16A34A" }}>− {formatCurrency(deposit)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0 0", fontSize:16, fontWeight:700, color:"#DC2626" }}>
              <span>Balance Due</span>
              <span>{formatCurrency(Math.max(0, grandTotal - deposit))}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const footer = (
    <div style={{ marginTop:16 }}>
      {paymentMethod&&<div style={{ background:"#F6F8FA", borderRadius:9, padding:12, marginBottom:10, border:"1px solid #E4E8EF" }}><div style={{ fontSize:10, fontWeight:600, color:"#9BA8B6", letterSpacing:1.5, marginBottom:4, textTransform:"uppercase" }}>Payment</div><div style={{ fontWeight:600 }}>{paymentMethod}</div></div>}
      {note&&<div style={{ background:"#F6F8FA", borderRadius:9, padding:12, border:"1px solid #E4E8EF" }}><div style={{ fontSize:10, fontWeight:600, color:"#9BA8B6", letterSpacing:1.5, marginBottom:4, textTransform:"uppercase" }}>Notes</div><div style={{ color:"#57606A", fontSize:12, whiteSpace:"pre-wrap" }}>{note}</div></div>}
    </div>
  );

  const unitLabel  = (n, u) => `${n} ${u.charAt(0).toUpperCase() + u.slice(1)}${n > 1 ? "s" : ""}`;
  const fmtDate    = (iso) => { if (!iso) return ""; const [y,m,d] = iso.split("-"); const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m,10)-1]; return `${d} ${mon} ${y}`; };

  const courseSection = bizKey === "dreamworld" && courseStartDate ? (
    <div style={{ background:"#F6F8FA", borderRadius:10, padding:14, marginBottom:24, border:"1px solid #E4E8EF" }}>
      <div style={{ fontSize:10, fontWeight:600, color:"#9BA8B6", letterSpacing:1.5, marginBottom:10, textTransform:"uppercase" }}>Course Details</div>
      <div style={{ display:"flex", gap:32, flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:11, color:"#57606A", marginBottom:2 }}>Start Date</div>
          <div style={{ fontWeight:600, fontSize:14 }}>{fmtDate(courseStartDate)}</div>
        </div>
        {courseDuration > 0 && (
          <div>
            <div style={{ fontSize:11, color:"#57606A", marginBottom:2 }}>Duration</div>
            <div style={{ fontWeight:600, fontSize:14 }}>{unitLabel(courseDuration, courseDurationUnit)}</div>
          </div>
        )}
      </div>
    </div>
  ) : null;

  const sectionMap = { header:headers[template]||headers.modern, client:clientSection, items:itemsTable, summary:summarySection, payment:footer };
  return (
    <div style={base}>
      {layout.filter(s=>s.visible).map(s=>(
        <Fragment key={s.id}>
          {sectionMap[s.id]}
          {s.id === "client" && courseSection}
        </Fragment>
      ))}
    </div>
  );
}
