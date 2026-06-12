import { google } from 'googleapis';

export type FormData = {
  service: string;
  nom: string;
  email: string;
  telephone: string;
  ville: string;
  modeContact: string;
  message: string;
};

function getAuth() {
  const credentials = {
    type: 'service_account',
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
  };

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export async function appendToSheet(data: FormData) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error('GOOGLE_SHEET_ID non défini');

  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const date = new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Kinshasa' });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Feuille1!A:H',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        [
          date,
          data.service,
          data.nom,
          data.email,
          data.telephone,
          data.ville,
          data.modeContact,
          data.message,
        ],
      ],
    },
  });
}
