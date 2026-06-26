export default function PolitiqueConfidentialite() {
  return (
    <div className="min-h-screen bg-white px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Politique de Confidentialité</h1>
        <p className="text-sm text-gray-500 mb-8">Dernière mise à jour : juin 2025</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Responsable du traitement</h2>
          <p className="text-gray-600">
            RelancePro Antilles est un outil CRM à usage professionnel, opéré par son titulaire.
            Pour toute question relative à la protection de vos données, contactez-nous à :
            <strong> stephen.baspin@gmail.com</strong>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Données collectées</h2>
          <p className="text-gray-600 mb-2">Dans le cadre de l&apos;utilisation de nos services, nous pouvons collecter :</p>
          <ul className="list-disc pl-6 text-gray-600 space-y-1">
            <li>Nom, prénom, numéro de téléphone, adresse email</li>
            <li>Adresse postale et localisation géographique</li>
            <li>Informations relatives à votre projet (type, budget)</li>
            <li>Historique des échanges (emails, SMS, WhatsApp)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Finalité du traitement</h2>
          <p className="text-gray-600 mb-2">Vos données sont utilisées exclusivement pour :</p>
          <ul className="list-disc pl-6 text-gray-600 space-y-1">
            <li>Vous contacter dans le cadre d&apos;un projet commercial</li>
            <li>Vous envoyer des informations relatives à nos offres (avec votre consentement)</li>
            <li>Assurer le suivi de votre dossier client</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Base légale</h2>
          <p className="text-gray-600">
            Le traitement est fondé sur votre consentement explicite recueilli lors de la collecte
            de vos informations, conformément au Règlement Général sur la Protection des Données (RGPD).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Partage des données</h2>
          <p className="text-gray-600">
            Vos données ne sont jamais vendues à des tiers. Elles peuvent être transmises à des
            prestataires techniques (Brevo, Meta/WhatsApp) uniquement dans le but d&apos;assurer
            la communication avec vous, dans le respect de leurs politiques de confidentialité.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">6. Durée de conservation</h2>
          <p className="text-gray-600">
            Vos données sont conservées pendant la durée nécessaire à la réalisation de votre projet,
            et au maximum 3 ans à compter du dernier contact.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Vos droits</h2>
          <p className="text-gray-600 mb-2">Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul className="list-disc pl-6 text-gray-600 space-y-1">
            <li>Droit d&apos;accès à vos données personnelles</li>
            <li>Droit de rectification</li>
            <li>Droit à l&apos;effacement (&quot;droit à l&apos;oubli&quot;)</li>
            <li>Droit d&apos;opposition au traitement</li>
            <li>Droit à la portabilité de vos données</li>
          </ul>
          <p className="text-gray-600 mt-2">
            Pour exercer ces droits, contactez-nous à : <strong>stephen.baspin@gmail.com</strong>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">8. Cookies</h2>
          <p className="text-gray-600">
            Cette application n&apos;utilise pas de cookies de traçage. Les données sont stockées
            localement dans votre navigateur (localStorage) et ne sont pas transmises à des serveurs
            tiers sans votre consentement.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">9. Contact</h2>
          <p className="text-gray-600">
            Pour toute question ou réclamation relative à la protection de vos données personnelles :
            <br />
            Email : <strong>stephen.baspin@gmail.com</strong>
          </p>
        </section>

        <div className="mt-12 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            RelancePro Antilles — CRM professionnel — Martinique
          </p>
        </div>
      </div>
    </div>
  )
}
