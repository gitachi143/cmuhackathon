import type { PersonalInfo, ShippingAddress } from "../types";

const API_BASE = "/api";

export interface CheckoutStatus {
  step: string;
  message: string;
  product_title?: string;
}

/**
 * Starts the Amazon auto-checkout and returns a callback-based stream of status updates.
 */
export async function startAutoCheckout(
  productName: string,
  personalInfo: PersonalInfo,
  shippingAddress: ShippingAddress,
  onStatus: (status: CheckoutStatus) => void,
  onDone: () => void,
  onError: (err: string) => void
) {
  try {
    const resp = await fetch(`${API_BASE}/auto-checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_name: productName,
        personal_info: personalInfo,
        shipping_address: shippingAddress,
      }),
    });

    if (!resp.ok) {
      onError(`Server error: ${resp.status}`);
      return;
    }

    const reader = resp.body?.getReader();
    if (!reader) {
      onError("No response stream available");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data: CheckoutStatus = JSON.parse(line.slice(6));
            if (data.step === "stream_end") {
              onDone();
              return;
            }
            onStatus(data);
          } catch {
            // skip malformed lines
          }
        }
      }
    }

    onDone();
  } catch (e) {
    onError(e instanceof Error ? e.message : "Unknown error");
  }
}

export async function cancelAutoCheckout() {
  try {
    await fetch(`${API_BASE}/auto-checkout/cancel`, { method: "POST" });
  } catch {
    // best-effort
  }
}
