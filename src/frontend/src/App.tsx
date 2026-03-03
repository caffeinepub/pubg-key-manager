import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface GeneratedKey {
  key: string;
  durationDays: number;
  expiryTimestamp: number;
}

type Duration = "1" | "7" | "30" | "custom";

// ─── Constants ───────────────────────────────────────────────────────────────

const ADMIN_KEY = "rohan2006";
const LS_KEYS_KEY = "pubg_generated_keys";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadKeys(): GeneratedKey[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEYS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveKeys(keys: GeneratedKey[]) {
  localStorage.setItem(LS_KEYS_KEY, JSON.stringify(keys));
}

function validateKey(input: string): {
  valid: boolean;
  message: string;
  isAdmin: boolean;
} {
  const trimmed = input.trim();
  if (trimmed === ADMIN_KEY) {
    return {
      valid: true,
      message: "✅ Owner key — Lifetime Access",
      isAdmin: true,
    };
  }
  const stored = loadKeys();
  const match = stored.find((k) => k.key === trimmed);
  if (!match)
    return { valid: false, message: "❌ Invalid key", isAdmin: false };
  if (Date.now() > match.expiryTimestamp)
    return { valid: false, message: "❌ Key expired", isAdmin: false };
  return { valid: true, message: "✅ Access granted", isAdmin: false };
}

function generateRandomKey(): string {
  return Math.floor(Math.random() * 9000000000 + 1000000000).toString();
}

function formatExpiry(ts: number): string {
  const d = new Date(ts);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const day = String(d.getDate()).padStart(2, "0");
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function CrosshairIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className="inline-block"
      role="img"
      aria-label="Crosshair"
    >
      <circle cx="12" cy="12" r="9" stroke="#ff6a00" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" fill="#ff6a00" />
      <line
        x1="12"
        y1="1"
        x2="12"
        y2="6"
        stroke="#ff6a00"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="18"
        x2="12"
        y2="23"
        stroke="#ff6a00"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="1"
        y1="12"
        x2="6"
        y2="12"
        stroke="#ff6a00"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="18"
        y1="12"
        x2="23"
        y2="12"
        stroke="#ff6a00"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Admin Modal ──────────────────────────────────────────────────────────────

interface AdminModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function AdminModal({ onClose, onSuccess }: AdminModalProps) {
  const [keyInput, setKeyInput] = useState("");
  const [error, setError] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Key generator state (shown after login)
  const [keys, setKeys] = useState<GeneratedKey[]>(loadKeys);
  const [duration, setDuration] = useState<Duration>("7");
  const [customDays, setCustomDays] = useState("3");
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  useEffect(() => {
    if (!loggedIn) setTimeout(() => inputRef.current?.focus(), 80);
  }, [loggedIn]);

  function handleLogin() {
    if (keyInput.trim() === ADMIN_KEY) {
      setLoggedIn(true);
    } else {
      setError("❌ Invalid admin key");
      setKeyInput("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleGenerate() {
    const days =
      duration === "1"
        ? 1
        : duration === "7"
          ? 7
          : duration === "30"
            ? 30
            : Math.max(1, Number.parseInt(customDays) || 1);

    const newKey: GeneratedKey = {
      key: generateRandomKey(),
      durationDays: days,
      expiryTimestamp: Date.now() + days * 86400000,
    };

    const updated = [newKey, ...keys];
    setKeys(updated);
    saveKeys(updated);
    setLastGenerated(newKey.key);
  }

  function handleClearAll() {
    setKeys([]);
    saveKeys([]);
    setLastGenerated(null);
  }

  const durations: { value: Duration; label: string; ocid: string }[] = [
    { value: "1", label: "1 Day", ocid: "keygen.duration_1day" },
    { value: "7", label: "7 Days", ocid: "keygen.duration_7days" },
    { value: "30", label: "30 Days", ocid: "keygen.duration_30days" },
    { value: "custom", label: "Custom", ocid: "keygen.duration_custom" },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto overlay-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-ocid="admin.modal"
    >
      <motion.div
        className="relative w-full max-w-sm card-gaming rounded-xl p-6 noise-bg my-8"
        style={{
          boxShadow:
            "0 0 60px rgba(255,106,0,0.2), 0 20px 60px rgba(0,0,0,0.8)",
        }}
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <CrosshairIcon />
            <span
              className="font-display font-bold text-lg tracking-widest"
              style={{ color: "#ff6a00" }}
            >
              {loggedIn ? "KEY GENERATOR" : "ADMIN LOGIN"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white/80 hover:bg-white/8 transition-all"
            data-ocid="admin.close_button"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* ── Login form (before login) ── */}
        {!loggedIn && (
          <>
            <p className="text-white/40 text-sm mb-4 tracking-wide">
              Enter the admin key to access the key generator.
            </p>

            <div className="space-y-3">
              <input
                ref={inputRef}
                type="password"
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Admin key"
                className="w-full px-4 py-3 rounded-lg font-mono text-sm input-gaming"
                autoComplete="off"
                spellCheck={false}
                data-ocid="admin.key_input"
              />

              <AnimatePresence>
                {error && (
                  <motion.p
                    className="text-sm font-medium px-1"
                    style={{ color: "#ff4444" }}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="button"
                onClick={handleLogin}
                className="w-full py-3 rounded-lg btn-orange text-sm font-bold tracking-widest"
                style={{ boxShadow: "0 0 20px rgba(255,106,0,0.35)" }}
                data-ocid="admin.login_button"
              >
                LOGIN
              </button>
            </div>
          </>
        )}

        {/* ── Key Generator (after login) ── */}
        {loggedIn && (
          <motion.div
            className="space-y-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Also unlock the panel */}
            <button
              type="button"
              onClick={() => {
                onSuccess();
              }}
              className="w-full py-2.5 rounded-lg text-xs font-bold tracking-widest uppercase transition-all hover:opacity-80"
              style={{
                background: "rgba(255,106,0,0.12)",
                border: "1px solid rgba(255,106,0,0.3)",
                color: "#ff6a00",
              }}
              data-ocid="admin.open_panel_button"
            >
              ► OPEN ADMIN PANEL
            </button>

            {/* Duration Pills */}
            <div className="space-y-2">
              <p className="text-xs text-white/40 tracking-wider uppercase font-medium">
                Select Duration
              </p>
              <div className="flex gap-2 flex-wrap">
                {durations.map(({ value, label, ocid }) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setDuration(value)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold tracking-wider ${
                      duration === value
                        ? "duration-pill-active"
                        : "duration-pill"
                    }`}
                    data-ocid={ocid}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {duration === "custom" && (
                  <motion.div
                    className="flex items-center gap-3 pt-1"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      className="w-28 px-4 py-2 rounded-lg font-mono text-sm input-gaming"
                      placeholder="Days"
                      data-ocid="keygen.custom_days_input"
                    />
                    <span className="text-white/40 text-sm">days</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Generate Button */}
            <button
              type="button"
              onClick={handleGenerate}
              className="w-full py-3 rounded-lg btn-green text-sm"
              style={{ boxShadow: "0 0 20px rgba(0,255,136,0.3)" }}
              data-ocid="keygen.generate_button"
            >
              ⚡ GENERATE KEY
            </button>

            {/* Last generated display */}
            <AnimatePresence>
              {lastGenerated && (
                <motion.div
                  className="flex items-center gap-3 px-4 py-3 rounded-lg"
                  style={{
                    background: "rgba(0,255,136,0.06)",
                    border: "1px solid rgba(0,255,136,0.2)",
                  }}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <span className="text-xs text-white/40 uppercase tracking-wider shrink-0">
                    New key:
                  </span>
                  <span
                    className="font-mono font-bold text-base tracking-widest"
                    style={{
                      color: "#00ff88",
                      textShadow: "0 0 8px rgba(0,255,136,0.4)",
                    }}
                  >
                    {lastGenerated}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Keys List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-white/40 tracking-wider uppercase font-medium">
                  Generated Keys
                </p>
                <span
                  className="text-xs font-mono"
                  style={{ color: "#ff6a00" }}
                >
                  {keys.length} key{keys.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div
                className="rounded-xl overflow-hidden"
                style={{ border: "1px solid rgba(255,255,255,0.07)" }}
                data-ocid="keygen.keys_list"
              >
                {keys.length === 0 ? (
                  <div
                    className="py-8 text-center"
                    data-ocid="keygen.empty_state"
                  >
                    <p className="text-white/25 text-sm tracking-wider">
                      No keys generated yet
                    </p>
                  </div>
                ) : (
                  <>
                    <div
                      className="grid grid-cols-3 px-4 py-2.5 text-xs font-bold tracking-widest uppercase"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        color: "rgba(255,255,255,0.35)",
                        borderBottom: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <span>Key</span>
                      <span className="text-center">Days</span>
                      <span className="text-right">Expires</span>
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                      {keys.map((k, idx) => {
                        const expired = Date.now() > k.expiryTimestamp;
                        return (
                          <div
                            key={k.key}
                            className={`grid grid-cols-3 px-4 py-3 key-row ${expired ? "key-row-expired" : ""}`}
                            data-ocid={`keygen.key_item.${idx + 1}`}
                          >
                            <span
                              className={`font-mono text-xs font-bold tracking-wider ${expired ? "line-through" : ""}`}
                              style={{
                                color: expired
                                  ? "rgba(255,255,255,0.3)"
                                  : "#ff6a00",
                              }}
                            >
                              {k.key}
                            </span>
                            <span className="text-center text-xs text-white/50">
                              {k.durationDays}d
                            </span>
                            <span
                              className="text-right text-xs font-mono"
                              style={{
                                color: expired
                                  ? "rgba(255,50,50,0.6)"
                                  : "rgba(255,255,255,0.45)",
                              }}
                            >
                              {expired
                                ? "Expired"
                                : formatExpiry(k.expiryTimestamp)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Clear All */}
            {keys.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="w-full py-2.5 rounded-lg text-xs font-bold tracking-widest uppercase transition-all hover:opacity-80"
                style={{
                  background: "rgba(255,50,50,0.08)",
                  border: "1px solid rgba(255,50,50,0.25)",
                  color: "#ff4444",
                }}
                data-ocid="keygen.clear_button"
              >
                🗑 CLEAR ALL KEYS
              </button>
            )}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Landing View ─────────────────────────────────────────────────────────────

interface LandingViewProps {
  onUnlock: (isAdmin: boolean) => void;
  onAdminClick: () => void;
}

function LandingView({ onUnlock, onAdminClick }: LandingViewProps) {
  const [keyInput, setKeyInput] = useState("");
  const [status, setStatus] = useState<{
    message: string;
    valid: boolean;
  } | null>(null);

  function handleUnlock() {
    if (!keyInput.trim()) {
      setStatus({ message: "⚠ Please enter your key", valid: false });
      return;
    }
    const result = validateKey(keyInput);
    setStatus({ message: result.message, valid: result.valid });
    if (result.valid) {
      // Save session key so the expiry countdown can look it up
      localStorage.setItem("pubg_session_key", keyInput.trim());
      setTimeout(() => onUnlock(result.isAdmin), 600);
    }
  }

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      {/* Main Card */}
      <div
        className="rounded-2xl p-7 noise-bg"
        style={{
          background: "linear-gradient(145deg, #111118 0%, #0e0e16 100%)",
          border: "1px solid rgba(255,106,0,0.22)",
          boxShadow:
            "0 0 50px rgba(255,106,0,0.1), 0 24px 80px rgba(0,0,0,0.7)",
        }}
      >
        {/* Logo / Title Area */}
        <div className="text-center mb-8">
          {/* Crosshair graphic */}
          <div className="flex justify-center mb-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background:
                  "radial-gradient(circle, rgba(255,106,0,0.15) 0%, transparent 70%)",
                border: "1px solid rgba(255,106,0,0.3)",
              }}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 36 36"
                fill="none"
                role="img"
                aria-label="Crosshair target"
              >
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  stroke="#ff6a00"
                  strokeWidth="1.5"
                />
                <circle cx="18" cy="18" r="4.5" fill="#ff6a00" />
                <line
                  x1="18"
                  y1="1"
                  x2="18"
                  y2="9"
                  stroke="#ff6a00"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="18"
                  y1="27"
                  x2="18"
                  y2="35"
                  stroke="#ff6a00"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="1"
                  y1="18"
                  x2="9"
                  y2="18"
                  stroke="#ff6a00"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="27"
                  y1="18"
                  x2="35"
                  y2="18"
                  stroke="#ff6a00"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          <h1
            className="font-display font-black text-3xl tracking-[0.2em] mb-1 animate-flicker"
            style={{
              background:
                "linear-gradient(135deg, #ff6a00 0%, #ffcc00 60%, #ff9500 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            PUBG IOS CONFIG PANEL
          </h1>

          <p className="text-white/35 text-sm tracking-[0.12em] font-medium">
            Enter your key to unlock
          </p>
        </div>

        {/* Divider */}
        <div
          className="h-px mb-6"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(255,106,0,0.3), transparent)",
          }}
        />

        {/* Key Input */}
        <div className="space-y-3">
          <label
            htmlFor="landing-key-input"
            className="text-xs text-white/40 tracking-widest uppercase font-medium block"
          >
            Access Key
          </label>
          <input
            id="landing-key-input"
            type="text"
            value={keyInput}
            onChange={(e) => {
              setKeyInput(e.target.value);
              setStatus(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            placeholder="Enter your key..."
            className="w-full px-4 py-3.5 rounded-xl font-mono text-base input-gaming"
            autoComplete="off"
            spellCheck={false}
            data-ocid="landing.key_input"
          />

          {/* Status Message */}
          <div className="min-h-[22px]" data-ocid="landing.login_status">
            <AnimatePresence>
              {status && (
                <motion.p
                  className="text-sm font-medium px-1"
                  style={{ color: status.valid ? "#00ff88" : "#ff4444" }}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {status.message}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Unlock Button */}
          <button
            type="button"
            onClick={handleUnlock}
            className="w-full py-4 rounded-xl btn-orange"
            style={{
              boxShadow:
                "0 0 25px rgba(255,106,0,0.4), 0 0 50px rgba(255,106,0,0.2)",
            }}
            data-ocid="landing.unlock_button"
          >
            🔓 UNLOCK PANEL
          </button>
        </div>
      </div>

      {/* Admin Button */}
      <div className="flex justify-center mt-4">
        <button
          type="button"
          onClick={onAdminClick}
          className="px-6 py-2.5 rounded-lg text-xs font-bold tracking-[0.2em] uppercase transition-all hover:border-orange-500/40 hover:text-orange-400/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500/50"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.4)",
          }}
          data-ocid="landing.admin_button"
        >
          ⚙ Admin
        </button>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-white/15 mt-6 tracking-wide">
        © {new Date().getFullYear()}.{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          className="hover:text-white/30 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          Built with ❤ using caffeine.ai
        </a>
      </p>
    </motion.div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

const SECOND_PAGE_URL = "https://yeasty-ivory-psbl9qdff1.edgeone.app";

export default function App() {
  const [showAdminModal, setShowAdminModal] = useState(false);

  function handleUnlock(_adminFlag: boolean) {
    window.open(SECOND_PAGE_URL, "_blank", "noopener,noreferrer");
  }

  function handleAdminModalSuccess() {
    setShowAdminModal(false);
    window.open(SECOND_PAGE_URL, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 py-8"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, rgba(255,106,0,0.08) 0%, #0a0a0f 50%), #0a0a0f",
      }}
    >
      {/* Background grid texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,106,0,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,106,0,0.6) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Top bar decoration */}
      <div
        className="fixed top-0 left-0 right-0 h-0.5"
        style={{
          background:
            "linear-gradient(to right, transparent, #ff6a00, #ffcc00, #ff6a00, transparent)",
        }}
      />

      {/* Main Content */}
      <div className="w-full max-w-sm relative z-10">
        <LandingView
          onUnlock={handleUnlock}
          onAdminClick={() => setShowAdminModal(true)}
        />
      </div>

      {/* Admin Modal */}
      <AnimatePresence>
        {showAdminModal && (
          <AdminModal
            onClose={() => setShowAdminModal(false)}
            onSuccess={handleAdminModalSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
