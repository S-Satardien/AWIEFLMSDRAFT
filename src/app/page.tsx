import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { prisma } from "@/lib/prisma";
import { summarizeCourseReviews } from "@/lib/courseReviews";
import { Award, Check, Briefcase, Users, Globe, Star, ArrowRight } from "@/components/Icons";

export const dynamic = "force-dynamic";

/**
 * Public landing page for the AWIEF Digital Learning Academy.
 * Showcases AWIEF's four core pillars, impact metrics, alumni testimonials,
 * and commercial course catalogue with multi-currency pricing and African payment gateways.
 *
 * @returns {Promise<JSX.Element>} The rendered landing page component.
 */
export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/dashboard");
  }

  const courses = await prisma.course.findMany({
    where: { isPublished: true },
    include: {
      reviews: {
        select: { rating: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const flagshipCourse =
    courses.find((c) => c.id === "investment-readiness") || courses[0] || null;
  const flagshipSummary = flagshipCourse
    ? summarizeCourseReviews(flagshipCourse.reviews)
    : null;

  const awiefPillars = [
    {
      index: "01",
      tag: "BUILD",
      title: "Enterprise Development",
      headline: "Innovative Methods to Forward Female-Led Business",
      description:
        "Incubators, accelerators, investment readiness training, and practical capacity programmes equipping women-owned MSMEs to scale sustainably.",
      footer: "AWIEF Growth Accelerator",
      accentBorder: "border-t-[#7F3D59]",
      iconBg: "bg-[#7F3D59] text-white",
      Icon: Briefcase,
    },
    {
      index: "02",
      tag: "CONNECT",
      title: "Annual Conference",
      headline: "World-Class Networking & Showcase Opportunities",
      description:
        "Africa's flagship women entrepreneurship forum bringing together 1,300+ founders, global investors, DFI principals, and policymakers every year.",
      footer: "AWIEF Conference & Exhibition",
      accentBorder: "border-t-[#D4AF37]",
      iconBg: "bg-[#5E2C41] text-[#D4AF37]",
      Icon: Users,
    },
    {
      index: "03",
      tag: "RECOGNISE",
      title: "AWIEF Awards",
      headline: "Celebrating Outstanding Female Achievement",
      description:
        "Continental recognition across eight industry categories honouring women entrepreneurs leading innovation in tech, agribusiness, energy, and trade.",
      footer: "60+ Past Winners Honoured",
      accentBorder: "border-t-[#7F3D59]",
      iconBg: "bg-[#D4AF37] text-[#1D0B14]",
      Icon: Award,
    },
    {
      index: "04",
      tag: "IMPACT",
      title: "Policy & Advocacy",
      headline: "Driving Gender Equality Across Systems & Sectors",
      description:
        "Evidence-based policy advocacy, ministerial roundtables, and continental research advancing women's economic participation under AfCFTA.",
      footer: "Gender & AfCFTA Advocacy",
      accentBorder: "border-t-[#1D0B14]",
      iconBg: "bg-[#1D0B14] text-white",
      Icon: Globe,
    },
  ];

  return (
    <div className="min-h-screen bg-[#FDF8F9] flex flex-col selection:bg-[#7F3D59] selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-[#FDF8F9] to-[#F7EEF2] py-16 lg:py-24 border-b border-[#EAD7E0]">
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ 
            backgroundImage: "radial-gradient(#7F3D59 1px, transparent 1px)", 
            backgroundSize: "24px 24px" 
          }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#7F3D59]/10 border border-[#7F3D59]/25 text-[#7F3D59] text-xs font-bold uppercase tracking-wider">
                <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>UN ECOSOC Consultative Status | Official AWIEF Academy</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-extrabold text-[#1D0B14] tracking-tight leading-[1.12]">
                Advancing Women. <br className="hidden sm:inline" />
                <span className="text-[#7F3D59] italic">Growing Economies.</span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-700 leading-relaxed font-normal max-w-2xl mx-auto lg:mx-0">
                Empowering African women founders, MSMEs, and business leaders with commercial-grade, bite-sized masterclasses in investment readiness, AfCFTA export trade, cashflow governance, and investor pitch mastery.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link 
                  href="/catalog"
                  className="px-8 py-4 bg-[#7F3D59] hover:bg-[#5E2C41] text-white rounded-xl text-base font-bold transition-all shadow-md hover:shadow-lg inline-flex items-center justify-center gap-2"
                >
                  <span>Explore Masterclasses &amp; Pricing</span>
                  <ArrowRight className="w-5 h-5 text-[#D4AF37]" />
                </Link>
                <Link 
                  href="/login"
                  className="px-8 py-4 bg-white hover:bg-[#FDF8F9] text-[#7F3D59] border-2 border-[#7F3D59]/40 hover:border-[#7F3D59] rounded-xl text-base font-bold transition-all shadow-xs inline-flex items-center justify-center gap-2"
                >
                  <span>1-Click Demo Login</span>
                </Link>
              </div>

              {/* Multi-Gateway Payment Strip */}
              <div className="pt-6 border-t border-[#EAD7E0] flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-xs font-semibold text-gray-600">
                <span className="text-[#7F3D59] font-bold">Accepted Gateways:</span>
                <span className="bg-white px-2.5 py-1 rounded border border-gray-200 shadow-xs">PayFast (ZAR Cards &amp; EFT)</span>
                <span className="bg-white px-2.5 py-1 rounded border border-gray-200 shadow-xs">PayPal (USD)</span>
                <span className="bg-white px-2.5 py-1 rounded border border-gray-200 shadow-xs">Paystack &amp; M-Pesa / MoMo</span>
              </div>
            </div>

            {/* Right Hero Graphic / Featured Card */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#EAD7E0] p-6 relative overflow-hidden group hover:shadow-3xl transition-shadow">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#7F3D59]/10 rounded-bl-full pointer-events-none"></div>
                
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 bg-[#7F3D59] text-white text-xs font-extrabold rounded-full uppercase tracking-wider">
                    Flagship Masterclass
                  </span>
                  <span className="text-xs font-bold text-[#D4AF37] bg-[#7F3D59]/10 px-2.5 py-0.5 rounded-full">
                    R1,850 / $105
                  </span>
                </div>

                <div className="relative h-48 rounded-2xl overflow-hidden mb-4 border border-gray-100 bg-[#1D0B14]">
                  <img 
                    src="/images/courses/investment-readiness.png" 
                    alt="Investment Readiness &amp; Capital Raising" 
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex items-end p-4">
                    <div className="text-white">
                      <p className="text-xs text-[#D4AF37] font-semibold uppercase tracking-wider">5 Bite-Sized Modules • 2.5 Hours</p>
                      <h4 className="text-base font-serif font-bold leading-tight">Investment Readiness &amp; Capital Raising</h4>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                    Financial model restructuring, valuation frameworks, investor data room preparation, and pitch deck mastery for African women founders seeking angel, venture, or DFI capital.
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                    <span className="font-medium text-[#7F3D59]">Faculty: Nomsa Dlamini</span>
                    {flagshipSummary && flagshipSummary.totalReviews > 0 ? (
                      <span className="inline-flex items-center gap-1 font-bold text-[#1D0B14]">
                        <Star className="w-3.5 h-3.5 text-[#D4AF37] fill-[#D4AF37]" />
                        <span>{flagshipSummary.averageRating.toFixed(1)} ({flagshipSummary.totalReviews})</span>
                      </span>
                    ) : (
                      <span className="font-bold text-[#7F3D59]">Verifiable Certificate</span>
                    )}
                  </div>

                  <Link 
                    href="/courses/investment-readiness"
                    className="w-full py-3 bg-[#7F3D59] hover:bg-[#5E2C41] text-white text-center rounded-xl text-sm font-bold transition-colors shadow-md mt-2 inline-flex items-center justify-center gap-1.5"
                  >
                    <span>View Syllabus &amp; Enroll</span>
                    <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Key Metrics Strip */}
      <section className="bg-[#1D0B14] text-white py-8 shadow-inner border-y border-[#3E1A29]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-[#D4AF37] font-serif">6,000+</p>
              <p className="text-xs sm:text-sm text-gray-300 font-medium mt-1">Entrepreneurs Upskilled</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-white font-serif">54</p>
              <p className="text-xs sm:text-sm text-gray-300 font-medium mt-1">African Nations Reached</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-[#D4AF37] font-serif">60+</p>
              <p className="text-xs sm:text-sm text-gray-300 font-medium mt-1">AWIEF Award Winners</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-white font-serif">UN ECOSOC</p>
              <p className="text-xs sm:text-sm text-gray-300 font-medium mt-1">Special Consultative Status</p>
            </div>
          </div>
        </div>
      </section>

      {/* About AWIEF & Four Pillars Section (awieforum.org Style Guide) */}
      <section id="about-awief" className="py-20 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#7F3D59]">
              The Foundations of Our Success
            </h2>
            <h3 className="text-3xl sm:text-4xl font-serif font-extrabold text-[#1D0B14] tracking-tight">
              We Facilitate, Support, and Inspire
            </h3>
            <div className="w-16 h-1 bg-[#D4AF37] mx-auto rounded-full" />
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed font-light pt-1">
              Since 2015, the <strong>Africa Women Innovation and Entrepreneurship Forum (AWIEF)</strong> has advanced female entrepreneurship and economic growth across 54 African nations through four interconnected pillars.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {awiefPillars.map(({ index, tag, title, headline, description, footer, accentBorder, iconBg, Icon }) => (
              <article
                key={tag}
                className={`bg-white rounded-xl p-6 border border-[#EAD7E0] border-t-4 ${accentBorder} hover:shadow-xl transition-all flex flex-col justify-between group`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-11 h-11 rounded-lg ${iconBg} flex items-center justify-center shadow-xs`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#7F3D59]">
                      {index} · {tag}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-xl font-bold font-serif text-[#1D0B14] group-hover:text-[#7F3D59] transition-colors">
                      {title}
                    </h4>
                    <p className="text-xs font-semibold text-[#7F3D59] leading-snug">
                      {headline}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {description}
                  </p>
                </div>
                <div className="pt-4 border-t border-gray-100 mt-6 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1D0B14]">{footer}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Course Catalog Section */}
      <section id="courses" className="py-20 lg:py-24 bg-[#FDF8F9] border-t border-[#EAD7E0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7F3D59]/10 text-[#7F3D59] text-xs font-bold uppercase tracking-wider mb-2">
                <span>Enterprise Curriculum</span>
              </div>
              <h3 className="text-3xl sm:text-4xl font-serif font-extrabold text-gray-900 tracking-tight">
                Priced Masterclasses &amp; Demo Courses
              </h3>
              <p className="text-gray-600 text-base mt-2 max-w-xl font-light">
                Explore our commercial and sponsored masterclasses. Every course features structured 20–30 min bite-sized modules, downloadable business templates, and verifiable QR-coded digital credentials.
              </p>
            </div>
            <Link 
              href="/catalog"
              className="shrink-0 px-6 py-3 bg-[#7F3D59] hover:bg-[#5E2C41] text-white text-sm font-bold rounded-xl transition-colors shadow-sm inline-flex items-center gap-2 self-start md:self-auto"
            >
              <span>View Full Catalogue ({courses.length})</span>
              <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course) => {
              const priceDisplay = course.isFree 
                ? "Free / Sponsored" 
                : `R${course.priceZar.toLocaleString()} / $${course.priceUsd}`;
              const ratingSummary = summarizeCourseReviews(course.reviews);

              return (
                <div 
                  key={course.id} 
                  className="bg-white rounded-2xl shadow-sm border border-[#EAD7E0] overflow-hidden hover:shadow-xl transition-all flex flex-col justify-between group relative"
                >
                  <div>
                    {/* Thumbnail */}
                    <div className="relative h-52 w-full bg-[#1D0B14] overflow-hidden">
                      <img 
                        src={course.thumbnailUrl || "/images/courses/investment-readiness.png"} 
                        alt={course.title} 
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 flex gap-2">
                        <span className="px-3 py-1 bg-[#7F3D59] text-white text-[11px] font-extrabold rounded-full uppercase tracking-wider shadow-sm">
                          {course.category || "Masterclass"}
                        </span>
                        {course.isNative ? (
                          <span className="px-2.5 py-1 bg-[#D4AF37] text-[#1D0B14] text-[10px] font-bold rounded-full uppercase">
                            Bite-Sized Native
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded-full uppercase">
                            SCORM 1.2 / 2004
                          </span>
                        )}
                      </div>
                      <div className="absolute bottom-3 right-3">
                        <span className="px-2.5 py-1 bg-black/75 backdrop-blur-md text-[#D4AF37] text-xs font-semibold rounded-md">
                          {priceDisplay}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-3">
                      <h4 className="text-xl font-serif font-bold text-gray-900 group-hover:text-[#7F3D59] transition-colors leading-snug line-clamp-2">
                        {course.title}
                      </h4>
                      <p className="text-xs font-semibold text-[#7F3D59]">
                        Faculty: {course.instructor || course.authorName || "AWIEF Faculty"}
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                        {course.shortDescription || course.description}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 pt-0 space-y-3">
                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
                        {course.duration || "Self-Paced"}
                      </span>
                      {ratingSummary.totalReviews > 0 ? (
                        <span className="inline-flex items-center gap-1 font-bold text-[#1D0B14]">
                          <Star className="w-3.5 h-3.5 text-[#D4AF37] fill-[#D4AF37]" />
                          <span>{ratingSummary.averageRating.toFixed(1)}</span>
                          <span className="text-gray-400 font-normal">({ratingSummary.totalReviews})</span>
                        </span>
                      ) : (
                        <span className="text-[#7F3D59] font-bold">
                          {course.royaltyRate ? `${course.royaltyRate}% Author Royalty` : "Open Demo"}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Link 
                        href={`/courses/${course.id}`}
                        className="w-full py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-center rounded-xl text-xs font-bold transition-colors"
                      >
                        Syllabus &amp; Pricing
                      </Link>
                      <Link 
                        href={`/courses/${course.id}?checkout=true`}
                        className="w-full py-2.5 px-3 bg-[#7F3D59] hover:bg-[#5E2C41] text-white text-center rounded-xl text-xs font-bold transition-colors shadow-sm"
                      >
                        {course.isFree ? "Enroll Free" : "Purchase Course"}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white border-t border-[#EAD7E0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#7F3D59]">
              Alumni &amp; Partner Voices
            </h2>
            <h3 className="text-3xl sm:text-4xl font-serif font-extrabold text-gray-900 tracking-tight">
              Transforming Lives Across the Continent
            </h3>
            <p className="text-gray-600 text-base font-light">
              Hear from graduates of AWIEF enterprise development programmes and corporate partners.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-[#FDF8F9] p-8 rounded-2xl border border-[#EAD7E0] flex flex-col justify-between">
              <div className="space-y-4">
                <div className="text-[#D4AF37] text-2xl font-serif">“</div>
                <p className="text-sm text-gray-700 italic leading-relaxed">
                  AWIEF&apos;s Investment Readiness curriculum completely demystified venture capital for Ramtsilo. We secured equity backing and scaled our plastic brick recycling facility across South Africa.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-6 border-t border-gray-200 mt-6">
                <img 
                  src="/images/testimonials/kedibone.webp" 
                  alt="Kedibone Tsiloane" 
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#D4AF37]"
                />
                <div>
                  <h5 className="text-sm font-bold text-gray-900">Kedibone Tsiloane</h5>
                  <p className="text-xs text-[#7F3D59]">Co-Founder, Ramtsilo • AWIEF Award Winner</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-[#FDF8F9] p-8 rounded-2xl border border-[#EAD7E0] flex flex-col justify-between">
              <div className="space-y-4">
                <div className="text-[#D4AF37] text-2xl font-serif">“</div>
                <p className="text-sm text-gray-700 italic leading-relaxed">
                  The AfCFTA cross-border trade modules provided real, actionable compliance playbooks. For Giraffe Bioenergy in Kenya, navigating rules of origin and export tariffs became seamless.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-6 border-t border-gray-200 mt-6">
                <img 
                  src="/images/testimonials/linda.jpg" 
                  alt="Dr. Linda Davis" 
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#D4AF37]"
                />
                <div>
                  <h5 className="text-sm font-bold text-gray-900">Dr. Linda Davis</h5>
                  <p className="text-xs text-[#7F3D59]">CEO, Giraffe Bioenergy (Kenya)</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-[#FDF8F9] p-8 rounded-2xl border border-[#EAD7E0] flex flex-col justify-between">
              <div className="space-y-4">
                <div className="text-[#D4AF37] text-2xl font-serif">“</div>
                <p className="text-sm text-gray-700 italic leading-relaxed">
                  Deloitte has partnered with AWIEF for multiple years. Their ability to deliver measurable, gender-inclusive capacity building across all 54 nations is unparalleled on the African continent.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-6 border-t border-gray-200 mt-6">
                <img 
                  src="/images/partners/deloitte.png" 
                  alt="Deloitte Africa" 
                  className="w-12 h-12 rounded-full object-contain bg-white p-1 border-2 border-[#D4AF37]"
                />
                <div>
                  <h5 className="text-sm font-bold text-gray-900">Ashleigh Theophanides</h5>
                  <p className="text-xs text-[#7F3D59]">Managing Partner, Deloitte Africa</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise & Donor Partnership Callout */}
      <section id="partnership" className="py-16 bg-[#1D0B14] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-[#5E2C41] to-[#7F3D59] rounded-3xl p-8 sm:p-12 lg:p-16 border border-[#D4AF37]/30 shadow-2xl relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#D4AF37] text-xs font-bold uppercase tracking-wider">
                  <span>Corporate &amp; Philanthropic Partnerships</span>
                </div>
                <h3 className="text-3xl sm:text-4xl font-serif font-extrabold text-white">
                  Collaborate with the AWIEF Digital Learning Academy
                </h3>
                <p className="text-gray-200 text-sm sm:text-base leading-relaxed">
                  Partner with AWIEF to sponsor full cohorts of women entrepreneurs, deploy custom enterprise curricula, or sponsor masterclasses across your supply chains. Our platform provides auditable learner analytics, verifiable credentials, and granular reporting.
                </p>
                <div className="flex flex-wrap gap-4 pt-2 text-xs text-gray-200">
                  <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg">
                    <Check className="w-3.5 h-3.5 text-[#D4AF37]" /> White-label cohort management
                  </span>
                  <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg">
                    <Check className="w-3.5 h-3.5 text-[#D4AF37]" /> Live royalty and statement engine
                  </span>
                  <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg">
                    <Check className="w-3.5 h-3.5 text-[#D4AF37]" /> Automated CSV / JSON data exports
                  </span>
                </div>
              </div>

              <div className="lg:col-span-4 flex flex-col gap-3">
                <Link
                  href="/login"
                  className="px-8 py-4 bg-[#D4AF37] hover:bg-[#B89628] text-[#1D0B14] text-center rounded-xl text-base font-bold transition-all shadow-lg hover:shadow-xl font-serif inline-flex items-center justify-center gap-2"
                >
                  <span>Enter Demo Academy</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="mailto:info@awieforum.org?subject=AWIEF%20LMS%20Partnership%20Inquiry"
                  className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white text-center rounded-xl text-xs font-semibold transition-colors border border-white/20"
                >
                  Contact Secretariat (info@awieforum.org)
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
