// WhatsApp notification helper via Fonnte API.
//
// Smart Debug Toggle:
//   - Development + FORCE_WA_LOCAL !== "true" → mode Debug (console.log saja).
//   - FORCE_WA_LOCAL === "true" ATAU production → kirim pesan sungguhan via Fonnte.

const FONNTE_API_URL = "https://api.fonnte.com/send";
const FONNTE_TOKEN = process.env.FONNTE_TOKEN ?? "";

export interface WhatsAppPayload {
  phone: string;
  message: string;
}

/** true jika sistem sedang dalam mode debug (tidak mengirim pesan asli). */
function isDebugMode(): boolean {
  const isDev = process.env.NODE_ENV === "development";
  const forceLocal = process.env.FORCE_WA_LOCAL === "true";
  return isDev && !forceLocal;
}

/**
 * Kirim pesan WhatsApp via Fonnte API.
 * Nomor harus dalam format internasional tanpa tanda plus (contoh: 6281234567890).
 */
export async function sendWhatsAppNotification(
  payload: WhatsAppPayload
): Promise<boolean> {
  const formattedPhone = payload.phone.replace(/\D/g, "");

  // Mode debug: log saja, jangan kirim.
  if (!FONNTE_TOKEN || isDebugMode()) {
    console.log(
      `\n[WA BERHASIL-DEBUG] to=${formattedPhone}\n${payload.message}\n`
    );
    return true;
  }

  try {
    const res = await fetch(FONNTE_API_URL, {
      method: "POST",
      headers: {
        Authorization: FONNTE_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: formattedPhone,
        message: payload.message,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Fonnte API error (${res.status}):`, text);
      return false;
    }

    return true;
  } catch (e) {
    console.error("Gagal mengirim WhatsApp:", e);
    return false;
  }
}
