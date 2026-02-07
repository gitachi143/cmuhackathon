import { useState, useRef } from "react";
import { motion } from "framer-motion";
import type { UIProduct, UserProfile, PersonalInfo, ShippingAddress, SavedCardDetails } from "../../types";
import { startAutoCheckout, cancelAutoCheckout } from "../../api/checkout";
import type { CheckoutStatus } from "../../api/checkout";

interface BuyModalProps {
  product: UIProduct;
  savedCard: UserProfile["saved_card"];
  personalInfo: PersonalInfo;
  shippingAddress: ShippingAddress;
  onConfirm: (p: UIProduct, card: string) => void;
  onClose: () => void;
  onSaveCard: (card: SavedCardDetails) => void;
  onSavePersonalInfo: (info: PersonalInfo) => void;
  onSaveAddress: (addr: ShippingAddress) => void;
}

const STEP_ICONS: Record<string, string> = {
  launching: "\u{1F680}",
  navigating: "\u{1F310}",
  searching: "\u{1F50D}",
  selecting: "\u{1F446}",
  adding_to_cart: "\u{1F6D2}",
  added_to_cart: "\u2705",
  going_to_cart: "\u{1F6D2}",
  checkout: "\u{1F4B3}",
  filling_info: "\u270D\uFE0F",
  info_filled: "\u2705",
  login_required: "\u{1F512}",
  done: "\u{1F389}",
  error: "\u274C",
  warning: "\u26A0\uFE0F",
  cancelled: "\u23F9\uFE0F",
};

