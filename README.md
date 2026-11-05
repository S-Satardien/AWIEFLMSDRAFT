# AWIEF Digital Learning Academy
> **Advancing Women. Growing Economies.**  
> Custom E-Learning & Masterclass Platform built for the **Africa Women Innovation and Entrepreneurship Forum (AWIEF)** in partnership with the **Johnson & Johnson (J&J) AI Impact Lab**.

---

## Executive Summary

The **AWIEF Digital Learning Academy** is a bespoke, enterprise-grade digital education platform built specifically to scale pan-African female entrepreneurship education across 54 African nations.

Designed to address all 14 technical and governance criteria evaluated by the **Johnson & Johnson (J&J) AI Impact Lab**, this platform provides:
1. **Commercial Masterclass Catalogue**: Multi-currency pricing (ZAR and USD) with localized payment gateway processing (PayFast Instant EFT/Cards, PayPal, Paystack, M-Pesa, MTN MoMo, and Scholarship Grant Codes).
2. **Automated Faculty Author Royalty Split Engine**: Transparent monthly statements calculating gross revenue, third-party payment gateway fees, net distributable income, author royalty payouts (30–40%), and AWIEF institutional retained revenue.
3. **Bandwidth-Optimized Native Micro-Learning**: 20–30 minute bite-sized modules featuring an instant **Low-Bandwidth Mode** toggle (reducing data consumption by over 90% for mobile cellular learners across Africa), localized case studies, and downloadable practical business toolkits.
4. **Hybrid E-Learning Standard Support**: Complete backward and forward compatibility with SCORM 1.2 and SCORM 2004 interactive packages (e.g., Articulate Rise and Storyline) alongside native modern Next.js modules.
5. **Verifiable Pan-African Digital Credentials**: High-resolution Plum & Gold digital certificates co-signed by **Irene Ochem** (Founder & CEO, AWIEF) and **Ekene Ochem** (Director of Programs & Innovation), verifiable instantaneously via cryptographic QR code and public lookup at `/verify/[certificateId]`.
6. **Self-Service Course & Content Builder**: Zero-code masterclass management allowing AWIEF program teams to publish courses, configure royalty rates, and upload curriculum modules without technical assistance.
7. **Full Data Sovereign Portability**: 1-Click complete database exports (JSON and CSV) ensuring zero vendor lock-in.

---

## 1-Click J&J Reviewer Test Accounts

On the `/login` portal, reviewers can authenticate with a single click using pre-configured role switcher cards:

| Role | Email | Password | Primary Review Capabilities |
| :--- | :--- | :--- | :--- |
| **Learner Demo** | `learner@awieforum.org` | `AwiefDemo2026!` | Course catalog, multi-gateway checkout, native player, low-bandwidth mode toggle, downloadable business tools, knowledge checks, evaluation survey, QR verifiable certificate. |
| **Admin & Finance** | `admin@awieforum.org` | `AwiefAdmin2026!` | Financial royalty dashboard, monthly statement exports (CSV/PDF), self-service course builder, user management, survey analytics, full platform data export. |
| **Faculty Author** | `author@awieforum.org` | `AwiefAuthor2026!` | Author royalty statements, monthly net payout calculations, SCORM text-highlight commenting and review notes. |

---

## Tech Stack & Architecture

- **Frontend & Server Engine**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, Server Actions, React 19)
- **Styling & Aesthetics**: Tailwind CSS with custom AWIEF brand tokens:
  - AWIEF Plum (`#7F3D59`)
  - Royal Deep Plum (`#5E2C41`)
  - African Sahara Gold (`#D4AF37`)
  - Deep Mahogany (`#1D0B14`)
  - Soft Silk Rose (`#FDF8F9`)
- **Typography**: Google Fonts [`Outfit`](https://fonts.google.com/specimen/Outfit) (Contemporary Headings & UI) and [`Playfair Display`](https://fonts.google.com/specimen/Playfair+Display) (Editorial Accents & Certificates)
- **Database ORM**: [Prisma ORM 5](https://www.prisma.io/)
  - **Local Development**: SQLite (`dev.db`)
  - **Cloud Production**: Neon Serverless PostgreSQL (`schema.postgres.prisma`)
- **Authentication**: NextAuth.js session-based credentials provider
- **SCORM Engine**: Client-side SCORM 1.2 / 2004 API adapter with bidirectional CMI data persistence

---

## Getting Started (Local Development)

### 1. Prerequisites
- Node.js 18+ or 20+
- npm or yarn

### 2. Installation
```bash
git clone <repository-url>
cd awief-lms
npm install
```

### 3. Database Initialization
```bash
# Push schema to local SQLite database
npx prisma db push

# Seed demo users, masterclasses, transactions, quizzes, and certificates
node seed.js
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
```bash
npm run build
npm start
```

---

## Production Deployment (Vercel + Neon PostgreSQL)

1. Provision a free or pro PostgreSQL database on [Neon](https://neon.tech).
2. Copy `prisma/schema.postgres.prisma` over `prisma/schema.prisma` (or set `DATABASE_URL` to your Neon connection string).
3. Set the following environment variables in your Vercel Project Settings:
   - `DATABASE_URL`: `postgresql://...`
   - `NEXTAUTH_URL`: `https://your-awief-domain.vercel.app`
   - `NEXTAUTH_SECRET`: A secure 32+ character key
4. Deploy via GitHub integration or `vercel --prod`.

---

## License & Intellectual Property
© 2026 Africa Women Innovation and Entrepreneurship Forum (AWIEF) NPC. All rights reserved.  
Headquartered in Cape Town, South Africa. Special Consultative Status with the United Nations Economic and Social Council (ECOSOC).
