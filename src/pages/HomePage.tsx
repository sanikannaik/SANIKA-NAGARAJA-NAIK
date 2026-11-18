import { useEffect, useState } from "react";
import {
  ShieldCheck,
  HeartHandshake,
  Clock,
  ArrowRight,
  Star,
  MapPin,
  Database,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { getSupabaseClient } from "../lib/supabase";
import { TRANSLATIONS, CATEGORY_LABELS_KN } from "../lib/i18n";
import {
  ASSISTANCE_CATEGORIES,
  CommunityStats,
  PublicReview,
  PublicVolunteer,
} from "../types/database";
import { SafeImage } from "../components/SafeImage";

const HERO_IMAGE = "/src/assets/images/hero_eldercare_assistance_1794993214186.jpg";
const HOSPITAL_IMAGE = "/src/assets/images/community_hospital_companion_1794993215361.jpg";
const DIGITAL_IMAGE = "/src/assets/images/digital_assistance_session_1794993215740.jpg";

export function HomePage() {
  const { navigate, language, supabaseConfigured, profile } = useApp();
  const t = TRANSLATIONS[language];

  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [volunteers, setVolunteers] = useState<PublicVolunteer[]>([]);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loadingLive, setLoadingLive] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setStats(null);
      setVolunteers([]);
      setReviews([]);
      return;
    }

    let cancelled = false;
    setLoadingLive(true);

    Promise.all([
      supabase.rpc("get_public_community_stats"),
      supabase.rpc("get_public_verified_volunteers"),
      supabase.rpc("get_public_reviews"),
    ])
      .then(([statsRes, volRes, revRes]) => {
        if (cancelled) return;
        if (statsRes.data) setStats(statsRes.data as CommunityStats);
        if (Array.isArray(volRes.data)) setVolunteers((volRes.data as PublicVolunteer[]).slice(0, 3));
        if (Array.isArray(revRes.data)) setReviews((revRes.data as PublicReview[]).slice(0, 3));
      })
      .finally(() => {
        if (!cancelled) setLoadingLive(false);
      });

    return () => {
      cancelled = true;
    };
  }, [supabaseConfigured]);

  const handleNeedAssistance = () => {
    navigate("create-request");
  };

  return (
    <div>
      {/* 1. Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-18">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <p className="text-sm font-medium text-emerald-800">{t.tagline}</p>
              <h1
                className="font-display font-bold text-slate-900 tracking-tight leading-[1.12]"
                style={{ fontSize: "clamp(2.25rem, 4vw, 3.5rem)", textWrap: "balance" }}
              >
                {t.heroHeadline}
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed max-w-xl">{t.heroDescription}</p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleNeedAssistance}
                  className="px-6 py-3.5 text-base font-semibold text-white bg-blue-700 rounded-xl hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {t.ctaNeedHelp}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("become-volunteer")}
                  className="px-6 py-3.5 text-base font-semibold text-slate-900 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {t.ctaBecomeVolunteer}
                </button>
              </div>

              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
                <span>ID-Verified Volunteers</span>
                <span aria-hidden="true">·</span>
                <span>Private Residential Addresses</span>
                <span aria-hidden="true">·</span>
                <span>English & ಕನ್ನಡ Support</span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[300px] lg:min-h-[440px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                <SafeImage
                  src={HERO_IMAGE}
                  alt="Community volunteer helping an elderly woman carry fresh groceries up sunlit porch steps"
                  className="w-full h-full object-cover"
                  fallbackTitle="Neighborhood ElderCare Support"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Live Community Impact Statistics (Strictly Real Data — Never Fabricated) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-display text-xl font-semibold text-slate-900">
                {t.communityImpactTitle}
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                Real-time community totals read directly from our verified PostgreSQL database.
              </p>
            </div>
            {!supabaseConfigured && (
              <button
                type="button"
                onClick={() => navigate("setup")}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Database className="w-4 h-4" />
                Connect Supabase to Show Live Totals
              </button>
            )}
          </div>

          {stats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-slate-100">
              <div>
                <p className="text-xs font-medium text-slate-500">Verified Volunteers</p>
                <p className="mt-1 font-mono text-3xl font-semibold text-slate-900 tabular-nums">
                  {stats.verified_volunteers}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Completed Requests</p>
                <p className="mt-1 font-mono text-3xl font-semibold text-emerald-700 tabular-nums">
                  {stats.completed_requests}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Registered Elders</p>
                <p className="mt-1 font-mono text-3xl font-semibold text-slate-900 tabular-nums">
                  {stats.elderly_members}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Average Review Rating</p>
                <p className="mt-1 font-mono text-3xl font-semibold text-blue-700 tabular-nums">
                  {stats.average_rating > 0 ? `${stats.average_rating} / 5` : "—"}
                </p>
              </div>
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-100 text-sm text-slate-600">
              {loadingLive
                ? "Loading live community statistics..."
                : "No live database connected yet. Once your Supabase project is linked, verified volunteer counts, completed requests, and real member ratings appear here automatically."}
            </div>
          )}
        </div>
      </section>

      {/* 3. How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-2xl mb-10">
          <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
            {t.howItWorksTitle}
          </h2>
          <p className="mt-2 text-base text-slate-600">
            Four clear steps designed for simplicity, transparency, and peace of mind.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              num: "01",
              title: "Describe What You Need",
              desc: "Type or speak in English or Kannada. Our AI helper organizes the category and details clearly.",
            },
            {
              num: "02",
              title: "Matched With Verified Neighbors",
              desc: "Only identity-verified volunteers in your service area can view and accept open requests.",
            },
            {
              num: "03",
              title: "Track Every Update Live",
              desc: "Follow real-time progress from acceptance through arrival and task completion without refreshing.",
            },
            {
              num: "04",
              title: "Confirm & Share Feedback",
              desc: "Elderly members confirm when help is finished and rate their experience to keep trust high.",
            },
          ].map((step) => (
            <div key={step.num} className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <span className="font-mono text-sm font-medium text-blue-700 tabular-nums">{step.num}.</span>
              <h3 className="font-display text-lg font-semibold text-slate-900">{step.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Assistance Categories + Editorial Proof Split */}
      <section className="bg-white border-y border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
                {t.categoriesTitle}
              </h2>
              <p className="mt-2 text-base text-slate-600">
                Practical support for everyday tasks, medical visits, digital errands, and companionship.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("services")}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline cursor-pointer shrink-0"
            >
              Explore All Services <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {ASSISTANCE_CATEGORIES.map((cat, idx) => (
              <button
                key={cat}
                type="button"
                onClick={() => navigate(profile ? "create-request" : "services")}
                className="text-left p-5 rounded-xl bg-[#F7F9FB] border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors cursor-pointer"
              >
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <p className="mt-2 font-display text-base font-semibold text-slate-900">
                  {language === "kn" ? CATEGORY_LABELS_KN[cat] || cat : cat}
                </p>
                {language === "kn" && <p className="text-xs text-slate-500 mt-1">{cat}</p>}
              </button>
            ))}
          </div>

          {/* Why Choose ElderCare Connect — Asymmetric 2-card Showcase */}
          <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-7 bg-[#F7F9FB] border border-slate-200 rounded-2xl overflow-hidden grid grid-cols-1 sm:grid-cols-2">
              <div className="p-7 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <ShieldCheck className="w-7 h-7 text-emerald-700" />
                  <h3 className="font-display text-2xl font-bold text-slate-900">{t.whyChooseTitle}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Every volunteer submits identity documents reviewed by administrators before they can view or
                    accept any neighborhood request.
                  </p>
                </div>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>· Exact home address shared only after assignment</li>
                  <li>· Atomic single-volunteer lock prevents duplicates</li>
                  <li>· Protected in-platform messaging and reporting</li>
                </ul>
              </div>
              <div className="min-h-[240px]">
                <SafeImage
                  src={HOSPITAL_IMAGE}
                  alt="Volunteer accompanying an elderly gentleman inside a bright modern clinic"
                  className="w-full h-full object-cover"
                  fallbackTitle="Hospital Visit Escort"
                />
              </div>
            </div>

            <div className="lg:col-span-5 bg-[#F7F9FB] border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
              <div className="h-52">
                <SafeImage
                  src={DIGITAL_IMAGE}
                  alt="Volunteer helping an elderly woman learn tablet video calls at home"
                  className="w-full h-full object-cover"
                  fallbackTitle="Digital & Household Guidance"
                />
              </div>
              <div className="p-7 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold text-slate-900">
                    Accessible Design & Bilingual Voice Support
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    Large readable controls, one-click text scaling, voice-to-request dictation, and full English &
                    ಕನ್ನಡ guidance.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("how-it-works")}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline cursor-pointer w-fit"
                >
                  Read Our Safety Model <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Verified Volunteers (Live DB) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
              {t.verifiedVolunteersTitle}
            </h2>
            <p className="mt-2 text-base text-slate-600">
              Approved neighborhood helpers ready to assist with groceries, clinic visits, and everyday errands.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("find-assistance")}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline cursor-pointer shrink-0"
          >
            Browse All Volunteers <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {volunteers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {volunteers.map((v) => (
              <div key={v.user_id} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-slate-900">{v.full_name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {v.service_area || v.city || "Local Neighborhood"}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-emerald-800 font-semibold tabular-nums">
                    Verified
                  </span>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">
                  {v.bio || "Verified community volunteer available for neighborhood elderly assistance."}
                </p>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span>{v.categories.slice(0, 2).join(" · ") || "General Assistance"}</span>
                  <span className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-800">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    {v.rating > 0 ? `${v.rating} (${v.review_count})` : "New"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <HeartHandshake className="w-6 h-6 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display text-base font-semibold text-slate-900">
                  {supabaseConfigured
                    ? "No verified volunteers listed yet"
                    : "Connect Supabase to display verified community volunteers"}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Only real, administrator-approved volunteer profiles from your database are displayed here—never
                  placeholder profiles.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(supabaseConfigured ? "become-volunteer" : "setup")}
              className="px-4 py-2.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer whitespace-nowrap shrink-0"
            >
              {supabaseConfigured ? "Apply as a Volunteer" : "Open Supabase Setup"}
            </button>
          </div>
        )}
      </section>

      {/* 6. Community Testimonials (Real Verified Reviews Only) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="font-display text-2xl font-bold text-slate-900 mb-6">{t.testimonialsTitle}</h2>
        {reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map((rev) => (
              <blockquote key={rev.id} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{rev.category}</span>
                  <span className="font-mono text-slate-800 tabular-nums">{rev.rating} / 5 ★</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">“{rev.feedback}”</p>
                <footer className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                  {rev.elderly_name} · Assisted by {rev.volunteer_name}
                </footer>
              </blockquote>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center gap-3 text-sm text-slate-600">
            <Clock className="w-5 h-5 text-slate-400 shrink-0" />
            <span>
              Verified member feedback appears here automatically once elderly members confirm completed requests and
              submit ratings.
            </span>
          </div>
        )}
      </section>

      {/* 7. Bottom Call-To-Action */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-slate-900 text-white rounded-2xl p-8 sm:p-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-2xl space-y-3">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Ready to request help or support an elder in your neighborhood?
            </h2>
            <p className="text-slate-300 text-base">
              Join ElderCare Connect with simple registration, verified volunteer screening, and real-time request
              tracking.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleNeedAssistance}
              className="px-6 py-3.5 text-sm font-semibold text-slate-900 bg-white rounded-xl hover:bg-slate-100 cursor-pointer whitespace-nowrap"
            >
              {t.ctaNeedHelp}
            </button>
            <button
              type="button"
              onClick={() => navigate("become-volunteer")}
              className="px-6 py-3.5 text-sm font-semibold text-white bg-blue-700 rounded-xl hover:bg-blue-600 cursor-pointer whitespace-nowrap"
            >
              {t.ctaBecomeVolunteer}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
