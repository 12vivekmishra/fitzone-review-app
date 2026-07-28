import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import agencyLogo from "./assets/logoo4.png";

// ═══════════════════════════════════════════════════════════════════════════
// REVIEW TEMPLATE ENGINE — organic Hinglish, sentence-part combinator
// + Supabase-based repeat prevention (per location, across all devices)
// ═══════════════════════════════════════════════════════════════════════════
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const HISTORY_LIMIT = 40; // how many recent reviews per location we check against

async function getHistory(locationId) {
  try {
    const { data, error } = await supabase
      .from("review_history")
      .select("review_text")
      .eq("location_id", String(locationId))
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT);
    if (error) throw error;
    return data.map(row => row.review_text);
  } catch {
    return []; // fail open — never block a customer from generating a review
  }
}

async function saveToHistory(locationId, reviews) {
  try {
    const rows = reviews.map(review_text => ({ location_id: String(locationId), review_text }));
    await supabase.from("review_history").insert(rows);
  } catch {} // don't let a save failure block the UI
}

const CONFIG_ID = "default"; // one row per Supabase project — fine since each client gets their own project

async function loadRemoteConfig() {
  try {
    const { data, error } = await supabase
      .from("app_config")
      .select("data")
      .eq("id", CONFIG_ID)
      .single();
    if (error || !data) return null;
    return data.data;
  } catch {
    return null; // fall back to DEFAULT_CONFIG if Supabase is unreachable
  }
}

async function saveRemoteConfig(config) {
  try {
    await supabase.from("app_config").upsert({ id: CONFIG_ID, data: config, updated_at: new Date().toISOString() });
    return true;
  } catch {
    return false;
  }
}

// Full organic Hinglish review pool, categorized by rating.
// These are complete, natural reviews (not part-combined) because
// authentic code-mixing doesn't combine cleanly from fragments —
// each is a whole, human-sounding sentence with variation built in.

const REVIEW_POOL = {
  5: [
    (n, h, area) => `First time visit kiya ${n} mein. ${h[0] || "Trainers"} was awesome and the whole vibe is so motivating 😁 Sab kuch bohot sahi hai, will come again with friends 😁😁😁`,
    (n, h, area) => `Starting mein hi bohot supportive ${h[0] || "trainers"} mile ${n} mein. Best gym worth joining!`,
    (n, h, area) => `Excellent ${h[0] || "equipment"} 💪 sab kuch bilkul top notch tha, definitely the best gym${area ? ` in ${area}` : " around here"}.`,
    (n, h, area) => `We are new to this area par join karne baad humne ${n} try kiya... to try ${h[0] || "their group classes"} which was very energetic and fun, everyone must join their morning batch. Trainers bhi bahut ache hain with proper form correction...`,
    (n, h, area) => `Highly recommended un logo ke liye jo ${area ? `${area} mein` : "yahan"} ek clean aur well-equipped gym dhoondh rahe hain with good ${h[0] || "equipment"}, great ${h[1] || "trainers"}, and real results.`,
    (n, h, area) => `I love the way ${n} operate karta hai aur yahan ke trainers bohot friendly aur helpful nature ke hain. Equipment bhi top class hai.. 3 mahine mein hi results dikhne lage..`,
    (n, h, area) => `Mind blowing ${h[0] || "trainers"}, flexible timings aur bohot hi well maintained equipment. ${n} is definitely a must join${area ? ` if you're in ${area}` : ""}!`,
    (n, h, area) => `Humne yahan apna fitness journey start ki thi, ${h[0] || "trainers"} was super supportive aur cleanliness bhi top notch.. genuinely happy with progress 💪`,
    (n, h, area) => `${n} ka ambience ekdum motivating hai... Results dikhte hain agar consistent raho, definitely coming back daily.`,
    (n, h, area) => `Bhai seriously ${n} ne game change kar diya! ${h[0] ? `${h[0]} was on point 🔥` : "Sab kuch on point tha 🔥"} — must join if aap fitness serious lete ho.`,
    (n, h, area) => `${n} is honestly one of the best gyms${area ? ` in ${area}` : ""} I've joined in a long time. Trainers really push you aur ${h[0] || "equipment quality"} consistently excellent hai.`,
    (n, h, area) => `Joined with a friend at ${n} aur dono ko bahut pasand aya. ${h[0] || "Cleanliness"} lajawab hai, definitely a long term membership spot for us.`,
    (n, h, area) => `Bahut acha gym hai, ${h[0] || "trainers"} helpful hain 💪 Highly recommend ${n}!`,
    (n, h, area) => `${n} top hai, ${h[0] || "equipment"} bhi acha, recommend karunga sabko 👍`,
    (n, h, area) => `Loving it at ${n}! ${h[0] || "Trainers"} bahut ache hain 🔥`,
    (n, h, area) => `Pichle 2 mahine se aa raha hoon ${n} mein aur ${h[0] || "trainers"} ne kaafi difference bana diya hai. Results genuinely dikh rahe hain, bohot khush hoon.`,
    (n, h, area) => `Just completed 3 months at ${n} aur honestly ${h[0] || "the whole setup"} exceeded expectations. Consistent training aur ${h[1] || "good guidance"} se real progress hua hai.`,
  ],
  4: [
    (n, h, area) => `Really enjoyed joining ${n}! ${h[0] || "Trainers"} accha guide karte hain aur poore gym ka energy achi hai. Thoda crowd rehta hai peak hours mein but totally worth it.`,
    (n, h, area) => `${n} is a solid gym${area ? ` in ${area}` : ""}. Loved the ${h[0] || "equipment"} aur ${h[1] || "trainers"} bhi kaafi acha hai. Good experience overall!`,
    (n, h, area) => `${n} is definitely worth joining! ${h[0] || "Equipment"} quality really good hai aur gym ka vibe bhi nice hai. Membership fair hai.`,
    (n, h, area) => `Setup is achha... par thoda improvement ho sakta hai timings mein... par overall ${n} ka experience good raha 👍 recommend karunga.`,
    (n, h, area) => `${n} mein join kiya aur quite impressed hua. ${h[0] || "Equipment"} really nice hai — great for serious workout with proper guidance.`,
    (n, h, area) => `Trainers bahut friendly the aur ${h[0] || "equipment"} bhi decent tha. Thoda sa rush tha but overall achha laga.`,
    (n, h, area) => `${n} ek achi gym hai${area ? ` ${area} mein` : ""} serious training ke liye. ${h[0] || "Cleanliness"} pleasant hai, will continue membership.`,
    (n, h, area) => `Decent gym, ${h[0] || "trainers"} helpful hain. Recommend karunga 👍`,
    (n, h, area) => `Been going to ${n} for about a month now, ${h[0] || "the experience"} has been good so far. A few things could be better but overall satisfied.`,
  ],
  3: [
    (n, h, area) => `Setup is okay... I would say... ${h[0] ? `${h[0]} thoda average tha` : "kuch cheezein average thi"}... didn't liked it much... par cleanliness achi hai... bas thoda improvement chahiye trainers mein... Overall experience theek thaak tha 👍`,
    (n, h, area) => `${n} is decent overall. ${h[0] || "Equipment"} was okay but nothing too extraordinary. Trainer attention thoda kam tha but staff polite the.`,
    (n, h, area) => `Mixed feelings honestly ${n} ke baare mein. ${h[0] || "Cleanliness"} lovely hai but ${h[1] || "equipment"} expectations match nahi kiya. Has potential though.`,
    (n, h, area) => `Average experience raha ${n} mein. Kuch cheezein achi thi kuch mein improvement chahiye. Try kar sakte hain once.`,
    (n, h, area) => `Theek thaak hai, ${h[0] || "equipment"} mein improvement ho sakta hai.`,
  ],
  2: [
    (n, h, area) => `Bit disappointed with ${n} honestly. ${h[0] || "Equipment"} fees ke hisaab se achha nahi tha aur maintenance bhi kam thi. Shayad off phase tha unka.`,
    (n, h, area) => `Expected zyada from ${n}. ${h[0] || "Trainers"} below average the aur ${h[1] || "equipment"} sirf theek thaak. Dubara join karna thoda sochna padega.`,
    (n, h, area) => `${n} was not what I expected. ${h[0] || "Equipment"} outdated tha aur guidance bhi rushed feel hui. Consistency pe kaam karna padega.`,
  ],
  1: [
    (n, h, area) => `Really bad experience ${n} mein. ${h[0] || "Equipment"} bilkul maintain nahi tha aur trainers bhi rude the. Would not recommend honestly.`,
    (n, h, area) => `${n} was a complete waste of money. ${h[0] || "Equipment"} broken aur unhygienic tha, membership cancel karne mein bhi bahut wait karna pada. Won't be going back.`,
  ],
};


