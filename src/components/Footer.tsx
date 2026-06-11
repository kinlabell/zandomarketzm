import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#0d1b2a] border-t border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">LE</span>
              </div>
              <div className="leading-tight">
                <div className="text-white font-bold text-sm">LEGAL EASY</div>
                <div className="text-blue-400 text-[9px] tracking-widest uppercase">SARL</div>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Accompagnement professionnel pour vos démarches administratives en RDC.
              Création d&apos;entreprise et obtention du passeport simplifiées.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="text-white font-semibold text-sm mb-4">Liens rapides</p>
            <ul className="space-y-2">
              {[
                { href: '#accueil', label: 'Accueil' },
                { href: '#services', label: 'Services' },
                { href: '#comment-ca-marche', label: 'Comment ça marche' },
                { href: '#contact', label: 'Contact' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-gray-400 hover:text-white text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-white font-semibold text-sm mb-4">Contact</p>
            <ul className="space-y-3 text-sm text-gray-400">
              <li>
                <a href="mailto:contactlegaleasy@gmail.com" className="hover:text-white transition-colors">
                  contactlegaleasy@gmail.com
                </a>
              </li>
              <li className="leading-relaxed">
                291 Avenue Kasongolunda<br />
                Commune de Lingwala<br />
                Kinshasa, RDC
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} LEGAL EASY SARL. Tous droits réservés.</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-white transition-colors">Mentions légales</Link>
            <Link href="#" className="hover:text-white transition-colors">Politique de confidentialité</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
