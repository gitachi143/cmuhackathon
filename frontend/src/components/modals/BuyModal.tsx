import { useState, useMemo } from "react";
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

/* Determine which size options to show based on product category */
function getSizeOptions(category: string): string[] {
  const cat = category.toLowerCase();
  if (
    cat.includes("shoe") ||
    cat.includes("sneaker") ||
    cat.includes("boot") ||
    cat.includes("footwear")
  ) {
    return ["6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "13"];
  }
  if (
    cat.includes("jacket") ||
    cat.includes("hoodie") ||
    cat.includes("shirt") ||
    cat.includes("dress") ||
    cat.includes("pants") ||
    cat.includes("sweater") ||
    cat.includes("coat") ||
    cat.includes("apparel") ||
    cat.includes("clothing") ||
    cat.includes("wear")
  ) {
    return ["XS", "S", "M", "L", "XL", "XXL"];
  }
  // Electronics, monitors, furniture, etc. — no size needed
  return [];
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

  const sizeOptions = useMemo(() => getSizeOptions(product.category), [product.category]);
  const needsSize = sizeOptions.length > 0;

  const [step, setStep] = useState<"details" | "review" | "success">(
    needsDetails ? "details" : "review"
  );
  const [selectedSize, setSelectedSize] = useState(sizeOptions.length > 0 ? sizeOptions[2] || sizeOptions[0] : "");

  // Form fields for details step
  const [nickname, setNickname] = useState(savedCard?.nickname || "Visa ending in 1234");
  const [lastFour, setLastFour] = useState(savedCard?.last_four || "1234");
  const [isVirtual, setIsVirtual] = useState(savedCard?.is_virtual || false);
  const [name, setName] = useState(personalInfo.name || "");
  const [email, setEmail] = useState(personalInfo.email || "");
  const [addressLine, setAddressLine] = useState(shippingAddress.address_line || "");
  const [city, setCity] = useState(shippingAddress.city || "");
  const [addrState, setAddrState] = useState(shippingAddress.state || "");
  const [zip, setZip] = useState(shippingAddress.zip || "");

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateDetails = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    if (!addressLine.trim()) newErrors.address = "Address is required";
    if (!city.trim()) newErrors.city = "City is required";
    if (!addrState.trim()) newErrors.state = "State is required";
    if (!zip.trim()) newErrors.zip = "ZIP is required";
    if (!lastFour.trim() || lastFour.length < 4) newErrors.card = "Enter 4-digit card number";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Computed values for review
  const displayName = name || personalInfo.name;
  const displayEmail = email || personalInfo.email;
  const displayAddress = [
    addressLine || shippingAddress.address_line,
    city || shippingAddress.city,
    addrState || shippingAddress.state,
    zip || shippingAddress.zip,
  ].filter(Boolean).join(", ");
  const displayCard = savedCard?.nickname || nickname;
  const displayCardLast4 = savedCard?.last_four || lastFour;
  const displayCardVirtual = savedCard?.is_virtual ?? isVirtual;

  const estimatedTax = +(product.price * 0.08).toFixed(2);
  const shippingCost = product.price >= 50 ? 0 : 5.99;
  const orderTotal = +(product.price + estimatedTax + shippingCost).toFixed(2);

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid var(--border-input)",
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 2,
    fontSize: 14,
    boxSizing: "border-box" as const,
    background: "var(--bg-input)",
    color: "var(--text-primary)",
  };

  const errorStyle = {
    fontSize: 11,
    color: "var(--text-danger)",
    marginBottom: 6,
    minHeight: 14,
  };

  const sectionTitleStyle = {
    fontSize: 11,
    fontWeight: 700 as const,
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  };

  const reviewRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 13,
    padding: "6px 0",
    borderBottom: "1px solid var(--border-default)",
  };

  // ── SUCCESS SCREEN ──────────────────────────────────
  if (step === "success") {
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
          initial={{ scale: 0.8, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          style={{
            background: "var(--bg-surface)",
            borderRadius: 16,
            padding: 28,
            maxWidth: 420,
            width: "90%",
            maxHeight: "85vh",
            overflowY: "auto",
          }}
        >
          {/* Success header */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
              style={{ fontSize: 56, marginBottom: 8 }}
            >
              {"\u2705"}
            </motion.div>
            <h3 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
              Order Placed!
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>
              Confirmation sent to {displayEmail}
            </p>
          </div>

          {/* Order summary card */}
          <div
            style={{
              background: "var(--bg-surface-hover)",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.title}
                  style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 8,
                    background: "var(--bg-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                  }}
                >
                  {"\u{1F4E6}"}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{product.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{product.brand}</div>
                {needsSize && selectedSize && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Size: {selectedSize}</div>
                )}
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: 10 }}>
              <div style={{ ...reviewRowStyle, borderBottom: "none", padding: "3px 0" }}>
                <span style={{ color: "var(--text-muted)" }}>Subtotal</span>
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>${product.price.toFixed(2)}</span>
              </div>
              <div style={{ ...reviewRowStyle, borderBottom: "none", padding: "3px 0" }}>
                <span style={{ color: "var(--text-muted)" }}>Shipping</span>
                <span style={{ color: shippingCost === 0 ? "var(--text-success)" : "var(--text-primary)", fontWeight: 500 }}>
                  {shippingCost === 0 ? "FREE" : `$${shippingCost.toFixed(2)}`}
                </span>
              </div>
              <div style={{ ...reviewRowStyle, borderBottom: "none", padding: "3px 0" }}>
                <span style={{ color: "var(--text-muted)" }}>Est. Tax</span>
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>${estimatedTax.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid var(--border-default)", marginTop: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>Total</span>
                <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>${orderTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Shipping & Payment summary */}
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Ships to: </span>
              {displayAddress}
            </div>
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Delivery: </span>
              {product.shipping_eta}
            </div>
            <div>
              <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Paid with: </span>
              {displayCard}
            </div>
          </div>

          <p style={{ fontSize: 11, color: "var(--text-faint)", textAlign: "center", margin: "0 0 16px" }}>
            {"\u{1F512}"} This is a simulated purchase. No real charge was made.
          </p>

          <button
            onClick={onClose}
            style={{
              width: "100%",
              background: "var(--bg-btn-primary)",
              color: "var(--text-on-primary)",
              border: "none",
              borderRadius: 8,
              padding: "10px 0",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Done
          </button>
        </motion.div>
      </motion.div>
    );
  }

  // ── DETAILS ENTRY FORM ──────────────────────────────
  if (step === "details") {
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
            maxWidth: 420,
            width: "90%",
            maxHeight: "85vh",
            overflowY: "auto",
          }}
        >
          <h3 style={{ margin: "0 0 4px", color: "var(--text-primary)" }}>Enter Your Details</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 12px" }}>
            Saved locally for future one-click purchases
          </p>

          {/* Product preview */}
          <div
            style={{
              display: "flex",
              gap: 10,
              background: "var(--bg-surface-hover)",
              borderRadius: 10,
              padding: 10,
              marginBottom: 12,
            }}
          >
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.title}
                style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: "var(--bg-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                {"\u{1F4E6}"}
              </div>
            )}
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>{product.title}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                ${product.price.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div style={sectionTitleStyle}>Personal Info</div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Full Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Johnson" style={inputStyle} />
          <div style={errorStyle}>{errors.name || ""}</div>

          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@example.com" type="email" style={inputStyle} />
          <div style={errorStyle}>{errors.email || ""}</div>

          {/* Shipping Address */}
          <div style={sectionTitleStyle}>Shipping Address</div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Address</label>
          <input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="5032 Forbes Ave" style={inputStyle} />
          <div style={errorStyle}>{errors.address || ""}</div>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 2 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>City</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Pittsburgh" style={inputStyle} />
              <div style={errorStyle}>{errors.city || ""}</div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>State</label>
              <input value={addrState} onChange={(e) => setAddrState(e.target.value)} placeholder="PA" style={inputStyle} />
              <div style={errorStyle}>{errors.state || ""}</div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>ZIP</label>
              <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="15213" style={inputStyle} />
              <div style={errorStyle}>{errors.zip || ""}</div>
            </div>
          </div>

          {/* Payment */}
          <div style={sectionTitleStyle}>Payment</div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Card Nickname</label>
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} style={inputStyle} />
          <div style={{ marginBottom: 6 }} />

          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Last 4 Digits</label>
          <input
            value={lastFour}
            onChange={(e) => setLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="1234"
            maxLength={4}
            style={inputStyle}
          />
          <div style={errorStyle}>{errors.card || ""}</div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
            <input type="checkbox" checked={isVirtual} onChange={(e) => setIsVirtual(e.target.checked)} /> Use a virtual card
          </label>

          <p style={{ fontSize: 11, color: "var(--text-faint)", margin: "8px 0 0" }}>
            {"\u{1F512}"} All data stored locally on your device only — no real charges
          </p>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
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
            <button
              onClick={() => {
                if (!validateDetails()) return;
                onSavePersonalInfo({ name, email });
                onSaveAddress({ address_line: addressLine, city, state: addrState, zip });
                onSaveCard({ nickname, card_type: "visa", is_virtual: isVirtual, last_four: lastFour });
                setStep("review");
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
              Save & Review Order
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // ── ORDER REVIEW SCREEN ─────────────────────────────
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
          maxWidth: 440,
          width: "90%",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
          Review Your Order
        </h3>

        {/* ── Product Details ──────────────────────── */}
        <div
          style={{
            background: "var(--bg-surface-hover)",
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", gap: 12 }}>
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.title}
                style={{ width: 72, height: 72, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 8,
                  background: "var(--bg-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  flexShrink: 0,
                }}
              >
                {"\u{1F4E6}"}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", lineHeight: 1.3 }}>
                {product.title}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{product.brand}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
                  ${product.price.toFixed(2)}
                </span>
                {product.original_price && (
                  <span style={{ fontSize: 13, color: "var(--text-faint)", textDecoration: "line-through" }}>
                    ${product.original_price.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Key features */}
          {Object.keys(product.specs).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
              {Object.entries(product.specs).map(([k, v]) => (
                <span
                  key={k}
                  style={{
                    fontSize: 10,
                    background: "var(--bg-muted)",
                    color: "var(--text-secondary)",
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  {v}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Size Selection ────────────────────────── */}
        {needsSize && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...sectionTitleStyle, marginTop: 0 }}>Size</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {sizeOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSize(s)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    border: selectedSize === s ? "2px solid var(--text-accent)" : "1px solid var(--border-default)",
                    background: selectedSize === s ? "var(--bg-autofill)" : "var(--bg-surface)",
                    color: selectedSize === s ? "var(--text-accent)" : "var(--text-primary)",
                    fontWeight: selectedSize === s ? 600 : 400,
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Shipping Details ──────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ ...sectionTitleStyle, marginTop: 0 }}>Shipping</div>
          <div
            style={{
              background: "var(--bg-surface-hover)",
              borderRadius: 10,
              padding: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                  {displayName}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {displayAddress}
                </div>
              </div>
              {!needsDetails && (
                <button
                  onClick={() => setStep("details")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-accent)",
                    fontSize: 12,
                    cursor: "pointer",
                    fontWeight: 500,
                    padding: 0,
                    alignSelf: "flex-start",
                  }}
                >
                  Edit
                </button>
              )}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 10px",
                background: "var(--bg-muted)",
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              <span>{"\u{1F4E6}"}</span>
              <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                {product.shipping_eta}
              </span>
              {shippingCost === 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-success)",
                    background: "var(--bg-surface)",
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  FREE SHIPPING
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Payment Method ────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ ...sectionTitleStyle, marginTop: 0 }}>Payment Method</div>
          <div
            style={{
              background: "var(--bg-surface-hover)",
              borderRadius: 10,
              padding: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 24,
                  borderRadius: 4,
                  background: "var(--bg-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}
              >
                {"\u{1F4B3}"}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                  {displayCard}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {"\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 "}{displayCardLast4}
                  {displayCardVirtual && " (Virtual)"}
                </div>
              </div>
            </div>
            {!needsDetails && (
              <button
                onClick={() => setStep("details")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-accent)",
                  fontSize: 12,
                  cursor: "pointer",
                  fontWeight: 500,
                  padding: 0,
                }}
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {/* ── Order Total ───────────────────────────── */}
        <div
          style={{
            background: "var(--bg-surface-hover)",
            borderRadius: 10,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <div style={reviewRowStyle}>
            <span style={{ color: "var(--text-muted)" }}>Subtotal</span>
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>${product.price.toFixed(2)}</span>
          </div>
          <div style={reviewRowStyle}>
            <span style={{ color: "var(--text-muted)" }}>Shipping</span>
            <span style={{ color: shippingCost === 0 ? "var(--text-success)" : "var(--text-primary)", fontWeight: 500 }}>
              {shippingCost === 0 ? "FREE" : `$${shippingCost.toFixed(2)}`}
            </span>
          </div>
          <div style={{ ...reviewRowStyle, borderBottom: "none" }}>
            <span style={{ color: "var(--text-muted)" }}>Est. Tax</span>
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>${estimatedTax.toFixed(2)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingTop: 10,
              borderTop: "2px solid var(--border-default)",
              marginTop: 6,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>Total</span>
            <span style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>${orderTotal.toFixed(2)}</span>
          </div>
        </div>

        <p style={{ fontSize: 11, color: "var(--text-faint)", textAlign: "center", margin: "0 0 12px" }}>
          {"\u{1F512}"} This is a simulated purchase — no real charge will be made
        </p>

        {/* ── Action Buttons ───────────────────────── */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: "var(--bg-btn-secondary)",
              border: "1px solid var(--border-default)",
              borderRadius: 8,
              padding: "12px 0",
              cursor: "pointer",
              fontWeight: 500,
              color: "var(--text-primary)",
              fontSize: 14,
            }}
          >
            Cancel
          </button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setStep("success");
              onConfirm(product, displayCard);
            }}
            style={{
              flex: 2,
              background: "var(--bg-btn-primary)",
              color: "var(--text-on-primary)",
              border: "none",
              borderRadius: 8,
              padding: "12px 0",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Confirm Order
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