async function generateReviews(locationId, name, rating, picks, area) {
  const history = await getHistory(locationId);
  const pool = REVIEW_POOL[rating] || REVIEW_POOL[3];
  const results = [];
  const usedIndices = new Set();

  // Shuffle indices for randomness
  const indices = pool.map((_, i) => i).sort(() => Math.random() - 0.5);

  for (const idx of indices) {
    if (results.length >= 3) break;
    const candidate = pool[idx](name, picks, area);
    // Skip if seen recently at this location (any device)
    if (history.includes(candidate)) continue;
    if (usedIndices.has(idx)) continue;
    results.push(candidate);
    usedIndices.add(idx);
  }

  // If pool exhausted (all seen before), fill remaining slots ignoring history
  let fallbackTries = 0;
  while (results.length < 3 && fallbackTries < 20) {
    const idx = Math.floor(Math.random() * pool.length);
    if (!usedIndices.has(idx)) {
      results.push(pool[idx](name, picks, area));
      usedIndices.add(idx);
    }
    fallbackTries++;
  }

  return results;
}

// ─── Default Config ────────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  businessName: "FitZone Gym",
  tagline: "Your words help others find us",
  clientLogo: "", // base64 image string, set from Admin panel
  city: "Bhopal",
  area: "Ashoka Garden",
  accentColor: "#2D6A4F",
  adminPassword: "admin123",
  locations: [
    { id: 1, name: "Downtown Branch", address: "12 Oak Street, Downtown", googleUrl: "", qrUrl: "", active: true },
    { id: 2, name: "Westside Branch", address: "88 Maple Ave, Westside", googleUrl: "", qrUrl: "", active: true },
    { id: 3, name: "Northgate Branch", address: "5 River Lane, Northgate", googleUrl: "", qrUrl: "", active: true },
  ],
  highlights: ["Trainers", "Equipment", "Cleanliness", "Timings", "Results", "Value", "Group Classes"],
};

// ─── QR Code Component ─────────────────────────────────────────────────────────
function QRCodeCanvas({ value, size = 200, id }) {
  const containerRef = useState(() => ({ current: null }))[0];
  return (
    <div id={id} ref={el => { containerRef.current = el; }} style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <QRCodeLoader value={value} size={size} containerRef={containerRef} />
    </div>
  );
}
function QRCodeLoader({ value, size, containerRef }) {
  useState(() => {
    if (typeof window === "undefined") return;
    if (window.QRCode) {
      renderQR();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    script.onload = renderQR;
    document.head.appendChild(script);

    function renderQR() {
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
          try {
            new window.QRCode(containerRef.current, {
              text: value, width: size, height: size,
              colorDark: "#1a1a1a", colorLight: "#ffffff",
              correctLevel: window.QRCode.CorrectLevel.M,
            });
          } catch (e) {}
        }
      }, 50);
    }
  });
  return null;
}

