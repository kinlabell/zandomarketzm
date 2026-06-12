import { NextRequest, NextResponse } from 'next/server';
import { appendToSheet, type FormData } from '@/lib/googleSheets';
import { sendConfirmationEmail } from '@/lib/mailer';
import { sendWhatsAppNotification } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as FormData;

    const { service, nom, email, telephone, ville, modeContact, message } = body;

    if (!service || !nom || !email || !telephone) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants.' },
        { status: 400 }
      );
    }

    // 1. Save to Google Sheets
    await appendToSheet({ service, nom, email, telephone, ville, modeContact, message });

    // 2. Send confirmation email
    await sendConfirmationEmail({ toEmail: email, toName: nom, service });

    // 3. Send WhatsApp if preferred (non-blocking – failure doesn't fail the request)
    if (modeContact === 'whatsapp' && telephone) {
      sendWhatsAppNotification({
        toPhone: telephone,
        toName: nom,
        service,
      }).catch((err) => console.error('WhatsApp notification failed:', err));
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('submit-form error:', err);
    return NextResponse.json(
      { error: 'Une erreur interne est survenue. Veuillez réessayer.' },
      { status: 500 }
    );
  }
}
