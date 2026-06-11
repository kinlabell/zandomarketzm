const reasons = [
  {
    icon: '🤝',
    title: 'Accompagnement personnalisé',
    description: 'Un agent dédié vous suit du début à la fin de votre démarche.',
  },
  {
    icon: '⚡',
    title: 'Réponse rapide',
    description: 'Nous vous contactons sous 24 heures après réception de votre demande.',
  },
  {
    icon: '📋',
    title: 'Suivi professionnel',
    description: "Vous êtes informé à chaque étape de l'avancement de votre dossier.",
  },
  {
    icon: '✅',
    title: 'Procédures simplifiées',
    description: "Nous simplifions les démarches complexes pour que tout soit clair et facile.",
  },
  {
    icon: '🔒',
    title: 'Confidentialité garantie',
    description: 'Vos informations personnelles sont traitées avec la plus stricte confidentialité.',
  },
];

export default function WhyUs() {
  return (
    <section className="py-24 bg-[#0d1b2a]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <p className="text-blue-400 text-sm font-bold uppercase tracking-widest mb-3">
              POURQUOI NOUS CHOISIR ?
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Pourquoi choisir{' '}
              <span className="text-blue-400">LEGAL EASY SARL ?</span>
            </h2>
            <p className="text-gray-400 leading-relaxed">
              Nous avons simplifié chaque aspect de vos démarches administratives
              pour vous offrir une expérience fluide, transparente et professionnelle.
            </p>
          </div>

          {/* Right */}
          <div className="space-y-5">
            {reasons.map((r) => (
              <div
                key={r.title}
                className="flex items-start gap-4 bg-white/5 rounded-xl px-5 py-4 border border-white/10 hover:border-blue-500/40 transition-colors"
              >
                <span className="text-2xl shrink-0">{r.icon}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{r.title}</p>
                  <p className="text-gray-400 text-sm mt-0.5">{r.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