// ─── Shared Styles ─────────────────────────────────────────────────────────────
const S = {
  app: { minHeight: "100vh", background: "#f5f5f2", fontFamily: "'Inter',-apple-system,sans-serif" },
  center: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "20px" },
  card: { background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "420px", border: "1px solid #e8e8e4", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" },
  wideCard: { background: "#fff", borderRadius: "16px", border: "1px solid #e8e8e4", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", marginBottom: 16 },
  hdr: (accent) => ({ background: accent || "#1a1a1a", padding: "28px 24px 24px", color: "#fff" }),
  eyebrow: { fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.6, marginBottom: "4px" },
  htitle: { fontSize: "22px", fontWeight: 700, lineHeight: 1.2 },
  hsub: { fontSize: "13px", opacity: 0.65, marginTop: "4px" },
  body: { padding: "22px 24px 26px" },
  label: { fontSize: "11px", fontWeight: 600, color: "#888", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px", display: "block" },
  locBtn: (active, accent) => ({
    width: "100%", padding: "13px 16px", borderRadius: "10px", marginBottom: "8px", cursor: "pointer", textAlign: "left",
    border: `1.5px solid ${active ? (accent || "#1a1a1a") : "#e8e8e4"}`,
    background: active ? (accent || "#1a1a1a") : "#fff", color: active ? "#fff" : "#1a1a1a", transition: "all 0.15s",
  }),
  chip: (active, accent) => ({
    padding: "9px 6px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer",
    border: `1.5px solid ${active ? (accent || "#1a1a1a") : "#e8e8e4"}`,
    background: active ? (accent || "#1a1a1a") : "#fff", color: active ? "#fff" : "#555", transition: "all 0.15s",
  }),
  btn: (disabled, accent, outline) => ({
    width: "100%", padding: "13px", borderRadius: "10px", fontSize: "14px", fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
    border: outline ? "1.5px solid #e8e8e4" : "none",
    background: disabled ? "#e0e0dc" : outline ? "#fff" : (accent || "#1a1a1a"),
    color: disabled ? "#aaa" : outline ? "#555" : "#fff",
    marginTop: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "all 0.15s",
  }),
  reviewCard: (sel) => ({
    border: `1.5px solid ${sel ? "#1a1a1a" : "#e8e8e4"}`, borderRadius: "10px", padding: "14px 16px",
    marginBottom: "10px", cursor: "pointer", background: sel ? "#fafaf8" : "#fff", transition: "all 0.15s",
  }),
  skeleton: { height: "88px", borderRadius: "10px", background: "linear-gradient(90deg,#f0f0ec 25%,#e8e8e4 50%,#f0f0ec 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", marginBottom: "10px" },
  pill: (active) => ({ height: "3px", flex: active ? 2 : 1, borderRadius: "2px", background: active ? "#fff" : "rgba(255,255,255,0.3)", transition: "all 0.3s" }),
  input: { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1.5px solid #e8e8e4", fontSize: "14px", outline: "none", fontFamily: "inherit", marginBottom: "10px", boxSizing: "border-box", background: "#fff" },
};

const Progress = ({ step, total }) => (
  <div style={{ display: "flex", gap: "4px", marginTop: "16px" }}>
    {Array.from({ length: total }).map((_, i) => <div key={i} style={S.pill(i <= step)} />)}
  </div>
);

const StarBtn = ({ filled, onEnter, onLeave, onClick }) => (
  <button onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={onClick}
    style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", lineHeight: 0 }}>
    <svg width="36" height="36" viewBox="0 0 24 24" fill={filled ? "#fff" : "none"} stroke="#fff" strokeWidth="1.5">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  </button>
);

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEW FLOW
// ═══════════════════════════════════════════════════════════════════════════════
function ReviewFlow({ config, preselectedLocId }) {
  const locations = config.locations.filter(l => l.active);
  const preLoc = preselectedLocId ? locations.find(l => l.id === Number(preselectedLocId)) : null;
  const [step, setStep] = useState(preLoc ? 1 : 0);
  const [location, setLocation] = useState(preLoc || null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [picks, setPicks] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [selected, setSelected] = useState(null);
  const [genCount, setGenCount] = useState(0);
  const accent = config.accentColor || "#2D6A4F";
  const ratingLabels = ["", "Poor", "Below average", "Decent", "Great", "Excellent!"];

  const togglePick = (h) => setPicks(p => p.includes(h) ? p.filter(x=>x!==h) : p.length<5 ? [...p,h] : p);

  const areaKeyword = config.area || config.city
    ? [config.area, config.city].filter(Boolean).join(", ")
    : null;

  const generate = () => {
    setLoading(true); setStep(2); setCopiedIdx(null);
    setTimeout(async () => {
      setReviews(await generateReviews(location.id, location.name, rating, picks, areaKeyword));
      setLoading(false);
    }, 900);
  };

  const regenerate = () => {
    setLoading(true); setCopiedIdx(null); setGenCount(c => c + 1);
    setTimeout(async () => {
      setReviews(await generateReviews(location.id, location.name, rating, picks, areaKeyword));
      setLoading(false);
    }, 700);
  };

  const copyAndContinue = async (review, idx) => {
    setSelected(review); setCopiedIdx(idx);
    try { await navigator.clipboard.writeText(review); } catch {}
    saveToHistory(location.id, [review]); // fire-and-forget, only the chosen review is reserved
    setTimeout(() => setStep(3), 700);
  };

  const reset = () => { setStep(preLoc ? 1 : 0); setLocation(preLoc||null); setRating(0); setHover(0); setPicks([]); setReviews([]); setCopiedIdx(null); setSelected(null); setGenCount(0); };

  const displayRating = hover || rating;
  const ratingMeta = [null,
    { label: "Poor", emoji: "😕", color: "#e05050" },
    { label: "Below average", emoji: "😐", color: "#e07820" },
    { label: "Decent", emoji: "🙂", color: "#c8a000" },
    { label: "Great", emoji: "😊", color: "#4caf7d" },
    { label: "Excellent!", emoji: "🤩", color: accent },
  ];
  const rm = ratingMeta[displayRating];

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');
    @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes scaleIn{from{opacity:0;transform:scale(0.93)}to{opacity:1;transform:scale(1)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes confettiFall{0%{transform:translateY(-10px) rotate(0deg);opacity:1}100%{transform:translateY(120px) rotate(720deg);opacity:0}}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',-apple-system,sans-serif;-webkit-font-smoothing:antialiased}
    button{font-family:inherit;-webkit-tap-highlight-color:transparent}
    .fade-up{animation:fadeUp 0.32s ease both}
    .scale-in{animation:scaleIn 0.25s ease both}
    .review-card{transition:all 0.18s ease;border:2px solid transparent;background:#f9f9f9}
    .review-card:hover{background:#f3f3f3;border-color:#e0e0e0}
    .review-card.selected{border-color:${accent}!important;background:rgba(45,106,79,0.04)!important}
    .loc-btn{transition:all 0.15s ease;border:2px solid #ebebeb;background:#fff;text-align:left;width:100%;cursor:pointer;border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px}
    .loc-btn:active{transform:scale(0.98)}
    .loc-btn.selected{border-color:${accent};background:rgba(45,106,79,0.05)}
    .chip-btn{transition:all 0.15s ease;border:1.5px solid #e8e8e8;background:#fff;cursor:pointer;border-radius:100px;padding:9px 16px;font-size:14px;font-weight:500;color:#555;white-space:nowrap}
    .chip-btn:active{transform:scale(0.95)}
    .chip-btn.chosen{border-color:${accent};background:${accent};color:#fff}
    .primary-btn{width:100%;padding:16px;border-radius:14px;border:none;font-size:16px;font-weight:600;cursor:pointer;font-family:inherit;transition:all 0.18s ease;display:flex;align-items:center;justify-content:center;gap:8px}
    .primary-btn:active{transform:scale(0.98)}
    .primary-btn:disabled{background:#e8e8e8!important;color:#aaa!important;cursor:not-allowed;transform:none}
    .ghost-btn{width:100%;padding:13px;border-radius:14px;border:1.5px solid #e8e8e8;background:#fff;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit;color:#666;transition:all 0.15s}
    .ghost-btn:active{transform:scale(0.98)}
    .regen-btn{font-size:12px;color:${accent};background:none;border:none;cursor:pointer;font-weight:600;text-decoration:underline;text-underline-offset:3px;font-family:inherit}
    .confetti-piece{position:absolute;width:8px;height:8px;border-radius:2px;animation:confettiFall 1.2s ease forwards}
  `;

  const Screen = ({ children, style }) => (
  <div style={{ minHeight:"100svh", background:"#f7f7f5", display:"flex", flexDirection:"column", ...style }}>
    <style>{css}</style>
    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", padding:"6px 20px 2px", background:"#fff", borderBottom:"1px solid #ececea", flexShrink:0, alignSelf:"stretch", width:"100%", boxSizing:"border-box" }}>
      <img src={agencyLogo} alt="" style={{ height:80, width:"auto", objectFit:"contain" }} />
      {config.clientLogo && (
        <img src={config.clientLogo} alt="" style={{ height:80, width:"auto", maxWidth:150, objectFit:"contain" }} />
      )}
    </div>
    {children}
  </div>
);

  if (step === 0) return (
    <Screen>
      <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"24px 20px 32px", maxWidth:480, width:"100%", margin:"0 auto" }}>
        <div className="fade-up" style={{ marginBottom:32, paddingTop:16 }}>
          <div style={{ fontSize:12, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", color:accent, marginBottom:8 }}>
            {config.businessName}
          </div>
          <h1 style={{ fontSize:28, fontWeight:700, color:"#111", lineHeight:1.2, marginBottom:8 }}>
            Which location did you visit?
          </h1>
          <p style={{ fontSize:14, color:"#888", lineHeight:1.5 }}>{config.tagline}</p>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10, flex:1 }}>
          {locations.map((loc) => (
            <button key={loc.id} className={`loc-btn${location?.id===loc.id?" selected":""}`} onClick={() => setLocation(loc)}>
              <div style={{
                width:44, height:44, borderRadius:12, flexShrink:0,
                background: location?.id===loc.id ? accent : "#f0f0f0",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:18, transition:"all 0.2s"
              }}>
                {location?.id===loc.id ? "✓" : "☕"}
              </div>
              <div>
                <div style={{ fontSize:15, fontWeight:600, color:"#111", marginBottom:2 }}>{loc.name}</div>
                <div style={{ fontSize:12, color:"#999" }}>{loc.address}</div>
              </div>
            </button>
          ))}
        </div>
        <div style={{ marginTop:24 }}>
          <button className="primary-btn" style={{ background: accent, color:"#fff" }} disabled={!location} onClick={() => setStep(1)}>
            Continue <span style={{ fontSize:18 }}>→</span>
          </button>
        </div>
      </div>
    </Screen>
  );

  if (step === 1) return (
    <Screen>
      <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"24px 20px 32px", maxWidth:480, width:"100%", margin:"0 auto" }}>
        <div className="fade-up" style={{ display:"flex", alignItems:"center", gap:10, marginBottom:28 }}>
          {!preLoc && (
            <button onClick={() => setStep(0)} style={{ background:"#f0f0f0", border:"none", borderRadius:10, width:36, height:36, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>
              ←
            </button>
          )}
          <div style={{ background:`rgba(45,106,79,0.1)`, borderRadius:10, padding:"9px 12px 6px", fontSize:13, fontWeight:600, color:accent }}>
            {location?.name}
          </div>
        </div>
        <div className="fade-up" style={{ marginBottom:36 }}>
          <h2 style={{ fontSize:26, fontWeight:700, color:"#111", marginBottom:6 }}>How was your experience?</h2>
          <p style={{ fontSize:14, color:"#999", marginBottom:24 }}>Be honest — it helps us improve</p>
          <div style={{ display:"flex", justifyContent:"center", gap:8, marginBottom:14 }}>
            {[1,2,3,4,5].map(s => (
              <button key={s}
                onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} onClick={() => setRating(s)}
                style={{ background:"none", border:"none", cursor:"pointer", padding:4, lineHeight:0, fontSize:0, transition:"transform 0.15s" }}>
                <svg width="48" height="48" viewBox="0 0 24 24"
                  fill={s<=(hover||rating) ? (ratingMeta[hover||rating]?.color||accent) : "#e8e8e8"}
                  style={{ filter: s<=(hover||rating) ? `drop-shadow(0 2px 6px ${ratingMeta[hover||rating]?.color||accent}44)` : "none", transition:"all 0.18s" }}>
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                </svg>
              </button>
            ))}
          </div>
          <div style={{ textAlign:"center", height:32, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            {displayRating>0 ? (
              <div className="scale-in" key={displayRating} style={{ display:"flex", alignItems:"center", gap:6, fontSize:16, fontWeight:600, color: rm?.color }}>
                <span style={{ fontSize:22 }}>{rm?.emoji}</span>
                {rm?.label}
              </div>
            ) : (
              <span style={{ fontSize:14, color:"#bbb" }}>Tap a star to rate</span>
            )}
          </div>
        </div>
        <div className="fade-up" style={{ marginBottom:32 }}>
          <div style={{ fontSize:13, fontWeight:600, color:"#555", marginBottom:12 }}>
            What made it special?
            <span style={{ fontWeight:400, color:"#bbb", marginLeft:6 }}>Pick up to 5</span>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {config.highlights.map(h => (
              <button key={h} className={`chip-btn${picks.includes(h)?" chosen":""}`} onClick={() => togglePick(h)}>
                {picks.includes(h) && <span style={{ marginRight:4 }}>✓</span>}
                {h}
              </button>
            ))}
          </div>
        </div>
        <button className="primary-btn" style={{ background: !rating ? "#e8e8e8" : accent, color: !rating ? "#aaa" : "#fff", marginTop:"auto" }} disabled={!rating} onClick={generate}>
          Generate my review ✨
        </button>
      </div>
    </Screen>
  );

  if (step === 2) return (
    <Screen>
      <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"24px 20px 32px", maxWidth:480, width:"100%", margin:"0 auto" }}>
        <div className="fade-up" style={{ marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:12 }}>
            {[1,2,3,4,5].map(s => (
              <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill={s<=rating ? (ratingMeta[rating]?.color||accent) : "#e8e8e8"}>
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
            ))}
            <span style={{ fontSize:12, color:"#999", marginLeft:4 }}>{location?.name}</span>
          </div>
          <h2 style={{ fontSize:26, fontWeight:700, color:"#111", marginBottom:4 }}>
            {loading ? "Writing your review…" : "Pick your favourite"}
          </h2>
          <p style={{ fontSize:14, color:"#999" }}>
            {loading ? "Finding the right words" : "Tap one to copy it, then paste into Google"}
          </p>
        </div>
        {loading ? (
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:12 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ borderRadius:16, overflow:"hidden", height:100+i*12 }}>
                <div style={{ height:"100%", background:"linear-gradient(90deg,#f0f0ec 25%,#e8e8e4 50%,#f0f0ec 75%)", backgroundSize:"200% 100%", animation:"shimmer 1.5s infinite" }} />
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"center", marginTop:16 }}>
              <div style={{ width:24, height:24, border:`3px solid ${accent}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
            </div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12, flex:1 }}>
            {reviews.map((r, i) => (
              <div key={`${genCount}-${i}`} className={`review-card${copiedIdx===i?" selected":""}`}
                style={{ borderRadius:16, padding:"18px 18px 14px", cursor:"pointer", position:"relative" }}
                onClick={() => copyAndContinue(r, i)}>
                <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", color:"#bbb", marginBottom:8 }}>
                  Option {i+1}
                </div>
                <p style={{ fontSize:14, lineHeight:1.7, color:"#333", marginBottom:12 }}>{r}</p>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ fontSize:12, color:"#bbb" }}>{r.split(' ').length} words</div>
                  <div style={{
                    display:"flex", alignItems:"center", gap:5, fontSize:12, fontWeight:600,
                    color: copiedIdx===i ? "#2a9d5c" : accent,
                    background: copiedIdx===i ? "rgba(42,157,92,0.08)" : `rgba(45,106,79,0.08)`,
                    padding:"5px 10px", borderRadius:20
                  }}>
                    {copiedIdx===i ? <>✓ Copied!</> : <>Copy & use</>}
                  </div>
                </div>
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"center", margin:"2px 0 4px" }}>
              <button className="regen-btn" onClick={regenerate}>↻ try different words</button>
            </div>
            <button className="ghost-btn" onClick={() => setStep(1)}>
              ← Change my rating
            </button>
          </div>
        )}
      </div>
    </Screen>
  );

  if (step === 3) return (
    <Screen style={{ alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
      <style>{css}</style>
      {["#FF6B6B","#FFD93D","#6BCB77","#4D96FF","#FF6FC8","#c8973a"].map((col,i)=>(
        <div key={i} className="confetti-piece" style={{
          background:col, left:`${15+i*12}%`, top:"-10px",
          animationDelay:`${i*0.12}s`, animationDuration:`${1+i*0.15}s`,
          borderRadius: i%2===0 ? "50%" : "2px"
        }}/>
      ))}
      <div className="fade-up" style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"32px 28px", maxWidth:400, width:"100%", textAlign:"center" }}>
        <div style={{
          width:88, height:88, borderRadius:"50%", background:`rgba(45,106,79,0.1)`,
          display:"flex", alignItems:"center", justifyContent:"center", marginBottom:24,
        }}>
          <div style={{ width:64, height:64, borderRadius:"50%", background:accent, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
          </div>
        </div>
        <h2 style={{ fontSize:28, fontWeight:700, color:"#111", marginBottom:8 }}>Review copied!</h2>
        <p style={{ fontSize:15, color:"#888", lineHeight:1.6, marginBottom:24 }}>
          Just paste it into Google Reviews and you're done. Takes 10 seconds.
        </p>
        <div style={{
          background:"#f7f7f5", borderRadius:16, padding:"16px 18px",
          border:"1px solid #eee", marginBottom:28, width:"100%", textAlign:"left"
        }}>
          <div style={{ display:"flex", gap:6, marginBottom:8 }}>
            {[1,2,3,4,5].map(s=>(
              <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill={s<=rating ? (ratingMeta[rating]?.color||accent) : "#e8e8e8"}>
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
            ))}
          </div>
          <p style={{ fontSize:13, color:"#555", lineHeight:1.65, fontStyle:"italic" }}>"{selected}"</p>
        </div>
        <div style={{ width:"100%", marginBottom:24 }}>
          {[
            { n:1, text:"Tap the button below", done:true },
            { n:2, text:"Long-press the text field & Paste", done:false },
            { n:3, text:"Hit Submit — you're a legend 🙌", done:false },
          ].map(s=>(
            <div key={s.n} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
              <div style={{
                width:26, height:26, borderRadius:"50%", flexShrink:0,
                background: s.done ? accent : "#f0f0f0",
                color: s.done ? "#fff" : "#999",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:12, fontWeight:700
              }}>{s.n}</div>
              <div style={{ fontSize:13, color:s.done?"#111":"#888" }}>{s.text}</div>
            </div>
          ))}
        </div>
        <a href={location?.googleUrl || "#"} rel="noopener noreferrer"
          style={{
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            width:"100%", padding:"16px", borderRadius:14, background:accent, color:"#fff",
            textDecoration:"none", fontSize:16, fontWeight:600, marginBottom:10
          }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Open Google Reviews
        </a>
        <button className="ghost-btn" onClick={reset}>Leave another review</button>
      </div>
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN LOGIN
// ═══════════════════════════════════════════════════════════════════════════════
function AdminLogin({ config, onSuccess, onBack }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const attempt = () => {
    if (pw === config.adminPassword) onSuccess();
    else { setErr(true); setTimeout(()=>setErr(false),1500); setPw(""); }
  };
  return (
    <div style={{ minHeight:"100svh", background:"#f5f5f2", display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'Inter',-apple-system,sans-serif" }}>
      <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:360, border:"1px solid #e8e8e4", overflow:"hidden", boxShadow:"0 4px 24px rgba(0,0,0,0.06)" }}>
        <div style={{ background:"#1a1a1a", padding:"28px 24px 24px", color:"#fff" }}>
          <div style={{ fontSize:"11px", letterSpacing:"0.12em", textTransform:"uppercase", opacity:0.6, marginBottom:"4px" }}>Admin Access</div>
          <div style={{ fontSize:"22px", fontWeight:700 }}>Sign in</div>
        </div>
        <div style={{ padding:"22px 24px 26px" }}>
          <span style={S.label}>Password</span>
          <input style={{ ...S.input, borderColor:err?"#e05050":"#e8e8e4" }}
            type="password" placeholder="Enter admin password" value={pw}
            onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&attempt()} autoFocus/>
          {err && <div style={{ fontSize:13, color:"#e05050", marginTop:-6, marginBottom:8 }}>Incorrect password</div>}
          <button onClick={attempt} style={{ width:"100%", padding:"13px", borderRadius:"10px", border:"none", background:"#1a1a1a", color:"#fff", fontSize:"14px", fontWeight:600, cursor:"pointer", marginTop:4 }}>Enter admin panel →</button>
          <button onClick={onBack} style={{ width:"100%", padding:"12px", borderRadius:"10px", border:"1.5px solid #e8e8e4", background:"#fff", color:"#555", fontSize:"14px", fontWeight:500, cursor:"pointer", marginTop:10 }}>← Back to reviews</button>
          <div style={{ fontSize:12, color:"#bbb", marginTop:12, textAlign:"center" }}>Default: admin123</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN PANEL
// ═══════════════════════════════════════════════════════════════════════════════
function AdminPanel({ config, setConfig, onExit }) {
  const [tab, setTab] = useState("general");
  const [draft, setDraft] = useState(JSON.parse(JSON.stringify(config)));
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const baseUrl = typeof window!=="undefined" ? window.location.origin+window.location.pathname : "https://yoursite.com/";

  const save = async () => {
    setConfig(draft);
    const ok = await saveRemoteConfig(draft);
    if (ok) {
      setSaveError(false);
      setSaved(true); setTimeout(()=>setSaved(false),2000);
    } else {
      setSaveError(true); setTimeout(()=>setSaveError(false),3000);
    }
  };

  const updateLoc = (id,field,val) => setDraft(d=>({...d,locations:d.locations.map(l=>l.id===id?{...l,[field]:val}:l)}));
  const addLoc = () => { const newId=(Math.max(...draft.locations.map(l=>l.id))||0)+1; setDraft(d=>({...d,locations:[...d.locations,{id:newId,name:"New Location",address:"",googleUrl:"",qrUrl:"",active:true}]})); };
  const removeLoc = (id) => setDraft(d=>({...d,locations:d.locations.filter(l=>l.id!==id)}));
  const updateHL = (i,val) => setDraft(d=>{const h=[...d.highlights];h[i]=val;return{...d,highlights:h};});
  const addHL = () => setDraft(d=>({...d,highlights:[...d.highlights,"New Tag"]}));
  const removeHL = (i) => setDraft(d=>({...d,highlights:d.highlights.filter((_,j)=>j!==i)}));

  const tabStyle = (active) => ({
    padding:"8px 14px", borderRadius:"8px", border:"none", fontSize:"13px", fontWeight:600, cursor:"pointer",
    background:active?"#1a1a1a":"transparent", color:active?"#fff":"#777", transition:"all 0.15s", fontFamily:"inherit",
  });

  const downloadQR = (locId,locName) => {
    const container = document.getElementById(`qr-download-${locId}`);
    if(!container) return;
    const canvas = container.querySelector("canvas");
    if(canvas){ const link=document.createElement("a"); link.download=`qr-${locName.replace(/\s+/g,"-").toLowerCase()}.png`; link.href=canvas.toDataURL(); link.click(); }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#f5f5f2", fontFamily:"'Inter',-apple-system,sans-serif" }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}button{font-family:inherit}input{font-family:inherit;color:#1a1a1a}`}</style>
      <div style={{ background:"#fff", borderBottom:"1px solid #e8e8e4", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:10 }}>
        <div>
          <div style={{ fontSize:11, letterSpacing:"0.1em", textTransform:"uppercase", color:"#999", fontWeight:600 }}>Admin Panel</div>
          <div style={{ fontSize:17, fontWeight:700, color:"#1a1a1a" }}>{draft.businessName}</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onExit} style={{ padding:"8px 14px", borderRadius:8, border:"1.5px solid #e8e8e4", background:"#fff", fontSize:13, cursor:"pointer", color:"#555", fontWeight:500 }}>← Exit</button>
          <button onClick={save} style={{ padding:"8px 16px", borderRadius:8, border:"none", background:saved?"#2a9d5c":"#1a1a1a", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", transition:"background 0.3s", minWidth:110 }}>
            {saved ? "✓ Saved!" : saveError ? "⚠ Failed — retry" : "Save changes"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth:720, margin:"0 auto", padding:"24px 16px" }}>
        <div style={{ display:"flex", gap:2, background:"#fff", borderRadius:12, padding:4, border:"1px solid #e8e8e4", marginBottom:20, width:"fit-content" }}>
          {[["general","General"],["locations","Locations"],["highlights","Highlights"],["qr","QR Codes"]].map(([t,label])=>(
            <button key={t} style={tabStyle(tab===t)} onClick={()=>setTab(t)}>{label}</button>
          ))}
        </div>

        {tab==="general" && (
          <div style={S.wideCard}>
            <div style={{ padding:"18px 22px", borderBottom:"1px solid #f0f0ec" }}>
              <div style={{ fontWeight:700, fontSize:15 }}>Brand & Settings</div>
              <div style={{ fontSize:13, color:"#999", marginTop:2 }}>Customize how your review app looks</div>
            </div>
            <div style={{ padding:"20px 22px" }}>
              <span style={S.label}>Business Name</span>
              <input style={S.input} value={draft.businessName} onChange={e=>setDraft(d=>({...d,businessName:e.target.value}))}/>
              <span style={S.label}>Client Logo</span>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                {draft.clientLogo && (
                  <img src={draft.clientLogo} alt="" style={{ maxHeight:40, maxWidth:100, objectFit:"contain", border:"1px solid #e8e8e4", borderRadius:8, padding:4 }} />
                )}
                <input type="file" accept="image/*" onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setDraft(d => ({ ...d, clientLogo: reader.result }));
                  reader.readAsDataURL(file);
                }} />
                {draft.clientLogo && (
                  <button type="button" onClick={() => setDraft(d => ({ ...d, clientLogo: "" }))}
                    style={{ fontSize:12, color:"#c0392b", background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>
                    Remove
                  </button>
                )}
              </div>
              <span style={S.label}>Tagline</span>
              <input style={S.input} value={draft.tagline} onChange={e=>setDraft(d=>({...d,tagline:e.target.value}))}/>
              <span style={S.label}>City</span>
              <input style={S.input} value={draft.city||""} onChange={e=>setDraft(d=>({...d,city:e.target.value}))} placeholder="e.g. Bhopal"/>
              <span style={S.label}>Area / Locality</span>
              <input style={S.input} value={draft.area||""} onChange={e=>setDraft(d=>({...d,area:e.target.value}))} placeholder="e.g. Ashoka Garden"/>
              <span style={S.label}>Accent Color</span>
              <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:12 }}>
                <input type="color" value={draft.accentColor} onChange={e=>setDraft(d=>({...d,accentColor:e.target.value}))}
                  style={{ width:44, height:36, borderRadius:8, border:"1.5px solid #e8e8e4", cursor:"pointer", padding:2, flexShrink:0 }}/>
                <input style={{ ...S.input, marginBottom:0, flex:1 }} value={draft.accentColor} onChange={e=>setDraft(d=>({...d,accentColor:e.target.value}))}/>
              </div>
              <div style={{ background:draft.accentColor, borderRadius:12, padding:"18px 20px", color:"#fff", marginBottom:16 }}>
                <div style={{ fontSize:10, opacity:0.6, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:4 }}>{draft.businessName}</div>
                <div style={{ fontSize:18, fontWeight:700 }}>{draft.tagline}</div>
                <div style={{ display:"flex", gap:2, marginTop:10 }}>{"★★★★★".split("").map((s,i)=><span key={i} style={{ opacity:i<4?1:0.3, fontSize:18 }}>{s}</span>)}</div>
              </div>
              <span style={S.label}>Admin Password</span>
              <input style={S.input} type="password" value={draft.adminPassword} onChange={e=>setDraft(d=>({...d,adminPassword:e.target.value}))} placeholder="Enter new password"/>
              <div style={{ fontSize:12, color:"#aaa" }}>Change this from "admin123" before going live.</div>
            </div>
          </div>
        )}

        {tab==="locations" && (
          <div style={S.wideCard}>
            <div style={{ padding:"18px 22px", borderBottom:"1px solid #f0f0ec", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div><div style={{ fontWeight:700, fontSize:15 }}>Locations</div><div style={{ fontSize:13, color:"#999", marginTop:2 }}>{draft.locations.length} location{draft.locations.length!==1?"s":""}</div></div>
              <button onClick={addLoc} style={{ padding:"8px 14px", borderRadius:8, border:"none", background:"#1a1a1a", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>+ Add</button>
            </div>
            <div style={{ padding:"20px 22px" }}>
              {draft.locations.map((loc,idx)=>(
                <div key={loc.id} style={{ border:"1px solid #e8e8e4", borderRadius:12, padding:"16px", marginBottom:12, background:loc.active?"#fafaf8":"#fdfdfd", opacity:loc.active?1:0.6 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#888", letterSpacing:"0.06em", textTransform:"uppercase" }}>Location {idx+1}</div>
                    <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                      <label style={{ fontSize:12, color:"#777", display:"flex", gap:5, alignItems:"center", cursor:"pointer", userSelect:"none" }}>
                        <input type="checkbox" checked={loc.active} onChange={e=>updateLoc(loc.id,"active",e.target.checked)}/> Active
                      </label>
                      {draft.locations.length>1 && <button onClick={()=>removeLoc(loc.id)} style={{ background:"none", border:"none", color:"#e05050", cursor:"pointer", fontSize:12, fontWeight:600 }}>Remove</button>}
                    </div>
                  </div>
                  <input style={S.input} placeholder="Location name" value={loc.name} onChange={e=>updateLoc(loc.id,"name",e.target.value)}/>
                  <input style={S.input} placeholder="Address" value={loc.address} onChange={e=>updateLoc(loc.id,"address",e.target.value)}/>
                  <input style={{ ...S.input, marginBottom:4 }} placeholder="Google Review URL" value={loc.googleUrl} onChange={e=>updateLoc(loc.id,"googleUrl",e.target.value)}/>
                  <div style={{ fontSize:11, color:"#bbb" }}>Google Business Profile → "Get more reviews" → copy the link</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="highlights" && (
          <div style={S.wideCard}>
            <div style={{ padding:"18px 22px", borderBottom:"1px solid #f0f0ec", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div><div style={{ fontWeight:700, fontSize:15 }}>Highlight Tags</div><div style={{ fontSize:13, color:"#999", marginTop:2 }}>Customers pick up to 3 when rating</div></div>
              <button onClick={addHL} style={{ padding:"8px 14px", borderRadius:8, border:"none", background:"#1a1a1a", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>+ Add tag</button>
            </div>
            <div style={{ padding:"20px 22px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
                {draft.highlights.map((h,i)=>(
                  <div key={i} style={{ display:"flex", gap:6, alignItems:"center" }}>
                    <input style={{ ...S.input, marginBottom:0, flex:1 }} value={h} onChange={e=>updateHL(i,e.target.value)}/>
                    <button onClick={()=>removeHL(i)} style={{ background:"none", border:"none", color:"#e05050", cursor:"pointer", fontSize:20, lineHeight:1, flexShrink:0 }}>×</button>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:12, color:"#aaa" }}>Keep tags to 1-2 words. They shape the review templates.</div>
            </div>
          </div>
        )}

        {tab==="qr" && (
          <div style={S.wideCard}>
            <div style={{ padding:"18px 22px", borderBottom:"1px solid #f0f0ec" }}>
              <div style={{ fontWeight:700, fontSize:15 }}>QR Codes</div>
              <div style={{ fontSize:13, color:"#999", marginTop:2 }}>Set QR link and Google Review link independently per location</div>
            </div>
            <div style={{ padding:"20px 22px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18 }}>
                <div style={{ background:"#f0f7f4", border:"1px solid #c8e6d8", borderRadius:10, padding:"12px 14px", fontSize:12, color:"#1a5c3a" }}>
                  <div style={{ fontWeight:700, marginBottom:4 }}>📱 QR Code URL</div>
                  Your review app link — customers scan this to leave a review
                </div>
                <div style={{ background:"#fff8f0", border:"1px solid #f0d8b0", borderRadius:10, padding:"12px 14px", fontSize:12, color:"#7a4000" }}>
                  <div style={{ fontWeight:700, marginBottom:4 }}>⭐ Google Review URL</div>
                  Where customers go after copying their review to submit it
                </div>
              </div>
              {draft.locations.filter(l => l.active).map(loc => {
                const qrLink = loc.qrUrl && loc.qrUrl !== "" ? loc.qrUrl : baseUrl + "?loc=" + loc.id;
                const googleLink = loc.googleUrl && loc.googleUrl !== "" ? loc.googleUrl : "";
                return (
                  <div key={loc.id} style={{ border:"1px solid #e8e8e4", borderRadius:14, padding:"18px", marginBottom:16, background:"#fff" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
                      <div style={{ width:40, height:40, borderRadius:10, background:"#f0f0f0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>☕</div>
                      <div>
                        <div style={{ fontSize:15, fontWeight:700, color:"#111" }}>{loc.name}</div>
                        <div style={{ fontSize:12, color:"#999" }}>{loc.address}</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", justifyContent:"center", marginBottom:12, padding:"14px", background:"#fafaf8", borderRadius:10, border:"1px solid #f0f0ec" }}>
                      <QRCodeCanvas value={qrLink} size={140} />
                    </div>
                    <div style={{ marginBottom:16 }}>
                      <span style={{ ...S.label, marginBottom:6, color:"#1a5c3a" }}>📱 QR Code URL</span>
                      <input
                        style={{ ...S.input, marginBottom:4, fontSize:13, borderColor:"#c8e6d8" }}
                        placeholder={"Default: " + baseUrl + "?loc=" + loc.id}
                        value={loc.qrUrl || ""}
                        onChange={e => updateLoc(loc.id, "qrUrl", e.target.value)}
                      />
                      <div style={{ fontSize:11, fontWeight:500, color:"#2a9d5c" }}>
                        {loc.qrUrl && loc.qrUrl !== ""
                          ? "✓ Custom QR link: " + loc.qrUrl
                          : "Using default app URL: " + baseUrl + "?loc=" + loc.id}
                      </div>
                    </div>
                    <div style={{ marginBottom:14, padding:"14px", background:"#fff8f0", borderRadius:10, border:"1px solid #f0d8b0" }}>
                      <span style={{ ...S.label, marginBottom:6, color:"#7a4000" }}>⭐ Google Review URL</span>
                      <input
                        style={{ ...S.input, marginBottom:4, fontSize:13, borderColor:"#f0d8b0" }}
                        placeholder="https://g.page/r/YOUR_PLACE_ID/review"
                        value={loc.googleUrl || ""}
                        onChange={e => updateLoc(loc.id, "googleUrl", e.target.value)}
                      />
                      <div style={{ fontSize:11, fontWeight:500, color: googleLink ? "#e07820" : "#e05050" }}>
                        {googleLink
                          ? "✓ Google Review link set — customers will be redirected here"
                          : "⚠ Not set — get this from Google Business Profile → Ask for reviews"}
                      </div>
                    </div>
                    <button
                      onClick={() => downloadQR(loc.id, loc.name)}
                      style={{ padding:"9px 14px", borderRadius:8, border:"1.5px solid #e8e8e4", background:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", color:"#555", width:"100%" }}>
                      ↓ Download QR as PNG
                    </button>
                    <div id={"qr-download-" + loc.id} style={{ position:"absolute", left:-9999, top:-9999, width:400, height:400 }}>
                      <QRCodeCanvas value={qrLink} size={400} />
                    </div>
                  </div>
                );
              })}
              <div style={{ background:"#f0f7f4", border:"1px solid #c8e6d8", borderRadius:10, padding:"12px 14px", fontSize:13, color:"#1a5c3a" }}>
                <strong>Remember:</strong> Hit <strong>"Save changes"</strong> at the top after updating — then download your QR codes.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [mode, setMode] = useState("review");
  const params = new URLSearchParams(window.location.search);
  const locId = params.get("loc");

  useEffect(() => {
    (async () => {
      const remote = await loadRemoteConfig();
      if (remote) setConfig(remote);
      setConfigLoaded(true);
    })();
  }, []);

  if (!configLoaded) {
    return <div style={{ minHeight:"100svh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f7f7f5", color:"#999", fontFamily:"'Inter',-apple-system,sans-serif" }}>Loading...</div>;
  }

  return (
    <div style={{ fontFamily:"'Inter',-apple-system,sans-serif" }}>
      {mode==="review" && <>
        <ReviewFlow config={config} preselectedLocId={locId}/>
        <div style={{ position:"fixed", bottom:14, width:"100%", textAlign:"center", zIndex:10 }}>
          <button onClick={()=>setMode("adminLogin")} style={{ fontSize:11, color:"#ccc", background:"none", border:"none", cursor:"pointer", letterSpacing:"0.04em" }}>
            Admin ·
          </button>
        </div>
      </>}
      {mode==="adminLogin" && <AdminLogin config={config} onSuccess={()=>setMode("admin")} onBack={()=>setMode("review")}/>}
      {mode==="admin" && <AdminPanel config={config} setConfig={setConfig} onExit={()=>setMode("review")}/>}
    </div>
  );
}
