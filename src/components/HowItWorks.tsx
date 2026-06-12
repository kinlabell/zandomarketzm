const steps = [
  {
    number: '1',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    title: 'Choisissez votre service',
    description: "Sélectionnez la création d'entreprise ou l'obtention du passeport selon votre besoin.",
  },
  {
    number: '2',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    title: 'Remplissez le formulaire',
    description: 'Fournissez vos informations en quelques clics via notre formulaire en ligne sécurisé.',
  },
  {
    number: '3',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Confirmation automatique',
    description: 'Vous recevez immédiatement un email ou message WhatsApp confirmant la réception de votre demande.',
  },
  {
    number: '4',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    title: "Un agent vous contacte sous 24h",
    description: "Un agent LEGAL EASY prend contact avec vous pour démarrer votre dossier et vous accompagner à chaque étape.",
  },
];

export default function HowItWorks() {
  return (
    <section id="comment-ca-marche" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-blue-500 text-sm font-bold uppercase tracking-widest mb-3">COMMENT ÇA MARCHE</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Un processus simple et rapide
          </h2>
        </div>

        {/* Steps */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connector line – desktop only */}
          <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-blue-100 z-0" />

          {steps.map((step, idx) => (
            <div key={idx} className="relative flex flex-col items-center text-center z-10">
              {/* Circle */}
              <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex flex-col items-center justify-center shadow-lg mb-5">
                <span className="text-xs font-bold opacity-70">{step.number}</span>
                <div className="mt-0.5">{step.icon}</div>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
