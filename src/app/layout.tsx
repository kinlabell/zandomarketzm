import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LEGAL EASY SARL – Démarches administratives simplifiées en RDC',
  description:
    'LEGAL EASY SARL vous accompagne dans la création de votre entreprise et l\'obtention de votre passeport en RDC. Service rapide, professionnel et confidentiel.',
  keywords: 'création entreprise RDC, passeport Congo, démarches administratives Kinshasa, LEGAL EASY',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head />
      <body className={inter.className}>{children}</body>
    </html>
  );
}
