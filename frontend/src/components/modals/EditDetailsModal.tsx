import { useState } from "react";
import { motion } from "framer-motion";
import type { PersonalInfo, ShippingAddress, SavedCardDetails } from "../../types";

interface EditDetailsModalProps {
  personalInfo: PersonalInfo;
  shippingAddress: ShippingAddress;
  savedCard: SavedCardDetails | null;
  onSave: (info: PersonalInfo, addr: ShippingAddress, card: SavedCardDetails | null) => void;
  onClose: () => void;
}

export function EditDetailsModal({ personalInfo, shippingAddress, savedCard, onSave, onClose }: EditDetailsModalProps) {
  const [name, setName] = useState(personalInfo.name);
  const [email, setEmail] = useState(personalInfo.email);
  const [addressLine, setAddressLine] = useState(shippingAddress.address_line);
  const [city, setCity] = useState(shippingAddress.city);
  const [addrState, setAddrState] = useState(shippingAddress.state);
  const [zip, setZip] = useState(shippingAddress.zip);
  const [cardNickname, setCardNickname] = useState(savedCard?.nickname || "");
  const [lastFour, setLastFour] = useState(savedCard?.last_four || "");
  const [isVirtual, setIsVirtual] = useState(savedCard?.is_virtual || false);

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

  return (
    <motion.div
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "var(--bg-surface)",
        borderRadius: 16,
        padding: 24,
        maxWidth: 420,
        width: "90%",
        maxHeight: "85vh",
        overflowY: "auto",
      }}
    >
      <h3 style={{ margin: "0 0 4px", color: "var(--text-primary)" }}>Edit Your Details</h3>
      <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 16px" }}>
        All data is stored locally on your device
      </p>

      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
        Personal Info
      </div>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Full Name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Johnson" style={inputStyle} />
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Email</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@example.com" type="email" style={inputStyle} />

      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, margin: "4px 0 6px" }}>
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

      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, margin: "4px 0 6px" }}>
        Payment Card
      </div>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Card Nickname</label>
      <input value={cardNickname} onChange={(e) => setCardNickname(e.target.value)} placeholder="Visa ending in 1234" style={inputStyle} />
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
        {"\u{1F512}"} Stored locally only — never sent to any server
      </p>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: "10px 0",
            fontSize: 13,
            fontWeight: 500,
            background: "var(--bg-btn-secondary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-default)",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onSave(
              { name, email },
              { address_line: addressLine, city, state: addrState, zip },
              cardNickname ? { nickname: cardNickname, card_type: "visa", is_virtual: isVirtual, last_four: lastFour } : null
            );
          }}
          style={{
            flex: 2,
            padding: "10px 0",
            fontSize: 13,
            fontWeight: 600,
            background: "var(--bg-btn-primary)",
            color: "var(--text-on-primary)",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Save Details
        </button>
      </div>
    </motion.div>
  );
}
