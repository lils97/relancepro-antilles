# 🌴 RelancePro Antilles — CRM Intelligent

**CRM de prospection conçu pour les commerciaux aux Antilles françaises**

---

## 🚀 Démarrage rapide

### Prérequis
- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

### Installation

```bash
# 1. Cloner et installer les dépendances
cd relancepro-antilles
npm install

# 2. Configurer l'environnement
cp .env.example .env
# Remplir les variables dans .env

# 3. Initialiser la base de données
npm run db:push
npm run db:generate

# 4. Lancer en développement
npm run dev
```

L'application est disponible sur **http://localhost:3000**

---

## 🗺️ Structure du projet

```
src/
├── app/                    # Pages Next.js (App Router)
│   ├── page.tsx           # Dashboard
│   ├── prospects/         # Liste + fiche client
│   ├── kanban/            # Vue Kanban
│   ├── import/            # Import Excel
│   ├── campaigns/         # Campagnes SMS/WhatsApp/Email
│   ├── templates/         # Bibliothèque de messages
│   ├── ia/                # Assistant IA
│   ├── calendar/          # Calendrier RDV
│   └── api/               # Routes API backend
├── components/
│   └── layout/            # Sidebar + Header
├── lib/
│   ├── excel-import.ts    # Moteur d'import Excel
│   ├── phone-utils.ts     # Normalisation numéros Antilles
│   ├── ai-scoring.ts      # Scoring IA des prospects
│   └── mock-data.ts       # Données de démo
├── types/
│   └── index.ts           # Types TypeScript centraux
└── prisma/
    └── schema.prisma      # Schéma base de données
```

---

## ⚙️ Configuration des services

### IA — Claude API (Anthropic) ✅
```env
ANTHROPIC_API_KEY=sk-ant-...
```

### SMS — Twilio (à connecter)
```env
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+596696000000
```

### WhatsApp Business API (à connecter)
```env
WHATSAPP_PHONE_NUMBER_ID=xxx
WHATSAPP_ACCESS_TOKEN=xxx
```

### Email — Brevo (à connecter)
```env
BREVO_API_KEY=xxx
BREVO_SENDER_EMAIL=contact@votreentreprise.fr
```

---

## 📱 Fonctionnalités MVP

| Feature | Statut |
|---------|--------|
| Dashboard avec KPIs | ✅ |
| Liste prospects + filtres | ✅ |
| Fiche client complète | ✅ |
| Scoring IA (0-100) | ✅ |
| Import Excel/CSV intelligent | ✅ |
| Détection auto colonnes | ✅ |
| Normalisation numéros Antilles | ✅ |
| Kanban drag & drop | ✅ |
| Bibliothèque de templates | ✅ |
| Génération IA de messages | ✅ |
| Analyse réponses IA | ✅ |
| Campagnes SMS/WhatsApp/Email | ✅ |
| Calendrier RDV | ✅ |
| Schéma BDD complet | ✅ |
| Routes API backend | ✅ |
| Envoi SMS réel (Twilio) | ⏳ Config requise |
| Envoi WhatsApp réel | ⏳ Config requise |
| Envoi Email réel (Brevo) | ⏳ Config requise |
| Auth Google OAuth | ⏳ Config requise |
| BDD PostgreSQL connectée | ⏳ Config requise |

---

## 🗺️ ROADMAP

### V2 — Automatisations & Intégrations (3-6 mois)

- **Automatisations avancées** : Si pas de réponse après 3j → SMS automatique, Si réponse positive → création tâche, Si devis envoyé → relance à J+7
- **Génération IA complète** : Connecter Claude API pour génération temps réel, Fine-tuning sur le vocabulaire antillais
- **Intégrations complètes** : Twilio SMS + WhatsApp Business, Brevo/Mailjet emailing, Google Calendar bidirectionnel
- **Multi-utilisateurs** : Gestion d'équipes, attribution automatique de prospects, quotas par commercial
- **Application mobile** : React Native iOS/Android pour terrain
- **Géolocalisation** : Carte interactive des prospects, optimisation tournées, secteurs géographiques

### V3 — IA Avancée & Business Intelligence (6-12 mois)

- **Prédiction IA** : Modèle ML de prédiction de conversion, identification des prospects "chauds" avant même qu'ils répondent
- **Assistant conversationnel** : Chat IA intégré pour répondre automatiquement aux SMS/WhatsApp simples
- **CRM étendu** : Gestion devis en ligne, signature électronique, facturation intégrée
- **Analytics avancés** : ROI par source, analyse des meilleurs moments pour contacter, performance par commercial
- **Marketplace de templates** : Templates validés par secteur, partage entre commerciaux
- **Intégrations ERP** : Connexion avec logiciels de gestion (Sage, EBP, etc.)
- **API publique** : Permettre aux partenaires de s'intégrer
- **Application web progressive (PWA)** : Accessible hors ligne

---

## 🔒 Conformité RGPD

- Consentement SMS et Email tracé pour chaque prospect
- Droit à l'oubli : suppression complète sur demande
- Journal d'activité complet
- Chiffrement des données en transit (HTTPS) et au repos
- Gestion du STOP automatique

---

## 📞 Support

Pour toute question ou assistance : stephen.baspin@gmail.com
