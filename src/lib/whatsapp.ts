/**
 * WhatsApp notification via Meta Cloud API or Twilio.
 *
 * To activate:
 *  - Set WHATSAPP_PROVIDER to "meta" or "twilio" in .env.local
 *  - For Meta: set META_WA_PHONE_NUMBER_ID and META_WA_ACCESS_TOKEN
 *  - For Twilio: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_WA_FROM
 */

type WaData = {
  toPhone: string;  // E.164 format e.g. +243810000000
  toName: string;
  service: string;
};

const message = (name: string, service: string) =>
  `Bonjour ${name},\n\nNous avons bien reçu votre demande concernant *${service}*.\n\nUn agent LEGAL EASY vous contactera sous 24 heures.\n\nMerci pour votre confiance.\n\n_LEGAL EASY SARL_`;

async function sendViaMeta({ toPhone, toName, service }: WaData) {
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID!;
  const accessToken = process.env.META_WA_ACCESS_TOKEN!;

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'text',
        text: { body: message(toName, service) },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Meta WA error: ${JSON.stringify(err)}`);
  }
}

async function sendViaTwilio({ toPhone, toName, service }: WaData) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_WA_FROM!; // e.g. whatsapp:+14155238886

  const body = new URLSearchParams({
    From: from,
    To: `whatsapp:${toPhone}`,
    Body: message(toName, service),
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Twilio WA error: ${JSON.stringify(err)}`);
  }
}

export async function sendWhatsAppNotification(data: WaData) {
  const provider = process.env.WHATSAPP_PROVIDER;
  if (!provider) return; // WhatsApp not configured, skip silently

  if (provider === 'meta') return sendViaMeta(data);
  if (provider === 'twilio') return sendViaTwilio(data);

  throw new Error(`Unknown WHATSAPP_PROVIDER: ${provider}`);
}
