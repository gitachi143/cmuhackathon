import { useState } from "react";
import { motion } from "framer-motion";

interface SettingsModalProps {
  onClose: () => void;
}

interface CalendarApp {
  id: string;
  name: string;
  icon: string;
  description: string;
  connected: boolean;
}

const CALENDAR_APPS: CalendarApp[] = [
  {
    id: "google",
    name: "Google Calendar",
    icon: "\uD83D\uDCC5",
    description: "Sync shopping events and delivery dates with Google Calendar",
    connected: false,
  },
  {
    id: "apple",
    name: "Apple Calendar",
    icon: "\uD83C\uDF4E",
    description: "Track deliveries and deals directly in Apple Calendar",
    connected: false,
  },
  {
    id: "outlook",
    name: "Outlook Calendar",
    icon: "\uD83D\uDCE7",
    description: "Get shopping reminders through Outlook Calendar integration",
    connected: false,
  },
];

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [calendars, setCalendars] = useState<CalendarApp[]>(CALENDAR_APPS);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [justConnected, setJustConnected] = useState<string | null>(null);

  const handleConnect = (id: string) => {
    const cal = calendars.find((c) => c.id === id);
    if (!cal) return;

    if (cal.connected) {
      // Disconnect immediately
      setCalendars((prev) =>
        prev.map((c) => (c.id === id ? { ...c, connected: false } : c))
      );
      return;
    }

    // Simulate connecting
    setConnecting(id);
    setTimeout(() => {
      setCalendars((prev) =>
        prev.map((c) => (c.id === id ? { ...c, connected: true } : c))
      );
      setConnecting(null);
      setJustConnected(id);
      setTimeout(() => setJustConnected(null), 2000);
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
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
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-surface)",
          borderRadius: 16,
          padding: 24,
          width: "100%",
          maxWidth: 460,
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          border: "1px solid var(--border-default)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Settings
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
              Manage your app integrations
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "var(--bg-muted)",
              border: "none",
              borderRadius: 8,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 16,
              color: "var(--text-muted)",
            }}
          >
            {"\u2715"}
          </button>
        </div>

        {/* Calendar integrations section */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 16 }}>{"\uD83D\uDD17"}</span>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
              Calendar Integrations
            </h3>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.5 }}>
            Connect a calendar app to automatically sync delivery dates, deal reminders, and price drop alerts.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {calendars.map((cal) => (
              <motion.div
                key={cal.id}
                layout
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  background: cal.connected ? "var(--bg-autofill)" : "var(--bg-muted)",
                  borderRadius: 10,
                  border: cal.connected ? "1px solid var(--border-option)" : "1px solid var(--border-default)",
                  transition: "background 0.2s, border-color 0.2s",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  {cal.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    {cal.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>
                    {cal.description}
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleConnect(cal.id)}
                  disabled={connecting === cal.id}
                  style={{
                    background: connecting === cal.id
                      ? "var(--bg-btn-primary-disabled)"
                      : cal.connected
                      ? "var(--bg-btn-secondary)"
                      : "var(--bg-btn-primary)",
                    color: cal.connected ? "var(--text-secondary)" : "var(--text-on-primary)",
                    border: cal.connected ? "1px solid var(--border-default)" : "none",
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: connecting === cal.id ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    minWidth: 90,
                    textAlign: "center",
                  }}
                >
                  {connecting === cal.id ? (
                    <motion.span
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                    >
                      Connecting...
                    </motion.span>
                  ) : justConnected === cal.id ? (
                    <span>{"\u2713"} Connected!</span>
                  ) : cal.connected ? (
                    "Disconnect"
                  ) : (
                    "Connect"
                  )}
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Info footer */}
        <div
          style={{
            marginTop: 20,
            padding: "10px 12px",
            background: "var(--bg-muted)",
            borderRadius: 8,
            fontSize: 11,
            color: "var(--text-faint)",
            lineHeight: 1.5,
          }}
        >
          Calendar connections are simulated for demo purposes. In a production app, this would use OAuth to securely connect to your calendar provider.
        </div>
      </motion.div>
    </motion.div>
  );
}
