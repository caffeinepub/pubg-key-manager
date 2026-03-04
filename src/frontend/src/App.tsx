import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyRecord, backendInterface } from "./backend.d";
import { useActor } from "./hooks/useActor";

// ─── Types ──────────────────────────────────────────────────────────────────

type Duration = "1" | "7" | "30" | "custom";
type AppView = "landing" | "panel";

// ─── Constants ───────────────────────────────────────────────────────────────

const ADMIN_KEY = "rohan2006";

// ─── Device Fingerprint ───────────────────────────────────────────────────────

function getDeviceId(): string {
  const stored = localStorage.getItem("pubg_device_id");
  if (stored) return stored;

  const raw = [
    navigator.userAgent,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join("|");

  // Simple djb2 hash
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash) ^ raw.charCodeAt(i);
    hash = hash >>> 0; // keep as uint32
  }
  const id = `dev_${hash.toString(16).padStart(8, "0")}`;
  localStorage.setItem("pubg_device_id", id);
  return id;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00s";
  const totalSecs = Math.floor(ms / 1000);
  const d = Math.floor(totalSecs / 86400);
  const h = Math.floor((totalSecs % 86400) / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
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

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({
  size = 16,
  color = "#ff6a00",
}: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      role="img"
      aria-label="Loading"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="2.5"
        strokeOpacity="0.2"
      />
      <path
        d="M12 2 A10 10 0 0 1 22 12"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Admin Modal ──────────────────────────────────────────────────────────────

interface AdminModalProps {
  onClose: () => void;
  onSuccess: () => void;
  actor: backendInterface | null;
}

function AdminModal({ onClose, onSuccess, actor }: AdminModalProps) {
  const [keyInput, setKeyInput] = useState("");
  const [error, setError] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [keys, setKeys] = useState<KeyRecord[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [duration, setDuration] = useState<Duration>("7");
  const [customDays, setCustomDays] = useState("3");
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  useEffect(() => {
    if (!loggedIn) setTimeout(() => inputRef.current?.focus(), 80);
  }, [loggedIn]);

  const fetchKeys = useCallback(async () => {
    if (!actor) return;
    setLoadingKeys(true);
    try {
      const result = await actor.getKeys(ADMIN_KEY);
      setKeys(result);
    } catch (err) {
      console.error("Failed to fetch keys:", err);
    } finally {
      setLoadingKeys(false);
    }
  }, [actor]);

  // Fetch keys on login + auto-refresh every 30s
  useEffect(() => {
    if (!loggedIn) return;

    fetchKeys();

    refreshIntervalRef.current = setInterval(fetchKeys, 30_000);
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [loggedIn, fetchKeys]);

  function handleLogin() {
    if (keyInput.trim() === ADMIN_KEY) {
      setLoggedIn(true);
    } else {
      setError("❌ Invalid admin key");
      setKeyInput("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function handleGenerate() {
    setGenerateError(null);

    if (!actor) {
      setGenerateError("⚠ Connecting to server, please wait...");
      return;
    }

    const days =
      duration === "1"
        ? 1
        : duration === "7"
          ? 7
          : duration === "30"
            ? 30
            : Math.max(1, Number.parseInt(customDays) || 1);

    setGenerating(true);
    try {
      const newKey = await actor.generateKey(ADMIN_KEY, BigInt(days));
      if (typeof newKey === "string" && newKey.startsWith("ERROR:")) {
        const msg = newKey.replace("ERROR:", "").trim();
        setGenerateError(`❌ ${msg || "Failed to generate key"}`);
        return;
      }
      setLastGenerated(newKey);
      setGenerateError(null);
      await fetchKeys();
    } catch (err) {
      console.error("Failed to generate key:", err);
      setGenerateError("❌ Network error, please try again");
    } finally {
      setGenerating(false);
    }
  }

  async function handleClearAll() {
    if (!actor) return;
    setClearingAll(true);
    try {
      await actor.clearAllKeys(ADMIN_KEY);
      setKeys([]);
      setLastGenerated(null);
    } catch (err) {
      console.error("Failed to clear keys:", err);
    } finally {
      setClearingAll(false);
    }
  }

  async function handleRemoveKey(keyValue: string) {
    if (!actor) return;
    setDeletingKey(keyValue);
    try {
      await actor.deleteKey(ADMIN_KEY, keyValue);
      setKeys((prev) => prev.filter((k) => k.keyValue !== keyValue));
      if (lastGenerated === keyValue) setLastGenerated(null);
    } catch (err) {
      console.error("Failed to delete key:", err);
    } finally {
      setDeletingKey(null);
    }
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
            {/* Open Admin Panel shortcut */}
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
              disabled={generating}
              className="w-full py-3 rounded-lg btn-green text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ boxShadow: "0 0 20px rgba(0,255,136,0.3)" }}
              data-ocid="keygen.generate_button"
            >
              {generating ? (
                <>
                  <Spinner size={15} color="#00ff88" />
                  <span>GENERATING...</span>
                </>
              ) : (
                "⚡ GENERATE KEY"
              )}
            </button>

            {/* Generate error display */}
            <AnimatePresence>
              {generateError && (
                <motion.p
                  className="text-sm font-medium px-1"
                  style={{ color: "#ff4444" }}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  data-ocid="keygen.error_state"
                >
                  {generateError}
                </motion.p>
              )}
            </AnimatePresence>

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
                <p
                  className="text-xs font-black tracking-widest uppercase"
                  style={{ color: "#ff6a00" }}
                >
                  🗄 KEY STORAGE
                </p>
                <div className="flex items-center gap-2">
                  {loadingKeys && (
                    <Spinner size={13} color="rgba(255,255,255,0.4)" />
                  )}
                  <span
                    className="text-xs font-mono"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    {keys.length} saved
                  </span>
                </div>
              </div>

              <div
                className="rounded-xl overflow-hidden"
                style={{ border: "1px solid rgba(255,255,255,0.07)" }}
                data-ocid="keygen.keys_list"
              >
                {loadingKeys && keys.length === 0 ? (
                  <div
                    className="py-8 text-center"
                    data-ocid="keygen.loading_state"
                  >
                    <div className="flex justify-center mb-2">
                      <Spinner size={20} color="rgba(255,106,0,0.6)" />
                    </div>
                    <p className="text-white/25 text-sm tracking-wider">
                      Loading keys...
                    </p>
                  </div>
                ) : keys.length === 0 ? (
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
                      className="grid px-3 py-2.5 text-xs font-bold tracking-widest uppercase"
                      style={{
                        gridTemplateColumns: "1fr auto auto auto auto auto",
                        gap: "0.4rem",
                        background: "rgba(255,255,255,0.04)",
                        color: "rgba(255,255,255,0.35)",
                        borderBottom: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <span>Key</span>
                      <span className="text-center">Days</span>
                      <span className="text-center">Expires</span>
                      <span className="text-center">Device</span>
                      <span />
                      <span />
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                      {keys.map((k, idx) => {
                        const expTs = Number(k.expiryTimestamp);
                        const expired = Date.now() > expTs;
                        const isBound =
                          k.boundDeviceId !== undefined &&
                          k.boundDeviceId !== null &&
                          k.boundDeviceId !== "";
                        const isDeleting = deletingKey === k.keyValue;
                        return (
                          <div
                            key={k.keyValue}
                            className={`grid items-center px-3 py-3 key-row ${expired ? "key-row-expired" : ""}`}
                            style={{
                              gridTemplateColumns:
                                "1fr auto auto auto auto auto",
                              gap: "0.4rem",
                              opacity: isDeleting ? 0.5 : 1,
                              transition: "opacity 0.2s ease",
                            }}
                            data-ocid={`keygen.key_item.${idx + 1}`}
                          >
                            <span
                              className={`font-mono text-xs font-bold tracking-wider truncate ${expired ? "line-through" : ""}`}
                              style={{
                                color: expired
                                  ? "rgba(255,255,255,0.3)"
                                  : "#ff6a00",
                              }}
                            >
                              {k.keyValue}
                            </span>
                            <span className="text-center text-xs text-white/50 shrink-0">
                              {Number(k.durationDays)}d
                            </span>
                            <span
                              className="text-center text-xs font-mono shrink-0"
                              style={{
                                color: expired
                                  ? "rgba(255,50,50,0.6)"
                                  : "rgba(255,255,255,0.45)",
                              }}
                            >
                              {expired ? "Expired" : formatExpiry(expTs)}
                            </span>
                            {/* Device badge */}
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide shrink-0"
                              style={
                                isBound
                                  ? {
                                      background: "rgba(255,150,0,0.15)",
                                      border: "1px solid rgba(255,150,0,0.4)",
                                      color: "#ffaa00",
                                    }
                                  : {
                                      background: "rgba(0,255,136,0.1)",
                                      border: "1px solid rgba(0,255,136,0.3)",
                                      color: "#00ff88",
                                    }
                              }
                              data-ocid={`keygen.device_badge.${idx + 1}`}
                              title={
                                isBound
                                  ? `Bound to: ${k.boundDeviceId}`
                                  : "Not yet bound to a device"
                              }
                            >
                              {isBound ? "🔒" : "🔓"}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                navigator.clipboard?.writeText(k.keyValue)
                              }
                              disabled={isDeleting}
                              className="w-6 h-6 flex items-center justify-center rounded text-xs font-black transition-all hover:scale-110 active:scale-95 disabled:opacity-40"
                              style={{
                                background: "rgba(0,170,255,0.1)",
                                border: "1px solid rgba(0,170,255,0.3)",
                                color: "#00aaff",
                              }}
                              aria-label={`Copy key ${k.keyValue}`}
                              data-ocid={`keygen.key_copy_button.${idx + 1}`}
                            >
                              ⧉
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveKey(k.keyValue)}
                              disabled={isDeleting}
                              className="w-6 h-6 flex items-center justify-center rounded text-xs font-black transition-all hover:scale-110 active:scale-95 disabled:opacity-40"
                              style={{
                                background: "rgba(255,50,50,0.12)",
                                border: "1px solid rgba(255,50,50,0.35)",
                                color: "#ff4444",
                              }}
                              aria-label={`Remove key ${k.keyValue}`}
                              data-ocid={`keygen.key_delete_button.${idx + 1}`}
                            >
                              {isDeleting ? (
                                <Spinner size={10} color="#ff4444" />
                              ) : (
                                "✕"
                              )}
                            </button>
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
                disabled={clearingAll}
                className="w-full py-2.5 rounded-lg text-xs font-bold tracking-widest uppercase transition-all hover:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: "rgba(255,50,50,0.08)",
                  border: "1px solid rgba(255,50,50,0.25)",
                  color: "#ff4444",
                }}
                data-ocid="keygen.clear_button"
              >
                {clearingAll ? (
                  <>
                    <Spinner size={12} color="#ff4444" />
                    <span>CLEARING...</span>
                  </>
                ) : (
                  "🗑 CLEAR ALL KEYS"
                )}
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
  onUnlock: (isAdmin: boolean, expiryTimestamp: number | null) => void;
  onAdminClick: () => void;
  actor: backendInterface | null;
}

function LandingView({ onUnlock, onAdminClick, actor }: LandingViewProps) {
  const [keyInput, setKeyInput] = useState("");
  const [status, setStatus] = useState<{
    message: string;
    valid: boolean;
  } | null>(null);
  const [validating, setValidating] = useState(false);

  async function handleUnlock() {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      setStatus({ message: "⚠ Please enter your key", valid: false });
      return;
    }

    if (!actor) {
      setStatus({ message: "⚠ Connecting to server...", valid: false });
      return;
    }

    setValidating(true);
    setStatus(null);

    try {
      const deviceId = getDeviceId();
      const result = await actor.validateAndBindKey(trimmed, deviceId);

      setStatus({ message: result.message, valid: result.valid });

      if (result.valid) {
        localStorage.setItem("pubg_session_key", trimmed);
        const expiry =
          result.expiryTimestamp !== undefined
            ? Number(result.expiryTimestamp)
            : null;
        setTimeout(() => onUnlock(result.isAdmin, expiry), 600);
      }
    } catch (err) {
      console.error("Validation error:", err);
      setStatus({ message: "❌ Connection error, try again", valid: false });
    } finally {
      setValidating(false);
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
            className="font-display font-black text-3xl tracking-[0.2em] mb-1"
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
            onKeyDown={(e) =>
              !validating && e.key === "Enter" && handleUnlock()
            }
            placeholder="Enter your key..."
            className="w-full px-4 py-3.5 rounded-xl font-mono text-base input-gaming"
            autoComplete="off"
            spellCheck={false}
            disabled={validating}
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
            disabled={validating}
            className="w-full py-4 rounded-xl btn-orange flex items-center justify-center gap-2 disabled:opacity-70"
            style={{
              boxShadow:
                "0 0 25px rgba(255,106,0,0.4), 0 0 50px rgba(255,106,0,0.2)",
            }}
            data-ocid="landing.unlock_button"
          >
            {validating ? (
              <>
                <Spinner size={17} color="#000" />
                <span>VALIDATING...</span>
              </>
            ) : (
              "🔓 UNLOCK PANEL"
            )}
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

// ─── GOD IOS Panel View ───────────────────────────────────────────────────────

interface Feature {
  id: string;
  label: string;
  enabled: boolean;
}

const INITIAL_FEATURES: Feature[] = [
  { id: "headtracking", label: "HEADTRACKING", enabled: true },
  { id: "aimassist", label: "AIM ASSIST", enabled: true },
  { id: "fps120", label: "120 FPS", enabled: true },
  { id: "smooth", label: "SMOOTH GAMEPLAY", enabled: true },
];

interface PanelViewProps {
  isAdmin: boolean;
  expiryTimestamp: number | null;
  onLogout: () => void;
}

function PanelView({ isAdmin, expiryTimestamp, onLogout }: PanelViewProps) {
  const [features, setFeatures] = useState<Feature[]>(INITIAL_FEATURES);
  const [countdown, setCountdown] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [applyStatus, setApplyStatus] = useState<{
    message: string;
    valid: boolean;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Live countdown timer
  useEffect(() => {
    if (isAdmin || expiryTimestamp === null) {
      setCountdown("Lifetime Access");
      return;
    }

    function tick() {
      const remaining = expiryTimestamp! - Date.now();
      if (remaining <= 0) {
        setCountdown("Expired");
      } else {
        setCountdown(formatCountdown(remaining));
      }
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isAdmin, expiryTimestamp]);

  function toggleFeature(id: string) {
    setFeatures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)),
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setApplyStatus(null);
  }

  function handleApplyFile() {
    if (selectedFile) {
      setApplyStatus({
        message: `✅ File Selected: ${selectedFile.name}`,
        valid: true,
      });
    } else {
      setApplyStatus({ message: "❌ No file selected", valid: false });
    }
  }

  const isExpired =
    !isAdmin && expiryTimestamp !== null && Date.now() > expiryTimestamp;
  const isLifetime = isAdmin || expiryTimestamp === null;

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      data-ocid="panel.page"
    >
      {/* Panel Card */}
      <div
        className="rounded-2xl overflow-hidden noise-bg"
        style={{
          background: "linear-gradient(160deg, #0d0d15 0%, #0a0a12 100%)",
          border: "1px solid rgba(0,170,255,0.25)",
          boxShadow:
            "0 0 60px rgba(0,170,255,0.1), 0 24px 80px rgba(0,0,0,0.8)",
        }}
      >
        {/* Panel Header */}
        <div
          className="px-6 pt-6 pb-4"
          style={{
            borderBottom: "1px solid rgba(0,170,255,0.15)",
            background:
              "linear-gradient(180deg, rgba(0,170,255,0.06) 0%, transparent 100%)",
          }}
        >
          {/* Top bar with logout */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all hover:opacity-80"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.4)",
              }}
              data-ocid="panel.logout_button"
            >
              ← BACK
            </button>
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: "#00ff88" }}
            />
          </div>

          {/* Title */}
          <h1
            className="font-display font-black text-2xl tracking-[0.18em] text-center"
            style={{
              color: "#00aaff",
              textShadow:
                "0 0 20px rgba(0,170,255,0.5), 0 0 40px rgba(0,170,255,0.2)",
            }}
          >
            GOD IOS PANEL
          </h1>

          {/* Expiry countdown */}
          <div className="mt-3 text-center" data-ocid="panel.countdown_section">
            {isLifetime ? (
              <span
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
                style={{
                  background: "rgba(0,255,136,0.1)",
                  border: "1px solid rgba(0,255,136,0.3)",
                  color: "#00ff88",
                }}
              >
                ♾ Lifetime Access — No Expiry
              </span>
            ) : isExpired ? (
              <span
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
                style={{
                  background: "rgba(255,50,50,0.1)",
                  border: "1px solid rgba(255,50,50,0.3)",
                  color: "#ff4444",
                }}
              >
                ✕ Session Expired
              </span>
            ) : (
              <div className="space-y-1">
                <p className="text-white/35 text-xs tracking-widest uppercase">
                  Time Remaining
                </p>
                <span
                  className="font-mono font-black text-xl tracking-widest"
                  style={{
                    color: "#00aaff",
                    textShadow: "0 0 12px rgba(0,170,255,0.4)",
                  }}
                  data-ocid="panel.countdown_timer"
                >
                  {countdown}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Divider glow */}
        <div
          className="h-px"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(0,170,255,0.4), transparent)",
          }}
        />

        {/* Features Section */}
        <div className="px-5 py-4">
          <p className="text-xs text-white/30 tracking-widest uppercase font-bold mb-3">
            Features
          </p>

          <div className="space-y-2" data-ocid="panel.features_list">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{
                  background: feature.enabled
                    ? "rgba(0,170,255,0.07)"
                    : "rgba(255,255,255,0.03)",
                  border: feature.enabled
                    ? "1px solid rgba(0,170,255,0.2)"
                    : "1px solid rgba(255,255,255,0.07)",
                  transition: "all 0.2s ease",
                }}
                data-ocid={`panel.feature.item.${idx + 1}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      background: feature.enabled
                        ? "#00aaff"
                        : "rgba(255,255,255,0.2)",
                      boxShadow: feature.enabled
                        ? "0 0 6px rgba(0,170,255,0.6)"
                        : "none",
                    }}
                  />
                  <span
                    className="text-sm font-bold tracking-[0.12em]"
                    style={{
                      color: feature.enabled
                        ? "#e8f4ff"
                        : "rgba(255,255,255,0.3)",
                    }}
                  >
                    {feature.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleFeature(feature.id)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all hover:scale-110 active:scale-95"
                  style={{
                    background: feature.enabled
                      ? "rgba(255,50,50,0.15)"
                      : "rgba(0,255,136,0.12)",
                    border: feature.enabled
                      ? "1px solid rgba(255,50,50,0.4)"
                      : "1px solid rgba(0,255,136,0.3)",
                    color: feature.enabled ? "#ff4444" : "#00ff88",
                  }}
                  aria-label={
                    feature.enabled
                      ? `Disable ${feature.label}`
                      : `Enable ${feature.label}`
                  }
                  data-ocid={`panel.feature.toggle.${idx + 1}`}
                >
                  {feature.enabled ? "✕" : "✓"}
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div
          className="mx-5 h-px"
          style={{ background: "rgba(255,255,255,0.07)" }}
        />

        {/* File Selector */}
        <div className="px-5 py-4">
          <p className="text-xs text-white/30 tracking-widest uppercase font-bold mb-3">
            Config File
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pak,.zip,.obb,*/*"
            onChange={handleFileChange}
            style={{
              display: "block",
              width: "100%",
              padding: "12px 16px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "12px",
              color: "rgba(255,255,255,0.6)",
              fontSize: "14px",
              fontWeight: "bold",
              letterSpacing: "0.05em",
              cursor: "pointer",
            }}
            data-ocid="panel.upload_button"
          />
          {selectedFile && (
            <p
              className="mt-2 text-xs font-mono truncate px-1"
              style={{ color: "#00aaff" }}
            >
              📁 {selectedFile.name}
            </p>
          )}
        </div>

        {/* Divider */}
        <div
          className="mx-5 h-px"
          style={{ background: "rgba(255,255,255,0.07)" }}
        />

        {/* Action Buttons */}
        <div className="px-5 py-4 space-y-2.5">
          <p className="text-xs text-white/30 tracking-widest uppercase font-bold mb-3">
            Actions
          </p>

          {/* APPLY FILE */}
          <button
            type="button"
            onClick={handleApplyFile}
            className="w-full py-3.5 rounded-xl text-sm font-black tracking-widest uppercase transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #00c96a 0%, #00aaff 100%)",
              color: "#000",
              boxShadow:
                "0 0 20px rgba(0,200,136,0.3), 0 0 40px rgba(0,170,255,0.15)",
            }}
            data-ocid="panel.apply_file_button"
          >
            ✔ APPLY FILE
          </button>

          {/* Apply status message */}
          <AnimatePresence>
            {applyStatus && (
              <motion.p
                className="text-sm font-medium text-center px-1"
                style={{ color: applyStatus.valid ? "#00ff88" : "#ff4444" }}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                data-ocid="panel.apply_status"
              >
                {applyStatus.message}
              </motion.p>
            )}
          </AnimatePresence>

          {/* ADD BGMI SHORTCUT */}
          <a
            href="https://www.icloud.com/shortcuts/8369cb589ee94e38b2d3e3ca4c1d7c65"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 rounded-xl text-sm font-bold tracking-widest uppercase text-center transition-all hover:opacity-80 active:scale-[0.98]"
            style={{
              background: "rgba(255,170,0,0.1)",
              border: "1px solid rgba(255,170,0,0.3)",
              color: "#ffaa00",
            }}
            data-ocid="panel.add_bgmi_shortcut_button"
          >
            + ADD BGMI SHORTCUT
          </a>

          {/* ADD PUBG SHORTCUT */}
          <a
            href="https://www.icloud.com/shortcuts/eaf67676f88d4bc8851d6bff7344bfe1"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 rounded-xl text-sm font-bold tracking-widest uppercase text-center transition-all hover:opacity-80 active:scale-[0.98]"
            style={{
              background: "rgba(255,106,0,0.1)",
              border: "1px solid rgba(255,106,0,0.3)",
              color: "#ff6a00",
            }}
            data-ocid="panel.add_pubg_shortcut_button"
          >
            + ADD PUBG SHORTCUT
          </a>

          {/* OPEN BGMI */}
          <a
            href="shortcuts://run-shortcut?name=GOD_IOS_BGMI"
            className="block w-full py-3 rounded-xl text-sm font-bold tracking-widest uppercase text-center transition-all hover:opacity-80 active:scale-[0.98]"
            style={{
              background: "rgba(0,200,255,0.08)",
              border: "1px solid rgba(0,200,255,0.25)",
              color: "#00c8ff",
            }}
            data-ocid="panel.open_bgmi_button"
          >
            ▶ OPEN BGMI
          </a>

          {/* OPEN PUBG */}
          <a
            href="shortcuts://run-shortcut?name=GOD_IOS_PUBG"
            className="block w-full py-3 rounded-xl text-sm font-bold tracking-widest uppercase text-center transition-all hover:opacity-80 active:scale-[0.98]"
            style={{
              background: "rgba(255,106,0,0.08)",
              border: "1px solid rgba(255,106,0,0.25)",
              color: "#ff6a00",
            }}
            data-ocid="panel.open_pubg_button"
          >
            ▶ OPEN PUBG
          </a>
        </div>
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

export default function App() {
  const { actor } = useActor();
  const [view, setView] = useState<AppView>("landing");
  const [isAdmin, setIsAdmin] = useState(false);
  const [expiryTimestamp, setExpiryTimestamp] = useState<number | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);

  function handleUnlock(adminFlag: boolean, expiry: number | null) {
    setIsAdmin(adminFlag);
    setExpiryTimestamp(expiry);
    setView("panel");
  }

  function handleAdminModalSuccess() {
    setShowAdminModal(false);
    setIsAdmin(true);
    setExpiryTimestamp(null);
    setView("panel");
  }

  function handleLogout() {
    setView("landing");
    setIsAdmin(false);
    setExpiryTimestamp(null);
    localStorage.removeItem("pubg_session_key");
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
        <AnimatePresence mode="wait">
          {view === "landing" ? (
            <motion.div key="landing">
              <LandingView
                onUnlock={handleUnlock}
                onAdminClick={() => setShowAdminModal(true)}
                actor={actor}
              />
            </motion.div>
          ) : (
            <motion.div key="panel">
              <PanelView
                isAdmin={isAdmin}
                expiryTimestamp={expiryTimestamp}
                onLogout={handleLogout}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Admin Modal */}
      <AnimatePresence>
        {showAdminModal && (
          <AdminModal
            onClose={() => setShowAdminModal(false)}
            onSuccess={handleAdminModalSuccess}
            actor={actor}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
