import { useState } from "react";
import { motion } from "framer-motion";
import type { UIProduct, UserProfile, PersonalInfo, ShippingAddress, SavedCardDetails } from "../../types";

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
                Confirm Purchase
              </motion.button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
