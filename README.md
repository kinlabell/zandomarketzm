# LEGAL EASY SARL – Site Vitrine

Site vitrine professionnel pour **LEGAL EASY SARL**, société basée à Kinshasa (RDC) spécialisée dans l'accompagnement administratif : création d'entreprise et obtention du passeport.

## Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Google Sheets API** – base de données des demandes
- **Nodemailer (Gmail)** – emails de confirmation automatiques
- **WhatsApp Cloud API / Twilio** – notifications WhatsApp (architecture prête)

---

## Démarrage rapide

```bash
# 1. Cloner le dépôt
git clone <repo-url>
cd <repo>

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env.local
# Remplir .env.local avec vos valeurs (voir ci-dessous)

# 4. Lancer en développement
npm run dev
```

---

## Configuration Google Sheets

### 1. Créer un projet Google Cloud

1. Aller sur [console.cloud.google.com](https://console.cloud.google.com)
2. Créer un nouveau projet
3. Activer l'API **Google Sheets**
4. Créer un **Compte de service** (Service Account)
5. Télécharger la clé JSON du compte de service

### 2. Préparer le Google Sheet

1. Créer un Google Sheet
2. Sur la première ligne, ajouter les en-têtes :
   `Date | Service | Nom | Email | Téléphone | Ville | Mode de contact | Message`
3. Partager le sheet avec l'email du compte de service (rôle **Éditeur**)
4. Copier l'ID du sheet depuis l'URL

### 3. Variables d'environnement

```env
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_PROJECT_ID=...
GOOGLE_PRIVATE_KEY_ID=...
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=...
```

---

## Configuration Email (Gmail)

1. Activer la **Validation en 2 étapes** sur le compte Gmail
2. Créer un **Mot de passe d'application** sur [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Renseigner dans `.env.local` :

```env
SMTP_USER=contactlegaleasy@gmail.com
SMTP_PASS=votre_mot_de_passe_application
```

---

## Configuration WhatsApp (optionnel)

### Option A – Meta WhatsApp Cloud API

1. Créer une app Meta Business sur [developers.facebook.com](https://developers.facebook.com)
2. Activer WhatsApp Business API
3. Renseigner :

```env
WHATSAPP_PROVIDER=meta
META_WA_PHONE_NUMBER_ID=your_phone_number_id
META_WA_ACCESS_TOKEN=your_access_token
```

### Option B – Twilio

```env
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WA_FROM=whatsapp:+14155238886
```

Laisser `WHATSAPP_PROVIDER` vide pour désactiver les notifications WhatsApp.

---

## Déploiement sur Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel

# Ou connecter le dépôt GitHub directement sur vercel.com
```

Ajouter toutes les variables de `.env.example` dans **Settings > Environment Variables** sur Vercel.

---

## Structure du projet

```
src/
├── app/
│   ├── api/
│   │   └── submit-form/route.ts   # API POST : Sheets + Email + WhatsApp
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Header.tsx
│   ├── Hero.tsx
│   ├── Services.tsx
│   ├── HowItWorks.tsx
│   ├── WhyUs.tsx
│   ├── ContactForm.tsx
│   └── Footer.tsx
└── lib/
    ├── googleSheets.ts            # Intégration Google Sheets
    ├── mailer.ts                  # Envoi d'email via Nodemailer
    └── whatsapp.ts                # Architecture WhatsApp (Meta / Twilio)
```

---

## Contact entreprise

**LEGAL EASY SARL**  
291 Avenue Kasongolunda, Commune de Lingwala  
Référence : Académie des Beaux-Arts  
Kinshasa, RDC  
contactlegaleasy@gmail.com
