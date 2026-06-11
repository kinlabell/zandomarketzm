'use client';

import { useState } from 'react';

type FormState = {
  service: string;
  nom: string;
  email: string;
  telephone: string;
  ville: string;
  modeContact: string;
  message: string;
};

const initialState: FormState = {
  service: '',
  nom: '',
  email: '',
  telephone: '',
  ville: '',
  modeContact: 'email',
  message: '',
};

export default function ContactForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/submit-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Une erreur est survenue.');
      }

      setStatus('success');
      setForm(initialState);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Une erreur est survenue.');
    }
  };

  return (
    <section id="contact" className="py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left – info */}
          <div>
            <p className="text-blue-500 text-sm font-bold uppercase tracking-widest mb-3">FAIRE UNE DEMANDE</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Démarrez votre demande dès maintenant
            </h2>
            <p className="text-gray-600 leading-relaxed mb-10">
              Remplissez le formulaire ci-contre et un agent LEGAL EASY vous contactera
              dans un délai inférieur à 24 heures pour vous accompagner.
            </p>

            {/* Contact info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-gray-700 text-sm">contactlegaleasy@gmail.com</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-gray-700 text-sm">
                  291 Avenue Kasongolunda, Commune de Lingwala<br />
                  Réf. Académie des Beaux-Arts, Kinshasa, RDC
                </span>
              </div>
            </div>
          </div>

          {/* Right – form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            {status === 'success' ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Demande envoyée !</h3>
                <p className="text-gray-600 mb-6">
                  Nous avons bien reçu votre demande. Un agent vous contactera sous 24 heures.
                </p>
                <button
                  onClick={() => setStatus('idle')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Nouvelle demande
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Service */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Type de demande <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="service"
                    value={form.service}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  >
                    <option value="">Sélectionnez un service</option>
                    <option value="Création d'entreprise">Création d&apos;entreprise</option>
                    <option value="Obtention du passeport">Obtention du passeport</option>
                  </select>
                </div>

                {/* Nom */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Nom complet <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nom"
                    value={form.nom}
                    onChange={handleChange}
                    required
                    placeholder="Votre nom complet"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  />
                </div>

                {/* Email + Téléphone */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      placeholder="votre@email.com"
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Téléphone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="telephone"
                      value={form.telephone}
                      onChange={handleChange}
                      required
                      placeholder="+243 8X XXX XXXX"
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                    />
                  </div>
                </div>

                {/* Ville */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ville</label>
                  <input
                    type="text"
                    name="ville"
                    value={form.ville}
                    onChange={handleChange}
                    placeholder="Kinshasa"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  />
                </div>

                {/* Mode de contact */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Mode de contact préféré
                  </label>
                  <div className="flex gap-4">
                    {['email', 'whatsapp'].map((mode) => (
                      <label key={mode} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="modeContact"
                          value={mode}
                          checked={form.modeContact === mode}
                          onChange={handleChange}
                          className="accent-blue-600"
                        />
                        <span className="text-sm text-gray-700 capitalize">{mode === 'whatsapp' ? 'WhatsApp' : 'Email'}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Message ou informations complémentaires
                  </label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Décrivez votre situation ou vos questions..."
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 resize-none"
                  />
                </div>

                {status === 'error' && (
                  <p className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-3">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {status === 'loading' ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Envoi en cours...
                    </span>
                  ) : (
                    'Envoyer ma demande'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