export function BuyModal({
  product,
  savedCard,
  personalInfo,
  shippingAddress,
  onConfirm,
  onClose,
  onSaveCard,
  onSavePersonalInfo,
  onSaveAddress,
}: BuyModalProps) {
  const needsDetails = !savedCard || !personalInfo.name || !shippingAddress.address_line;
  const [step, setStep] = useState(needsDetails ? "details" : "confirm");
  const [nickname, setNickname] = useState(savedCard?.nickname || "Visa ending in 1234");
  const [lastFour, setLastFour] = useState(savedCard?.last_four || "1234");
  const [isVirtual, setIsVirtual] = useState(savedCard?.is_virtual || false);
  const [name, setName] = useState(personalInfo.name || "");
  const [email, setEmail] = useState(personalInfo.email || "");
  const [addressLine, setAddressLine] = useState(shippingAddress.address_line || "");
  const [city, setCity] = useState(shippingAddress.city || "");
  const [addrState, setAddrState] = useState(shippingAddress.state || "");
  const [zip, setZip] = useState(shippingAddress.zip || "");
  const [success, setSuccess] = useState(false);

  // Auto-checkout state
  const [autoCheckoutActive, setAutoCheckoutActive] = useState(false);
  const [statusLog, setStatusLog] = useState<CheckoutStatus[]>([]);
  const [autoCheckoutDone, setAutoCheckoutDone] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const fullAddress = [addressLine, city, addrState, zip].filter(Boolean).join(", ");
  const autofillFields = {
    name: name || personalInfo.name || "Not set",
    email: email || personalInfo.email || "Not set",
    address: fullAddress || "Not set",
    card: savedCard?.nickname || nickname,
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid var(--border-input)",
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 8,
    fontSize: 14,
    boxSizing: "border-box" as const,
    background: "var(--bg-input)",
    color: "var(--text-primary)",
  };

  const handleAutoCheckout = () => {
    const info: PersonalInfo = { name: name || personalInfo.name, email: email || personalInfo.email };
    const addr: ShippingAddress = {
      address_line: addressLine || shippingAddress.address_line,
      city: city || shippingAddress.city,
      state: addrState || shippingAddress.state,
      zip: zip || shippingAddress.zip,
    };

    setAutoCheckoutActive(true);
    setStatusLog([]);
    setAutoCheckoutDone(false);
    setStep("auto");

    startAutoCheckout(
      product.title,
      info,
      addr,
      (status) => {
        setStatusLog((prev) => [...prev, status]);
        // Auto-scroll
        setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      },
      () => {
        setAutoCheckoutDone(true);
        setAutoCheckoutActive(false);
      },
      (err) => {
        setStatusLog((prev) => [...prev, { step: "error", message: err }]);
        setAutoCheckoutDone(true);
        setAutoCheckoutActive(false);
      }
    );
  };

  const handleCancelAuto = () => {
    cancelAutoCheckout();
    setAutoCheckoutActive(false);
    setAutoCheckoutDone(true);
    setStatusLog((prev) => [...prev, { step: "cancelled", message: "Cancelled by user." }]);
  };

  // ── Auto-checkout live view ────────────────────────
  if (step === "auto") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--overlay)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
        }}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          style={{
            background: "var(--bg-surface)",
            borderRadius: 16,
            padding: 24,
            maxWidth: 440,
            width: "90%",
            maxHeight: "80vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: "var(--text-primary)", fontSize: 16 }}>
              {"\u{1F916}"} Auto-Checkout on Amazon
            </h3>
            {autoCheckoutActive && (
              <span
                style={{
                  fontSize: 11,
                  padding: "3px 10px",
                  borderRadius: 99,
                  background: "#22c55e20",
                  color: "#22c55e",
                  fontWeight: 600,
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              >
                LIVE
              </span>
            )}
          </div>

          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
            {product.title} &middot; ${product.price.toFixed(2)}
          </div>

          {/* Status log */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              background: "var(--bg-surface-hover, #0a0a0a)",
              borderRadius: 10,
              padding: 12,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize: 12,
              minHeight: 200,
              maxHeight: 340,
            }}
          >
            {statusLog.length === 0 && (
              <div style={{ color: "var(--text-faint)", textAlign: "center", padding: 20 }}>
                Starting automation...
              </div>
            )}
            {statusLog.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                style={{
                  display: "flex",
                  gap: 8,
                  padding: "6px 0",
                  borderBottom: i < statusLog.length - 1 ? "1px solid var(--border-default, #222)" : "none",
                  color:
                    s.step === "error" ? "#ef4444" :
                    s.step === "done" ? "#22c55e" :
                    s.step === "warning" || s.step === "login_required" ? "#f59e0b" :
                    "var(--text-secondary)",
                }}
              >
                <span style={{ flexShrink: 0 }}>{STEP_ICONS[s.step] || "\u2022"}</span>
                <span>{s.message}</span>
              </motion.div>
            ))}
            <div ref={logEndRef} />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            {autoCheckoutActive ? (
              <button
                onClick={handleCancelAuto}
                style={{
                  flex: 1,
                  background: "#ef444420",
                  color: "#ef4444",
                  border: "1px solid #ef444440",
                  borderRadius: 8,
                  padding: "10px 0",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Cancel
              </button>
            ) : autoCheckoutDone ? (
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  background: "var(--bg-btn-primary)",
                  color: "var(--text-on-primary)",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 0",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Done
              </button>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // ── Success screen ──────────────────────────────────
  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--overlay)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
        }}
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          style={{
            background: "var(--bg-surface)",
            borderRadius: 16,
            padding: 32,
            textAlign: "center",
            maxWidth: 380,
          }}
        >
          <div style={{ fontSize: 48 }}>{"\u{1F389}"}</div>
          <h3 style={{ margin: "12px 0 4px", color: "var(--text-primary)" }}>Order Placed!</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            {product.title} — ${product.price.toFixed(2)}
          </p>
          <p style={{ color: "var(--text-faint)", fontSize: 12 }}>
            This is a simulated purchase. No real charge.
          </p>
          <button
            onClick={onClose}
            style={{
              marginTop: 12,
              background: "var(--bg-btn-primary)",
              color: "var(--text-on-primary)",
              border: "none",
              borderRadius: 8,
              padding: "10px 24px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Done
          </button>
        </motion.div>
      </motion.div>
    );
  }

  // ── Main modal ──────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--overlay)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-surface)",
          borderRadius: 16,
          padding: 24,
          maxWidth: 400,
          width: "90%",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        {step === "details" ? (
          <>
            <h3 style={{ margin: "0 0 4px", color: "var(--text-primary)" }}>Your Details</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 16px" }}>
              Saved locally for one-click purchases
            </p>

            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              Personal Info
            </div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Johnson" style={inputStyle} />
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@example.com" type="email" style={inputStyle} />

            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              Shipping Address
            </div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Address</label>
            <input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="5032 Forbes Ave" style={inputStyle} />
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>City</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Pittsburgh" style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>State</label>
                <input value={addrState} onChange={(e) => setAddrState(e.target.value)} placeholder="PA" style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>ZIP</label>
                <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="15213" style={inputStyle} />
              </div>
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, margin: "12px 0 6px" }}>
              Payment
            </div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Card Nickname</label>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} style={inputStyle} />
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Last 4 Digits</label>
            <input
              value={lastFour}
              onChange={(e) => setLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="1234"
              maxLength={4}
              style={inputStyle}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
              <input type="checkbox" checked={isVirtual} onChange={(e) => setIsVirtual(e.target.checked)} /> Use a virtual card
            </label>

            <p style={{ fontSize: 11, color: "var(--text-faint)", margin: "8px 0 0" }}>
              {"\u{1F512}"} All data stored locally on your device only — no real charges
            </p>
            <button
              onClick={() => {
                onSavePersonalInfo({ name, email });
                onSaveAddress({ address_line: addressLine, city, state: addrState, zip });
                onSaveCard({ nickname, card_type: "visa", is_virtual: isVirtual, last_four: lastFour });
                setStep("confirm");
              }}
              style={{
                width: "100%",
                marginTop: 16,
                background: "var(--bg-btn-primary)",
                color: "var(--text-on-primary)",
                border: "none",
                borderRadius: 8,
                padding: "10px 0",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Save & Continue
            </button>
          </>
        ) : (
          <>
            <h3 style={{ margin: "0 0 12px", color: "var(--text-primary)" }}>Confirm Purchase</h3>
            <div style={{ background: "var(--bg-surface-hover)", borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{product.title}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {product.brand} {"\u00B7"} {product.shipping_eta}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: "var(--text-primary)" }}>
                ${product.price.toFixed(2)}
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
              Paying with: <strong>{savedCard?.nickname || nickname}</strong>
            </div>
            <div style={{ background: "var(--bg-autofill)", borderRadius: 8, padding: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-autofill-title)", marginBottom: 4 }}>
                {"\u{1F50D}"} Fields we would auto-fill:
              </div>
              {Object.entries(autofillFields).map(([k, v]) => (
                <div key={k} style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>{k}:</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Auto-checkout on Amazon button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleAutoCheckout}
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, #ff9900, #ffad33)",
                  color: "#0f1111",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 0",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <span>{"\u{1F916}"}</span>
                Auto-Checkout on Amazon
              </motion.button>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={onClose}
                  style={{
                    flex: 1,
                    background: "var(--bg-btn-secondary)",
                    border: "1px solid var(--border-default)",
                    borderRadius: 8,
                    padding: "10px 0",
                    cursor: "pointer",
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSuccess(true);
                    onConfirm(product, savedCard?.nickname || nickname);
                  }}
                  style={{
                    flex: 2,
                    background: "var(--bg-btn-primary)",
                    color: "var(--text-on-primary)",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 0",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Simulate Purchase
                </motion.button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
