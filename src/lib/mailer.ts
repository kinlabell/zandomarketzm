import nodemailer from 'nodemailer';

export type MailData = {
  toEmail: string;
  toName: string;
  service: string;
};

function createTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendConfirmationEmail({ toEmail, toName, service }: MailData) {
  const transporter = createTransport();

  await transporter.sendMail({
    from: `"LEGAL EASY SARL" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'Demande reçue – LEGAL EASY SARL',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
        <div style="background: #0d1b2a; padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">LEGAL EASY SARL</h1>
          <p style="color: #93c5fd; margin: 4px 0 0; font-size: 13px;">Démarches administratives simplifiées</p>
        </div>
        <div style="background: #f9fafb; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px; margin-top: 0;">Bonjour <strong>${toName}</strong>,</p>
          <p>Nous avons bien reçu votre demande concernant :</p>
          <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
            <strong style="color: #1e40af;">${service}</strong>
          </div>
          <p>Un agent LEGAL EASY prendra contact avec vous dans un délai inférieur à <strong>24 heures</strong>.</p>
          <p style="margin-bottom: 0;">Merci pour votre confiance.</p>
          <p style="color: #6b7280; font-size: 13px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
            LEGAL EASY SARL – 291 Avenue Kasongolunda, Commune de Lingwala, Kinshasa, RDC<br/>
            <a href="mailto:contactlegaleasy@gmail.com" style="color: #2563eb;">contactlegaleasy@gmail.com</a>
          </p>
        </div>
      </div>
    `,
  });
}
