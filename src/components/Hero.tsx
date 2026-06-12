import Link from 'next/link';

export default function Hero() {
  return (
    <section
      id="accueil"
      className="relative min-h-screen flex items-center bg-[#0d1b2a] overflow-hidden"
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d1b2a] via-[#1a3a5c] to-[#0d1b2a] opacity-90" />

      {/* Decorative circles */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-32 md:py-40">
        <div className="max-w-2xl">
          <p className="text-blue-500 text-sm font-bold uppercase tracking-widest mb-4">LEGAL EASY SARL</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6">
            Vos démarches administratives{' '}
            <span className="text-blue-400">simplifiées</span>
          </h1>
          <p className="text-lg text-gray-300 mb-10 leading-relaxed">
            LEGAL EASY SARL vous accompagne dans la création de votre entreprise
            et l&apos;obtention de votre passeport en RDC. Rapide, professionnel
            et confidentiel.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="#contact?service=entreprise" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg text-center">
              Créer mon entreprise
            </Link>
            <Link href="#contact?service=passeport" className="border-2 border-white text-white hover:bg-white hover:text-blue-900 font-semibold px-6 py-3 rounded-lg transition-all duration-200 text-center">
              Obtenir mon passeport
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-14 flex flex-col sm:flex-row gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Service fiable</p>
                <p className="text-gray-400 text-xs">Accompagnement sécurisé A à Z</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Réponse sous 24h</p>
                <p className="text-gray-400 text-xs">Un agent vous contacte rapidement</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
