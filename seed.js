require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding AWIEF Digital Learning Academy database...');

  // Hash demo passwords
  const adminPassword = await bcrypt.hash('AwiefAdmin2026!', 10);
  const learnerPassword = await bcrypt.hash('AwiefDemo2026!', 10);
  const authorPassword = await bcrypt.hash('AwiefAuthor2026!', 10);
  const generalPassword = await bcrypt.hash('AwiefDemo2026!', 10);

  // 1. Core Demo Users
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@awieforum.org' },
    update: {
      name: 'Ekene Ochem',
      role: 'ADMIN',
      organization: 'AWIEF Secretariat',
      profession: 'Director of Programs and Innovation',
      country: 'ZA',
      businessStage: 'Scaling / Export Ready',
      sector: 'Enterprise Development',
      awiefProgram: 'Growth Accelerator',
      showOnLeaderboard: true,
      currentStreak: 12,
    },
    create: {
      email: 'admin@awieforum.org',
      name: 'Ekene Ochem',
      role: 'ADMIN',
      password: adminPassword,
      organization: 'AWIEF Secretariat',
      profession: 'Director of Programs and Innovation',
      country: 'ZA',
      businessStage: 'Scaling / Export Ready',
      sector: 'Enterprise Development',
      awiefProgram: 'Growth Accelerator',
      showOnLeaderboard: true,
      currentStreak: 12,
      isAwiefAlumni: true,
      isNitagMember: true,
      nitagCountry: 'ZA',
      nitagPosition: 'Director',
      nitagYears: '>5 years'
    },
  });

  const learnerUser = await prisma.user.upsert({
    where: { email: 'learner@awieforum.org' },
    update: {
      name: 'Amara Okafor',
      role: 'STUDENT',
      organization: 'EcoAgri Foods & Cold Chain Logistics',
      profession: 'Founder & Managing Director',
      country: 'NG',
      businessStage: 'Growth Stage',
      sector: 'Agribusiness & Food Processing',
      awiefProgram: 'Growth Accelerator',
      yearsInBusiness: '3-5 years',
      showOnLeaderboard: true,
      currentStreak: 7,
    },
    create: {
      email: 'learner@awieforum.org',
      name: 'Amara Okafor',
      role: 'STUDENT',
      password: learnerPassword,
      organization: 'EcoAgri Foods & Cold Chain Logistics',
      profession: 'Founder & Managing Director',
      country: 'NG',
      businessStage: 'Growth Stage',
      sector: 'Agribusiness & Food Processing',
      awiefProgram: 'Growth Accelerator',
      yearsInBusiness: '3-5 years',
      showOnLeaderboard: true,
      currentStreak: 7,
      isAwiefAlumni: true,
      isNitagMember: false,
    },
  });

  const authorUser = await prisma.user.upsert({
    where: { email: 'author@awieforum.org' },
    update: {
      name: 'Nomsa Dlamini',
      role: 'REVIEWER',
      organization: 'African SME Venture Advisory',
      profession: 'Lead SME Investment Advisor & Venture Partner',
      country: 'ZA',
      businessStage: 'Scaling / Export Ready',
      sector: 'Venture Capital & Advisory',
      awiefProgram: 'Investment Readiness Faculty',
      showOnLeaderboard: true,
      currentStreak: 15,
    },
    create: {
      email: 'author@awieforum.org',
      name: 'Nomsa Dlamini',
      role: 'REVIEWER',
      password: authorPassword,
      organization: 'African SME Venture Advisory',
      profession: 'Lead SME Investment Advisor & Venture Partner',
      country: 'ZA',
      businessStage: 'Scaling / Export Ready',
      sector: 'Venture Capital & Advisory',
      awiefProgram: 'Investment Readiness Faculty',
      showOnLeaderboard: true,
      currentStreak: 15,
      isAwiefAlumni: true,
      isNitagMember: true,
      nitagCountry: 'ZA',
      nitagPosition: 'Advisory Lead',
      nitagYears: '>5 years'
    },
  });

  // Additional Pan-African Cohort Learners
  const additionalLearners = [
    {
      email: 'wairimu@ecolink.co.ke',
      name: 'Wairimu Kamau',
      organization: 'EcoLink Solar Grid Systems',
      profession: 'Co-Founder & Chief Commercial Officer',
      country: 'KE',
      businessStage: 'Growth Stage',
      sector: 'Green Energy & Solar Mini-Grids',
      awiefProgram: 'AWE LESA',
      yearsInBusiness: '3-5 years',
      currentStreak: 9,
    },
    {
      email: 'thandi@solarish.co.za',
      name: 'Thandiwe Sithole',
      organization: 'Khaya Agro-Processing Ltd',
      profession: 'Founder & Managing Director',
      country: 'ZA',
      businessStage: 'Growth Stage',
      sector: 'Agribusiness & Food Processing',
      awiefProgram: 'Nedbank Women Enterprise Growth',
      yearsInBusiness: '3-5 years',
      currentStreak: 5,
    },
    {
      email: 'efua@africouture.com.gh',
      name: 'Efua Mensah',
      organization: 'AfriCouture Textiles & Export',
      profession: 'Chief Executive Officer',
      country: 'GH',
      businessStage: 'Scaling / Export Ready',
      sector: 'Manufacturing & Creative Apparel',
      awiefProgram: 'Growth Accelerator',
      yearsInBusiness: '>5 years',
      currentStreak: 11,
    },
    {
      email: 'aline@rwandaartisans.rw',
      name: 'Aline Uwase',
      organization: 'Kigali Artisan Co-operative',
      profession: 'Managing Director & Export Lead',
      country: 'RW',
      businessStage: 'Growth Stage',
      sector: 'Artisanal & High-Value Crafts',
      awiefProgram: 'Pitch n Grow',
      yearsInBusiness: '1-3 years',
      currentStreak: 4,
    },
  ];

  const cohortUsers = [];
  for (const l of additionalLearners) {
    const u = await prisma.user.upsert({
      where: { email: l.email },
      update: {
        name: l.name,
        organization: l.organization,
        profession: l.profession,
        country: l.country,
        businessStage: l.businessStage,
        sector: l.sector,
        awiefProgram: l.awiefProgram,
        yearsInBusiness: l.yearsInBusiness,
        currentStreak: l.currentStreak,
        showOnLeaderboard: true,
      },
      create: {
        email: l.email,
        name: l.name,
        role: 'STUDENT',
        password: generalPassword,
        organization: l.organization,
        profession: l.profession,
        country: l.country,
        businessStage: l.businessStage,
        sector: l.sector,
        awiefProgram: l.awiefProgram,
        yearsInBusiness: l.yearsInBusiness,
        currentStreak: l.currentStreak,
        showOnLeaderboard: true,
        isAwiefAlumni: true,
      },
    });
    cohortUsers.push(u);
  }

  // 2. Structured Course Definitions (5 Flagship Masterclasses)
  const investmentModules = JSON.stringify([
    {
      id: "mod-1",
      title: "Module 1: Investor Due Diligence & Investment Vehicle Selection",
      duration: "28 mins",
      summary: "Understand angel syndicates, venture debt, DFIs, and gender-lens equity investors across Africa.",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      caseStudy: "How Kenyan agri-fintech founder Linda Davis structured her \$750k seed round across grant matching and convertible notes.",
      keyTakeaways: [
        "Cap table modeling: dilution thresholds when raising SAFE notes vs priced equity rounds.",
        "Gender-lens funding criteria from DFI syndicates (AfDB, IFC, FMO).",
        "The 10 non-negotiable clauses in term sheets that protect founder governance."
      ],
      templateName: "AWIEF Cap Table & Dilution Sensitivity Model (.xlsx)",
      quizPrompt: "What is the primary difference between a pre-money SAFE and a post-money SAFE during an early-stage funding round?"
    },
    {
      id: "mod-2",
      title: "Module 2: Unit Economics, CAC:LTV & Financial Modeling for Scale",
      duration: "30 mins",
      summary: "Deconstruct your revenue engines, customer acquisition costs (CAC), lifetime value (LTV), and gross margins.",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      caseStudy: "Kedibone Tsiloane (Ramtsilo Manufacturing, South Africa) analyzing breakeven manufacturing unit economics.",
      keyTakeaways: [
        "Target CAC:LTV ratio of at least 1:3 for scalable consumer and B2B pipelines.",
        "Building 3-statement integrated financial forecast projections with stress-tested cash runways.",
        "Working capital cycles in pan-African supply chain logistics."
      ],
      templateName: "AWIEF 3-Year Integrated Financial Projections Model (.xlsx)",
      quizPrompt: "Why must deferred revenue be excluded from immediate gross revenue recognition on your cashflow statement?"
    },
    {
      id: "mod-3",
      title: "Module 3: Data Rooms, Legal Compliance & Intellectual Property",
      duration: "25 mins",
      summary: "Build an institutional-grade virtual data room (VDR) that passes tier-1 institutional investor audits.",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      caseStudy: "Navigating cross-border intellectual property registration across OAPI and ARIPO regional treaties.",
      keyTakeaways: [
        "Essential checklist of 24 corporate, governance, and tax documents required in an institutional VDR.",
        "Protecting proprietary formulas, trade secrets, and software copyrights across African jurisdictions.",
        "POPIA, GDPR, and African regional data sovereignty compliance requirements."
      ],
      templateName: "Institutional Virtual Data Room (VDR) Master Checklist (.docx)",
      quizPrompt: "Which regulatory framework governs intellectual property rights across 17 francophone West and Central African nations?"
    },
    {
      id: "mod-4",
      title: "Module 4: The 12-Slide Pitch Deck Formula That Closes Rounds",
      duration: "25 mins",
      summary: "The definitive narrative arc that captures VC attention in the first 90 seconds.",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      caseStudy: "Dissecting the pitch deck that unlocked \$1.2M in pre-Series A capital for an African cold-chain logistics startup.",
      keyTakeaways: [
        "Slide 1 to 12 structure: Problem, Solution, Market Size (TAM/SAM/SOM), Business Model, Traction, Go-To-Market, Competitive Moat, Financials, The Ask.",
        "Tailoring pitch delivery for pan-African impact investors vs silicon valley venture funds.",
        "Handling aggressive investor Q&A and valuation pushback with data-backed defensibility."
      ],
      templateName: "AWIEF High-Conversion 12-Slide Investor Pitch Deck Template (.pptx)",
      quizPrompt: "In an early-stage investor pitch deck, what should the 'Ask' slide explicitly delineate?"
    },
    {
      id: "mod-5",
      title: "Module 5: Term Sheet Negotiation & Valuation Defensibility",
      duration: "22 mins",
      summary: "Negotiating founder-friendly terms, liquidation preferences, anti-dilution, and board governance.",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      caseStudy: "How an East African healthcare founder rejected a 2x participating liquidation preference to retain voting control.",
      keyTakeaways: [
        "1x Non-participating liquidation preference vs 2x participating preferences.",
        "Founder vesting schedules, drag-along rights, and protective veto covenants.",
        "Selecting lead investors who bring strategic distribution, networks, and follow-on capital."
      ],
      templateName: "Term Sheet Redline Checklist & Founder Protection Playbook (.pdf)",
      quizPrompt: "How does a 1x non-participating liquidation preference protect common equity holders during an exit?"
    }
  ]);

  const exportModules = JSON.stringify([
    {
      id: "exp-1",
      title: "Module 1: AfCFTA Fundamentals, Tariff Schedules & Rules of Origin",
      duration: "30 mins",
      summary: "Leveraging the African Continental Free Trade Area (AfCFTA) to eliminate tariffs across 54 signatory states.",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      caseStudy: "Ghanaian agro-exporter packaging value-added shea butter under AfCFTA preferential tariff status.",
      keyTakeaways: ["Rules of Origin certificate criteria", "Harmonized System (HS) code classification", "Non-tariff barrier reporting tools"],
      templateName: "AfCFTA Rules of Origin Compliance Checklist (.pdf)",
      quizPrompt: "What document certifies that a good has undergone sufficient transformation to qualify for AfCFTA preferential tariffs?"
    },
    {
      id: "exp-2",
      title: "Module 2: Sanitary and Phytosanitary (SPS) & Export Certification",
      duration: "30 mins",
      summary: "Meeting stringent packaging, bio-security, labeling, and international quality standards.",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      caseStudy: "South African organic dried fruit producer obtaining GlobalG.A.P. and HACCP export certifications.",
      keyTakeaways: ["HACCP, ISO 22000, and FDA export standards", "Cold-chain shelf life verification", "Traceability barcodes"],
      templateName: "SPS Export Audit & Quality Manual Template (.docx)",
      quizPrompt: "Which standard governs food hazard analysis and critical control points in international export?"
    },
    {
      id: "exp-3",
      title: "Module 3: Cross-Border Logistics, Freight Forwarding & Incoterms 2026",
      duration: "30 mins",
      summary: "Navigating sea, air, and overland cross-border corridors across Africa with minimal transit dwell times.",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      caseStudy: "Rwanda coffee and tea cooperatives shipping directly to European roasters via FOB and CIF contract structures.",
      keyTakeaways: ["Incoterms 2026: FOB, CIF, DDP liability handoffs", "Selecting bonded freight forwarders", "Marine cargo transit insurance"],
      templateName: "International Logistics & Freight Rate Comparison Matrix (.xlsx)",
      quizPrompt: "Under Incoterms CIF, where does risk transfer from the seller to the buyer?"
    },
    {
      id: "exp-4",
      title: "Module 4: Trade Finance, Letters of Credit & Currency Risk Hedging",
      duration: "25 mins",
      summary: "Securing export working capital, standby letters of credit (SBLC), and managing foreign exchange exposure.",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      caseStudy: "Using Afreximbank Pan-African Payment and Settlement System (PAPSS) to settle intra-African trade in local currencies.",
      keyTakeaways: ["Irrevocable confirmed letters of credit", "Factoring and export invoice discounting", "FX forward hedging mechanisms"],
      templateName: "Export Working Capital & Letter of Credit Guide (.pdf)",
      quizPrompt: "What is the primary role of the Pan-African Payment and Settlement System (PAPSS)?"
    },
    {
      id: "exp-5",
      title: "Module 5: Global Distribution Networks, Agents & Digital B2B Marketplaces",
      duration: "25 mins",
      summary: "Securing foreign wholesale buyers, retail distributor agreements, and digital cross-border trade portals.",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      caseStudy: "Nigerian fashion and accessories brand establishing retail concessions in London, Paris, and Nairobi.",
      keyTakeaways: ["Distributor exclusivity vs agency agreements", "Minimum order quantities (MOQ) and retail margins", "Cross-border e-commerce customs fulfillment"],
      templateName: "International Distributor Agreement Template (.docx)",
      quizPrompt: "Why are tiered MOQs critical when entering an international retail distribution agreement?"
    }
  ]);

  const financeModules = JSON.stringify([
    {
      id: "fin-1",
      title: "Module 1: Cashflow Forecasting & 13-Week Runway Management",
      duration: "25 mins",
      summary: "Preventing insolvency: dynamic cash management for high-growth enterprises.",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      caseStudy: "How a South African retail chain survived supply chain delays with rolling 13-week cash planning.",
      keyTakeaways: ["Direct vs indirect cashflow modeling", "Working capital preservation", "Daily cash burn thresholds"],
      templateName: "AWIEF 13-Week Rolling Cashflow Forecasting Tool (.xlsx)",
      quizPrompt: "How does a rolling 13-week cashflow model differ from an annual budget?"
    },
    {
      id: "fin-2",
      title: "Module 2: Profit Margins, Cost Centers & Overhead Allocation",
      duration: "25 mins",
      summary: "Accurately allocating fixed and variable costs to uncover true product profitability.",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      caseStudy: "Restructuring a food manufacturing plant to eliminate loss-making SKUs.",
      keyTakeaways: ["Activity-based costing (ABC)", "Contribution margin per product line", "Standardized gross margin targets"],
      templateName: "Product SKU Margin & Cost Allocation Calculator (.xlsx)",
      quizPrompt: "What does contribution margin tell a business owner about an individual product line?"
    },
    {
      id: "fin-3",
      title: "Module 3: Tax Compliance, VAT & Pan-African Corporate Structuring",
      duration: "25 mins",
      summary: "Navigating corporate income tax, VAT withholding, and tax-efficient pan-African holding structures.",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      caseStudy: "Structuring cross-border operations between Mauritius, South Africa, and Kenya legally and tax-efficiently.",
      keyTakeaways: ["Double taxation avoidance agreements (DTAA)", "VAT registration thresholds and exemptions", "Maintaining tax clearance status"],
      templateName: "SME Tax Calendar & Corporate Filing Roadmap (.pdf)",
      quizPrompt: "What is the primary benefit of a Double Taxation Agreement (DTA) between two African countries?"
    },
    {
      id: "fin-4",
      title: "Module 4: Financial Governance, Internal Controls & Audit Readiness",
      duration: "25 mins",
      summary: "Instituting dual-authorization banking controls, monthly reconciliations, and independent audit readiness.",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      caseStudy: "Preparing a 4-year-old technology startup for its first clean Big-4 audit.",
      keyTakeaways: ["Segregation of accounting duties", "Cloud accounting stack: Xero / QuickBooks with multi-currency reconciliation", "Audit trail documentation"],
      templateName: "Internal Controls & Financial Standard Operating Procedures (.docx)",
      quizPrompt: "Why is segregation of financial duties mandatory for audit readiness?"
    }
  ]);

  const pitchModules = JSON.stringify([
    {
      id: "pit-1",
      title: "Module 1: The Pitch 'n Grow Framework & Value Proposition Clarity",
      duration: "25 mins",
      summary: "Distilling complex technical solutions into irresistible 30-second and 3-minute executive pitches.",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      caseStudy: "AWIEF Pitch n Grow 2026 Winner pitching to a live panel of angel investors and DFI representatives.",
      keyTakeaways: ["The Hook, The Problem Pain-Point, The Unique Mechanism, The Traction Metric", "Eliminating jargon and technical clutter", "Connecting with judges emotionally and commercially"],
      templateName: "The 30-Second Elevator Pitch Canvas (.pdf)",
      quizPrompt: "What is the primary objective of the opening 15 seconds of an executive pitch?"
    },
    {
      id: "pit-2",
      title: "Module 2: AI-Powered Market Research & Customer Discovery",
      duration: "25 mins",
      summary: "Using modern generative AI tools to conduct competitor intelligence, TAM sizing, and customer persona synthesis.",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      caseStudy: "Accelerating competitor landscape mapping across 12 African markets in 48 hours using structured AI research prompts.",
      keyTakeaways: ["Prompt engineering for market sizing and customer segmentation", "Analyzing competitor pricing models", "Automating survey sentiment analysis"],
      templateName: "Generative AI Research & Strategy Prompt Library for Founders (.docx)",
      quizPrompt: "How can AI research tools be validated to avoid statistical hallucination in market sizing?"
    },
    {
      id: "pit-3",
      title: "Module 3: Omnichannel Digital Acquisition & Social Commerce",
      duration: "25 mins",
      summary: "Scaling organic and paid acquisition on LinkedIn, Instagram, TikTok, and WhatsApp Business across Africa.",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      caseStudy: "Generating \$120k in direct-to-consumer sales via automated WhatsApp Business catalogs and mobile payment integrations.",
      keyTakeaways: ["WhatsApp Business API for order management", "High-ROI paid social funnels", "Micro-influencer partnership models"],
      templateName: "Omnichannel Social Commerce & Ad Spend ROI Calculator (.xlsx)",
      quizPrompt: "Why is conversational commerce via WhatsApp exceptionally potent for African consumer markets?"
    },
    {
      id: "pit-4",
      title: "Module 4: Stage Presence, Investor Q&A & Negotiation Mastery",
      duration: "25 mins",
      summary: "Mastering body language, camera setup for virtual pitches, vocal projection, and handling skeptical questions.",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      caseStudy: "Overcoming investor skepticism on market adoption in frontier markets with authoritative unit economics data.",
      keyTakeaways: ["Virtual vs live stage presence", "The 'Agree, Pivot, Substantiate' Q&A defense technique", "Securing immediate follow-up meetings from judges"],
      templateName: "Investor Q&A Defense Matrix & FAQ Playbook (.pdf)",
      quizPrompt: "How should a founder handle an investor question when the exact metric is currently unknown?"
    }
  ]);

  // Create Courses
  const c1 = await prisma.course.upsert({
    where: { id: 'investment-readiness' },
    update: {
      title: 'Investment Readiness & Capital Raising for Women-Led SMEs',
      slug: 'investment-readiness-capital-raising',
      shortDescription: 'Master investor due diligence, financial modeling, unit economics, data rooms, and term sheet negotiations to successfully raise seed and growth capital.',
      description: 'The flagship AWIEF Investment Readiness Masterclass equips women entrepreneurs and executive founders across Africa with the institutional capabilities required to secure equity, venture debt, and grant capital. Featuring direct insights from African VC partners, angel syndicates, and successful alumni founders.',
      instructor: 'Nomsa Dlamini',
      instructorRole: 'Lead SME Investment Advisor & Venture Partner, African Enterprise Ventures',
      authorName: 'Nomsa Dlamini',
      authorRole: 'Lead SME Investment Advisor & Venture Partner, African Enterprise Ventures',
      authorEmail: 'author@awieforum.org',
      authorBio: 'Nomsa has advised over 120 African women-led SMEs that have raised in excess of $45M across Southern, West, and East Africa. She serves on the investment committee of multiple pan-African venture funds.',
      thumbnailUrl: '/images/investment-readiness.png',
      duration: '2.5 Hours • 5 Bite-Sized Modules',
      category: 'Investment Readiness',
      priceZar: 1850,
      priceUsd: 105,
      isFree: false,
      royaltyRate: 40,
      learndashSourceId: 'LD-101',
      isNative: true,
      modulesJson: investmentModules,
      isPublished: true,
    },
    create: {
      id: 'investment-readiness',
      title: 'Investment Readiness & Capital Raising for Women-Led SMEs',
      slug: 'investment-readiness-capital-raising',
      shortDescription: 'Master investor due diligence, financial modeling, unit economics, data rooms, and term sheet negotiations to successfully raise seed and growth capital.',
      description: 'The flagship AWIEF Investment Readiness Masterclass equips women entrepreneurs and executive founders across Africa with the institutional capabilities required to secure equity, venture debt, and grant capital. Featuring direct insights from African VC partners, angel syndicates, and successful alumni founders.',
      instructor: 'Nomsa Dlamini',
      instructorRole: 'Lead SME Investment Advisor & Venture Partner, African Enterprise Ventures',
      authorName: 'Nomsa Dlamini',
      authorRole: 'Lead SME Investment Advisor & Venture Partner, African Enterprise Ventures',
      authorEmail: 'author@awieforum.org',
      authorBio: 'Nomsa has advised over 120 African women-led SMEs that have raised in excess of $45M across Southern, West, and East Africa. She serves on the investment committee of multiple pan-African venture funds.',
      thumbnailUrl: '/images/investment-readiness.png',
      duration: '2.5 Hours • 5 Bite-Sized Modules',
      category: 'Investment Readiness',
      priceZar: 1850,
      priceUsd: 105,
      isFree: false,
      royaltyRate: 40,
      learndashSourceId: 'LD-101',
      isNative: true,
      modulesJson: investmentModules,
      isPublished: true,
    }
  });

  const c2 = await prisma.course.upsert({
    where: { id: 'export-readiness' },
    update: {
      title: 'AfCFTA Export Readiness & Cross-Border Trade Mastery',
      slug: 'afcfta-export-readiness-cross-border-trade',
      shortDescription: 'Navigate tariff schedules, Rules of Origin, export packaging standards, and cross-border trade finance to scale your products across 54 African nations.',
      description: 'Designed in collaboration with trade economists and export facilitation councils, this course guides African women manufacturers, agribusinesses, and consumer brands on how to take practical advantage of the African Continental Free Trade Area (AfCFTA) single market.',
      instructor: 'Dr. Amina Mensah',
      instructorRole: 'Senior Trade Policy Specialist & Cross-Border Logistics Advisor',
      authorName: 'Dr. Amina Mensah',
      authorRole: 'Senior Trade Policy Specialist & Cross-Border Logistics Advisor',
      authorEmail: 'amina.mensah@awieforum.org',
      authorBio: 'Dr. Mensah has over 18 years of experience advising regional economic communities (ECOWAS, SADC, EAC) on trade facilitation, customs modernization, and female entrepreneurship inclusion.',
      thumbnailUrl: '/images/export-trade.png',
      duration: '3 Hours • 5 Bite-Sized Modules',
      category: 'Export & Trade',
      priceZar: 1650,
      priceUsd: 95,
      isFree: false,
      royaltyRate: 35,
      learndashSourceId: 'LD-102',
      isNative: true,
      modulesJson: exportModules,
      isPublished: true,
    },
    create: {
      id: 'export-readiness',
      title: 'AfCFTA Export Readiness & Cross-Border Trade Mastery',
      slug: 'afcfta-export-readiness-cross-border-trade',
      shortDescription: 'Navigate tariff schedules, Rules of Origin, export packaging standards, and cross-border trade finance to scale your products across 54 African nations.',
      description: 'Designed in collaboration with trade economists and export facilitation councils, this course guides African women manufacturers, agribusinesses, and consumer brands on how to take practical advantage of the African Continental Free Trade Area (AfCFTA) single market.',
      instructor: 'Dr. Amina Mensah',
      instructorRole: 'Senior Trade Policy Specialist & Cross-Border Logistics Advisor',
      authorName: 'Dr. Amina Mensah',
      authorRole: 'Senior Trade Policy Specialist & Cross-Border Logistics Advisor',
      authorEmail: 'amina.mensah@awieforum.org',
      authorBio: 'Dr. Mensah has over 18 years of experience advising regional economic communities (ECOWAS, SADC, EAC) on trade facilitation, customs modernization, and female entrepreneurship inclusion.',
      thumbnailUrl: '/images/export-trade.png',
      duration: '3 Hours • 5 Bite-Sized Modules',
      category: 'Export & Trade',
      priceZar: 1650,
      priceUsd: 95,
      isFree: false,
      royaltyRate: 35,
      learndashSourceId: 'LD-102',
      isNative: true,
      modulesJson: exportModules,
      isPublished: true,
    }
  });

  const c3 = await prisma.course.upsert({
    where: { id: 'financial-management' },
    update: {
      title: 'Financial Management, Cashflow & Tax Compliance for Growth',
      slug: 'financial-management-cashflow-tax-compliance',
      shortDescription: 'Master rolling 13-week cashflow projections, product margin allocation, VAT compliance, and audit-ready governance for fast-growing enterprises.',
      description: 'A practical, numbers-first masterclass designed for entrepreneurs who want total mastery of their unit economics, financial reporting, and compliance obligations without relying entirely on external bookkeepers.',
      instructor: 'Zanele Khumalo, CA(SA)',
      instructorRole: 'Managing Director, Khumalo Financial Advisory & Former Big-4 Audit Partner',
      authorName: 'Zanele Khumalo, CA(SA)',
      authorRole: 'Managing Director, Khumalo Financial Advisory & Former Big-4 Audit Partner',
      authorEmail: 'zanele.khumalo@awieforum.org',
      authorBio: 'Zanele is a Chartered Accountant with two decades of experience helping emerging and mid-market enterprises across Africa transition from manual ledgers to institutional-grade financial stacks.',
      thumbnailUrl: '/images/financial-management.png',
      duration: '2 Hours • 4 Bite-Sized Modules',
      category: 'Financial Mastery',
      priceZar: 1450,
      priceUsd: 85,
      isFree: false,
      royaltyRate: 35,
      learndashSourceId: 'LD-103',
      isNative: true,
      modulesJson: financeModules,
      isPublished: true,
    },
    create: {
      id: 'financial-management',
      title: 'Financial Management, Cashflow & Tax Compliance for Growth',
      slug: 'financial-management-cashflow-tax-compliance',
      shortDescription: 'Master rolling 13-week cashflow projections, product margin allocation, VAT compliance, and audit-ready governance for fast-growing enterprises.',
      description: 'A practical, numbers-first masterclass designed for entrepreneurs who want total mastery of their unit economics, financial reporting, and compliance obligations without relying entirely on external bookkeepers.',
      instructor: 'Zanele Khumalo, CA(SA)',
      instructorRole: 'Managing Director, Khumalo Financial Advisory & Former Big-4 Audit Partner',
      authorName: 'Zanele Khumalo, CA(SA)',
      authorRole: 'Managing Director, Khumalo Financial Advisory & Former Big-4 Audit Partner',
      authorEmail: 'zanele.khumalo@awieforum.org',
      authorBio: 'Zanele is a Chartered Accountant with two decades of experience helping emerging and mid-market enterprises across Africa transition from manual ledgers to institutional-grade financial stacks.',
      thumbnailUrl: '/images/financial-management.png',
      duration: '2 Hours • 4 Bite-Sized Modules',
      category: 'Financial Mastery',
      priceZar: 1450,
      priceUsd: 85,
      isFree: false,
      royaltyRate: 35,
      learndashSourceId: 'LD-103',
      isNative: true,
      modulesJson: financeModules,
      isPublished: true,
    }
  });

  const c4 = await prisma.course.upsert({
    where: { id: 'pitch-n-grow' },
    update: {
      title: "Pitch 'n Grow: Digital Marketing, AI Tools & High-Impact Pitching",
      slug: 'pitch-n-grow-digital-marketing-ai-pitching',
      shortDescription: 'Master stage and virtual investor pitching, generative AI customer discovery, and social commerce funnels to win grants, pitch competitions, and commercial customers.',
      description: 'AWIEF’s signature enterprise accelerator course. Built to take early and growth-stage female entrepreneurs from raw business concepts to compelling commercial pitches, supported by modern AI market research and digital customer acquisition tactics.',
      instructor: 'Chidinma Eze',
      instructorRole: 'Head of Innovation & Accelerator Programs, AWIEF Hub',
      authorName: 'Chidinma Eze',
      authorRole: 'Head of Innovation & Accelerator Programs, AWIEF Hub',
      authorEmail: 'chidinma.eze@awieforum.org',
      authorBio: 'Chidinma leads AWIEF pitch coaching and growth programs across the continent. She has prepared over 300 founders who have competed in global pitch competitions including GEC and GITEX.',
      thumbnailUrl: '/images/pitch-n-grow.png',
      duration: '2 Hours • 4 Bite-Sized Modules',
      category: 'Digital & AI Growth',
      priceZar: 0,
      priceUsd: 0,
      isFree: true,
      royaltyRate: 30,
      learndashSourceId: 'LD-104',
      isNative: true,
      modulesJson: pitchModules,
      isPublished: true,
    },
    create: {
      id: 'pitch-n-grow',
      title: "Pitch 'n Grow: Digital Marketing, AI Tools & High-Impact Pitching",
      slug: 'pitch-n-grow-digital-marketing-ai-pitching',
      shortDescription: 'Master stage and virtual investor pitching, generative AI customer discovery, and social commerce funnels to win grants, pitch competitions, and commercial customers.',
      description: 'AWIEF’s signature enterprise accelerator course. Built to take early and growth-stage female entrepreneurs from raw business concepts to compelling commercial pitches, supported by modern AI market research and digital customer acquisition tactics.',
      instructor: 'Chidinma Eze',
      instructorRole: 'Head of Innovation & Accelerator Programs, AWIEF Hub',
      authorName: 'Chidinma Eze',
      authorRole: 'Head of Innovation & Accelerator Programs, AWIEF Hub',
      authorEmail: 'chidinma.eze@awieforum.org',
      authorBio: 'Chidinma leads AWIEF pitch coaching and growth programs across the continent. She has prepared over 300 founders who have competed in global pitch competitions including GEC and GITEX.',
      thumbnailUrl: '/images/pitch-n-grow.png',
      duration: '2 Hours • 4 Bite-Sized Modules',
      category: 'Digital & AI Growth',
      priceZar: 0,
      priceUsd: 0,
      isFree: true,
      royaltyRate: 30,
      learndashSourceId: 'LD-104',
      isNative: true,
      modulesJson: pitchModules,
      isPublished: true,
    }
  });

  const c5 = await prisma.course.upsert({
    where: { id: 'scorm-sample-course' },
    update: {
      title: 'Interactive SCORM 1.2 / 2004 Sample Course (Articulate E-Learning)',
      slug: 'interactive-scorm-sample-course',
      shortDescription: 'Live demonstration of our runtime SCORM engine, supporting bookmarking, cmi data synchronization, and reviewer text-highlight commenting.',
      description: 'This course showcases our full backwards compatibility with third-party authoring tools (Articulate Rise, Storyline, Adobe Captivate). It demonstrates real-time SCORM 1.2 and SCORM 2004 API state persistence directly in the browser and database.',
      instructor: 'AWIEF Digital Learning Team',
      instructorRole: 'Instructional Design & E-Learning Technology',
      authorName: 'AWIEF Digital Learning Team',
      authorRole: 'Instructional Design & E-Learning Technology',
      authorEmail: 'info@awieforum.org',
      thumbnailUrl: '/images/awief-logo.jpg',
      duration: '45 Mins • Interactive SCORM Simulation',
      category: 'SCORM Interactive Demo',
      priceZar: 0,
      priceUsd: 0,
      isFree: true,
      royaltyRate: 0,
      scormPath: '/course/scormdriver/indexAPI.html',
      isNative: false,
      isPublished: true,
    },
    create: {
      id: 'scorm-sample-course',
      title: 'Interactive SCORM 1.2 / 2004 Sample Course (Articulate E-Learning)',
      slug: 'interactive-scorm-sample-course',
      shortDescription: 'Live demonstration of our runtime SCORM engine, supporting bookmarking, cmi data synchronization, and reviewer text-highlight commenting.',
      description: 'This course showcases our full backwards compatibility with third-party authoring tools (Articulate Rise, Storyline, Adobe Captivate). It demonstrates real-time SCORM 1.2 and SCORM 2004 API state persistence directly in the browser and database.',
      instructor: 'AWIEF Digital Learning Team',
      instructorRole: 'Instructional Design & E-Learning Technology',
      authorName: 'AWIEF Digital Learning Team',
      authorRole: 'Instructional Design & E-Learning Technology',
      authorEmail: 'info@awieforum.org',
      thumbnailUrl: '/images/awief-logo.jpg',
      duration: '45 Mins • Interactive SCORM Simulation',
      category: 'SCORM Interactive Demo',
      priceZar: 0,
      priceUsd: 0,
      isFree: true,
      royaltyRate: 0,
      scormPath: '/course/scormdriver/indexAPI.html',
      isNative: false,
      isPublished: true,
    }
  });

  // 3. Transactions & Royalties Pre-Seeding (Historical Multi-Month Revenue)
  console.log('Seeding transactions and author royalty split records...');

  const transactionsData = [
    // November 2026 Transactions (Current Month)
    {
      reference: 'AWIEF-TX-202611-001',
      userId: learnerUser.id,
      courseId: 'investment-readiness',
      gateway: 'PAYFAST',
      paymentMethodDetail: 'Instant EFT (Nedbank)',
      currency: 'ZAR',
      amountOriginal: 1850,
      amountZar: 1850,
      gatewayFeeZar: 59.20,
      netAmountZar: 1790.80,
      royaltyRateSnapshot: 40,
      authorRoyaltyZar: 716.32,
      awiefShareZar: 1074.48,
      billingMonth: '2026-11',
      createdAt: new Date('2026-11-02T10:15:00Z'),
    },
    {
      reference: 'AWIEF-TX-202611-002',
      userId: cohortUsers[0].id, // Wairimu Kamau (Kenya)
      courseId: 'investment-readiness',
      gateway: 'PAYSTACK',
      paymentMethodDetail: 'M-Pesa Kenya (KES)',
      currency: 'KES',
      amountOriginal: 13500,
      amountZar: 1850,
      gatewayFeeZar: 55.50,
      netAmountZar: 1794.50,
      royaltyRateSnapshot: 40,
      authorRoyaltyZar: 717.80,
      awiefShareZar: 1076.70,
      billingMonth: '2026-11',
      createdAt: new Date('2026-11-03T14:30:00Z'),
    },
    {
      reference: 'AWIEF-TX-202611-003',
      userId: cohortUsers[1].id, // Thandiwe Sithole (South Africa)
      courseId: 'export-readiness',
      gateway: 'PAYFAST',
      paymentMethodDetail: 'Visa Credit Card (SA)',
      currency: 'ZAR',
      amountOriginal: 1650,
      amountZar: 1650,
      gatewayFeeZar: 52.80,
      netAmountZar: 1597.20,
      royaltyRateSnapshot: 35,
      authorRoyaltyZar: 559.02,
      awiefShareZar: 1038.18,
      billingMonth: '2026-11',
      createdAt: new Date('2026-11-04T09:20:00Z'),
    },
    {
      reference: 'AWIEF-TX-202611-004',
      userId: cohortUsers[2].id, // Efua Mensah (Ghana)
      courseId: 'financial-management',
      gateway: 'PAYPAL',
      paymentMethodDetail: 'International PayPal Account (USD)',
      currency: 'USD',
      amountOriginal: 85,
      amountZar: 1450,
      gatewayFeeZar: 63.80,
      netAmountZar: 1386.20,
      royaltyRateSnapshot: 35,
      authorRoyaltyZar: 485.17,
      awiefShareZar: 901.03,
      billingMonth: '2026-11',
      createdAt: new Date('2026-11-04T16:45:00Z'),
    },
    {
      reference: 'AWIEF-TX-202611-005',
      userId: cohortUsers[3].id, // Aline Uwase (Rwanda)
      courseId: 'export-readiness',
      gateway: 'FLUTTERWAVE',
      paymentMethodDetail: 'MTN Mobile Money Rwanda',
      currency: 'RWF',
      amountOriginal: 125000,
      amountZar: 1650,
      gatewayFeeZar: 57.75,
      netAmountZar: 1592.25,
      royaltyRateSnapshot: 35,
      authorRoyaltyZar: 557.29,
      awiefShareZar: 1034.96,
      billingMonth: '2026-11',
      createdAt: new Date('2026-11-05T08:10:00Z'),
    },

    // October 2026 Transactions (Prior Statement Month)
    {
      reference: 'AWIEF-TX-202610-001',
      userId: cohortUsers[0].id,
      courseId: 'financial-management',
      gateway: 'PAYSTACK',
      paymentMethodDetail: 'M-Pesa Kenya',
      currency: 'KES',
      amountOriginal: 10600,
      amountZar: 1450,
      gatewayFeeZar: 43.50,
      netAmountZar: 1406.50,
      royaltyRateSnapshot: 35,
      authorRoyaltyZar: 492.28,
      awiefShareZar: 914.22,
      billingMonth: '2026-10',
      createdAt: new Date('2026-10-12T11:00:00Z'),
    },
    {
      reference: 'AWIEF-TX-202610-002',
      userId: cohortUsers[1].id,
      courseId: 'investment-readiness',
      gateway: 'PAYFAST',
      paymentMethodDetail: 'Instant EFT (FNB)',
      currency: 'ZAR',
      amountOriginal: 1850,
      amountZar: 1850,
      gatewayFeeZar: 59.20,
      netAmountZar: 1790.80,
      royaltyRateSnapshot: 40,
      authorRoyaltyZar: 716.32,
      awiefShareZar: 1074.48,
      billingMonth: '2026-10',
      createdAt: new Date('2026-10-15T15:30:00Z'),
    },
    {
      reference: 'AWIEF-TX-202610-003',
      userId: cohortUsers[2].id,
      courseId: 'export-readiness',
      gateway: 'PAYSTACK',
      paymentMethodDetail: 'MTN Mobile Money Ghana',
      currency: 'GHS',
      amountOriginal: 1450,
      amountZar: 1650,
      gatewayFeeZar: 49.50,
      netAmountZar: 1600.50,
      royaltyRateSnapshot: 35,
      authorRoyaltyZar: 560.18,
      awiefShareZar: 1040.32,
      billingMonth: '2026-10',
      createdAt: new Date('2026-10-19T09:40:00Z'),
    },
    {
      reference: 'AWIEF-TX-202610-004',
      userId: cohortUsers[3].id,
      courseId: 'investment-readiness',
      gateway: 'PAYPAL',
      paymentMethodDetail: 'PayPal USD',
      currency: 'USD',
      amountOriginal: 105,
      amountZar: 1850,
      gatewayFeeZar: 81.40,
      netAmountZar: 1768.60,
      royaltyRateSnapshot: 40,
      authorRoyaltyZar: 707.44,
      awiefShareZar: 1061.16,
      billingMonth: '2026-10',
      createdAt: new Date('2026-10-24T13:10:00Z'),
    },
    {
      reference: 'AWIEF-TX-202610-005',
      userId: learnerUser.id,
      courseId: 'pitch-n-grow',
      gateway: 'SCHOLARSHIP',
      paymentMethodDetail: 'AWIEF Partner Grant Code (AWIEF-JNJ-DEMO)',
      currency: 'ZAR',
      amountOriginal: 0,
      amountZar: 0,
      gatewayFeeZar: 0,
      netAmountZar: 0,
      royaltyRateSnapshot: 30,
      authorRoyaltyZar: 0,
      awiefShareZar: 0,
      billingMonth: '2026-10',
      createdAt: new Date('2026-10-28T10:00:00Z'),
    }
  ];

  for (const tx of transactionsData) {
    await prisma.transaction.upsert({
      where: { reference: tx.reference },
      update: tx,
      create: tx,
    });
  }

  // 4. Enrollments & Progress
  console.log('Seeding enrollments and certificate credentials...');

  // Learner User: Completed Investment Readiness + Has Certificate
  const e1 = await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: learnerUser.id,
        courseId: 'investment-readiness',
      },
    },
    update: {
      status: 'COMPLETED',
      progress: 100,
      surveyCompleted: true,
      certificateIssued: true,
      completedAt: new Date('2026-11-03T16:00:00Z'),
    },
    create: {
      userId: learnerUser.id,
      courseId: 'investment-readiness',
      status: 'COMPLETED',
      progress: 100,
      surveyCompleted: true,
      certificateIssued: true,
      completedAt: new Date('2026-11-03T16:00:00Z'),
    },
  });

  // Certificate for Learner User
  await prisma.certificate.upsert({
    where: { enrollmentId: e1.id },
    update: {
      certificateNumber: 'CERT-AWIEF-2026-INV-DEMO1',
      recipientName: 'Amara Okafor',
      courseTitle: 'Investment Readiness & Capital Raising for Women-Led SMEs',
      issuedAt: new Date('2026-11-03T16:05:00Z'),
      qrCodeData: 'http://localhost:3000/verify/CERT-AWIEF-2026-INV-DEMO1',
    },
    create: {
      certificateNumber: 'CERT-AWIEF-2026-INV-DEMO1',
      enrollmentId: e1.id,
      userId: learnerUser.id,
      courseId: 'investment-readiness',
      recipientName: 'Amara Okafor',
      courseTitle: 'Investment Readiness & Capital Raising for Women-Led SMEs',
      issuedAt: new Date('2026-11-03T16:05:00Z'),
      qrCodeData: 'http://localhost:3000/verify/CERT-AWIEF-2026-INV-DEMO1',
    },
  });

  // Evaluation Survey Response for Learner User
  await prisma.courseSurveyResponse.upsert({
    where: { enrollmentId: e1.id },
    update: {
      q1_platformNav: 5,
      q2_materialsClear: 5,
      q3_durationAppropriate: 5,
      q4_contentMatchedObjectives: 5,
      q5_understandingBefore: 2,
      q6_understandingAfter: 5,
      q7_confidenceExplain: 5,
      q8_applicationOpenEnded: 'I will apply the SAFE note dilution model immediately to our upcoming \$400k seed round negotiation with our Nigerian angel syndicate.',
      q9_recommendedCoursesOpenEnded: 'A specialized follow-up masterclass on B2B institutional sales contracts and corporate procurement tenders for female founders.',
      courseName: 'Investment Readiness & Capital Raising for Women-Led SMEs',
    },
    create: {
      enrollmentId: e1.id,
      userId: learnerUser.id,
      courseId: 'investment-readiness',
      courseName: 'Investment Readiness & Capital Raising for Women-Led SMEs',
      q1_platformNav: 5,
      q2_materialsClear: 5,
      q3_durationAppropriate: 5,
      q4_contentMatchedObjectives: 5,
      q5_understandingBefore: 2,
      q6_understandingAfter: 5,
      q7_confidenceExplain: 5,
      q8_applicationOpenEnded: 'I will apply the SAFE note dilution model immediately to our upcoming \$400k seed round negotiation with our Nigerian angel syndicate.',
      q9_recommendedCoursesOpenEnded: 'A specialized follow-up masterclass on B2B institutional sales contracts and corporate procurement tenders for female founders.',
    },
  });

  // Learner User: In Progress on Export Readiness (60%)
  await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: learnerUser.id,
        courseId: 'export-readiness',
      },
    },
    update: {
      status: 'IN_PROGRESS',
      progress: 60,
    },
    create: {
      userId: learnerUser.id,
      courseId: 'export-readiness',
      status: 'IN_PROGRESS',
      progress: 60,
    },
  });

  // Admin User: Enrolled in all courses for quick admin testing
  const allCourseIds = ['investment-readiness', 'export-readiness', 'financial-management', 'pitch-n-grow', 'scorm-sample-course'];
  for (const cid of allCourseIds) {
    await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: adminUser.id,
          courseId: cid,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        courseId: cid,
        status: 'IN_PROGRESS',
        progress: 80,
      },
    });
  }

  // 5. Seed Quizzes into Quiz Table
  console.log('Seeding entrepreneurship competency quizzes into database...');
  const quizzes = [
    {
      id: 1,
      courseId: 'investment-readiness',
      name: 'Investment Readiness & Valuation Essentials',
      intro: 'Evaluate your readiness on cap table management, post-money valuation, SAFE notes, and due diligence.',
      questions: [
        {
          id: 101,
          qtype: 'multichoice',
          name: 'Question 1',
          questiontext: '<p>What is the key advantage of a SAFE (Simple Agreement for Future Equity) note over traditional priced equity for an early-stage round?</p>',
          answers: [
            { id: 1001, text: 'It defers formal corporate valuation negotiations until a qualified priced round occurs.', isCorrect: true },
            { id: 1002, text: 'It requires immediate repayment with commercial interest within 12 months.', isCorrect: false },
            { id: 1003, text: 'It transfers 51% board voting control immediately to the investor.', isCorrect: false },
            { id: 1004, text: 'It exempts the company from local corporate tax filings.', isCorrect: false }
          ]
        },
        {
          id: 102,
          qtype: 'multichoice',
          name: 'Question 2',
          questiontext: '<p>If an investor invests $100,000 on a $900,000 pre-money valuation, what percentage of equity will the investor own post-money?</p>',
          answers: [
            { id: 1005, text: '10.0%', isCorrect: true },
            { id: 1006, text: '11.1%', isCorrect: false },
            { id: 1007, text: '9.0%', isCorrect: false },
            { id: 1008, text: '15.0%', isCorrect: false }
          ]
        },
        {
          id: 103,
          qtype: 'multichoice',
          name: 'Question 3',
          questiontext: '<p>Why do tier-1 gender-lens investors prioritize clear founder vesting schedules (e.g., 4-year vesting with a 1-year cliff)?</p>',
          answers: [
            { id: 1009, text: 'To ensure key founders remain committed to growing enterprise value over a sustainable time horizon.', isCorrect: true },
            { id: 1010, text: 'To force founders to forfeit all salaries.', isCorrect: false },
            { id: 1011, text: 'To automatically transfer shares to government regulators.', isCorrect: false },
            { id: 1012, text: 'To avoid annual financial audits.', isCorrect: false }
          ]
        }
      ]
    },
    {
      id: 2,
      courseId: 'export-readiness',
      name: 'AfCFTA Cross-Border Trade & Customs Compliance',
      intro: 'Test your understanding of Rules of Origin, tariff lines, non-tariff barriers, and regional customs.',
      questions: [
        {
          id: 201,
          qtype: 'multichoice',
          name: 'Question 1',
          questiontext: '<p>Under the AfCFTA Agreement, what is the primary role of the Certificate of Origin?</p>',
          answers: [
            { id: 2001, text: 'To prove goods were wholly obtained or substantially transformed in an African state to qualify for preferential duty rates.', isCorrect: true },
            { id: 2002, text: 'To replace commercial flight insurance.', isCorrect: false },
            { id: 2003, text: 'To serve as a personal travel passport for corporate directors.', isCorrect: false },
            { id: 2004, text: 'To mandate that all invoices be denominated exclusively in USD.', isCorrect: false }
          ]
        },
        {
          id: 202,
          qtype: 'multichoice',
          name: 'Question 2',
          questiontext: '<p>Which pan-African platform enables cross-border payments in local African currencies without passing through offshore correspondent banks?</p>',
          answers: [
            { id: 2005, text: 'Pan-African Payment and Settlement System (PAPSS)', isCorrect: true },
            { id: 2006, text: 'SWIFT Eurozone Clearing', isCorrect: false },
            { id: 2007, text: 'Federal Reserve Wire Network', isCorrect: false },
            { id: 2008, text: 'Euroclear Clearinghouse', isCorrect: false }
          ]
        }
      ]
    },
    {
      id: 3,
      courseId: 'financial-management',
      name: 'Financial Ratios, Unit Economics & Cashflow Runway',
      intro: 'Evaluate your ability to calculate gross margins, CAC:LTV, and rolling cash runway.',
      questions: [
        {
          id: 301,
          qtype: 'multichoice',
          name: 'Question 1',
          questiontext: '<p>What is a healthy Customer Lifetime Value to Customer Acquisition Cost (LTV:CAC) benchmark for a scalable business?</p>',
          answers: [
            { id: 3001, text: 'At least 3:1 (LTV is three times CAC)', isCorrect: true },
            { id: 3002, text: '1:3 (CAC is three times LTV)', isCorrect: false },
            { id: 3003, text: '1:1 (Breakeven per customer)', isCorrect: false },
            { id: 3004, text: 'Negative 2:1', isCorrect: false }
          ]
        }
      ]
    },
    {
      id: 4,
      courseId: 'pitch-n-grow',
      name: 'Customer Acquisition, Digital Funnels & Pitch Mastery',
      intro: 'Assess customer retention, digital channels, and pitch structure.',
      questions: [
        {
          id: 401,
          qtype: 'multichoice',
          name: 'Question 1',
          questiontext: '<p>What must the opening 30 seconds of an executive investor pitch primarily achieve?</p>',
          answers: [
            { id: 4001, text: 'Establish the painful market problem and your unique, defensible solution clearly.', isCorrect: true },
            { id: 4002, text: 'Read through the entire team resume bullet by bullet.', isCorrect: false },
            { id: 4003, text: 'List every line item in the office lease agreement.', isCorrect: false },
            { id: 4004, text: 'Disclose confidential supplier bank account numbers.', isCorrect: false }
          ]
        }
      ]
    },
    {
      id: 5,
      courseId: 'investment-readiness',
      name: 'Governance, Board Structure & Legal Risk for SMEs',
      intro: 'Master board committees, advisory boards, and shareholder agreements.',
      questions: [
        {
          id: 501,
          qtype: 'multichoice',
          name: 'Question 1',
          questiontext: '<p>Why is an independent non-executive director critical for early growth stage SMEs?</p>',
          answers: [
            { id: 5001, text: 'They bring unbiased governance, industry connections, and objective oversight to protect all shareholders.', isCorrect: true },
            { id: 5002, text: 'They take over daily operations from the founder.', isCorrect: false },
            { id: 5003, text: 'They eliminate the requirement for corporate income tax payments.', isCorrect: false },
            { id: 5004, text: 'They are legally prohibited from attending board meetings.', isCorrect: false }
          ]
        }
      ]
    },
    {
      id: 6,
      courseId: 'export-readiness',
      name: 'ESG, Impact Measurement & Pan-African Supply Chains',
      intro: 'Examine environmental sustainability, social inclusion metrics, and governance transparency.',
      questions: [
        {
          id: 601,
          qtype: 'multichoice',
          name: 'Question 1',
          questiontext: '<p>How does verifiable impact reporting on female smallholder farmer inclusion enhance DFI grant and concessional debt eligibility?</p>',
          answers: [
            { id: 6001, text: 'It validates gender-lens impact metrics required by development finance institutions such as AfDB and IFC.', isCorrect: true },
            { id: 6002, text: 'It automatically eliminates all transport costs.', isCorrect: false },
            { id: 6003, text: 'It replaces commercial bank accounts.', isCorrect: false },
            { id: 6004, text: 'It waives local product liability requirements.', isCorrect: false }
          ]
        }
      ]
    }
  ];

  for (const q of quizzes) {
    await prisma.quiz.upsert({
      where: { quizKey: q.id.toString() },
      update: {
        name: q.name,
        intro: q.intro,
        courseId: q.courseId || null,
        questionsJson: JSON.stringify(q.questions),
      },
      create: {
        id: q.id,
        quizKey: q.id.toString(),
        name: q.name,
        intro: q.intro,
        courseId: q.courseId || null,
        questionsJson: JSON.stringify(q.questions),
      },
    });
  }

  // Also update public/moodle_quizzes.json for full sync
  const quizzesPath = path.join(__dirname, 'public', 'moodle_quizzes.json');
  fs.writeFileSync(quizzesPath, JSON.stringify(quizzes, null, 2), 'utf-8');

  // Pre-seed a few passed quiz attempts for Learner User
  await prisma.quizAttempt.create({
    data: {
      userId: learnerUser.id,
      quizId: '1',
      score: 3,
      maxScore: 3,
      passed: true,
      details: JSON.stringify({
        '101': { isCorrect: true, selectedAnswerId: 1001 },
        '102': { isCorrect: true, selectedAnswerId: 1005 },
        '103': { isCorrect: true, selectedAnswerId: 1009 },
      }),
    },
  });

  console.log('Seed completed successfully!');
  console.log('---------------------------------------------------------');
  console.log('Demo Accounts Ready:');
  console.log('  1. Learner:  learner@awieforum.org  |  AwiefDemo2026!');
  console.log('  2. Admin:    admin@awieforum.org    |  AwiefAdmin2026!');
  console.log('  3. Author:   author@awieforum.org   |  AwiefAuthor2026!');
  console.log('---------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
