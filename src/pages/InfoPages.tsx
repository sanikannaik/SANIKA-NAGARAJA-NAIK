import { ShieldCheck, CheckCircle2, Lock, HeartHandshake, ArrowRight } from "lucide-react";
import { useApp } from "../context/AppContext";
import { ASSISTANCE_CATEGORIES, REQUEST_WORKFLOW_STEPS } from "../types/database";
import { CATEGORY_LABELS_KN } from "../lib/i18n";
import { SafeImage } from "../components/SafeImage";

const PORTRAIT_IMAGE = "/src/assets/images/volunteer_community_portrait_1794993213737.jpg";
const DIGITAL_IMAGE = "/src/assets/images/digital_assistance_session_1794993215740.jpg";

export function AboutPage() {
  const { navigate } = useApp();
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
      <div className="space-y-4">
        <p className="text-sm font-semibold text-blue-700">About ElderCare Connect</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Small Acts of Kindness, Stronger Communities.
        </h1>
        <p className="text-lg text-slate-600 leading-relaxed max-w-3xl">
          Many older adults live independently yet face daily barriers with errands, clinic queues, utility bills, or
          digital forms. ElderCare Connect bridges that gap by connecting seniors with identity-verified neighbors.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            title: "Safety & Verification First",
            body: "No volunteer can accept a request until administrators review their submitted ID document and approve their account.",
          },
          {
            title: "Respectful Privacy",
            body: "Exact residential addresses, phone numbers, and emergency contacts are protected via database row-level security.",
          },
          {
            title: "Accessible for Seniors",
            body: "Large buttons, voice input, plain language, and bilingual English and Kannada assistance make every screen approachable.",
          },
        ].map((item) => (
          <div key={item.title} className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
            <h2 className="font-display text-lg font-semibold text-slate-900">{item.title}</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900">Want to get involved?</h2>
          <p className="text-sm text-slate-600 mt-1">
            Register as an elderly member, family helper, or verified neighborhood volunteer.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("register")}
          className="px-5 py-3 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer whitespace-nowrap shrink-0"
        >
          Create an Account
        </button>
      </div>
    </div>
  );
}

export function HowItWorksPage() {
  const { navigate } = useApp();
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
      <div className="space-y-4">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          How ElderCare Connect Works
        </h1>
        <p className="text-lg text-slate-600 leading-relaxed max-w-3xl">
          Every assistance request follows a transparent seven-stage workflow tracked in real time.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <h2 className="font-display text-xl font-semibold text-slate-900">7-Stage Request Lifecycle</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {REQUEST_WORKFLOW_STEPS.map((stage, idx) => (
            <div key={stage} className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-mono text-xs text-blue-700 font-semibold tabular-nums">
                Step {String(idx + 1).padStart(2, "0")}
              </span>
              <p className="text-sm font-semibold text-slate-900">{stage}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-8 space-y-4">
          <ShieldCheck className="w-8 h-8 text-emerald-700" />
          <h2 className="font-display text-2xl font-bold text-slate-900">Atomic Single-Volunteer Acceptance</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            When a verified volunteer accepts an open request, a database transaction locks the request so two
            volunteers can never accept the same task simultaneously. The elderly user is notified instantaneously.
          </p>
          <button
            type="button"
            onClick={() => navigate("register")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline cursor-pointer"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="h-72">
          <SafeImage
            src={DIGITAL_IMAGE}
            alt="Volunteer sitting beside an elderly member helping with digital tasks"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}

export function ServicesPage() {
  const { navigate, language, profile } = useApp();
  const descriptions: Record<string, string> = {
    "Medical Assistance": "Non-emergency clinic check-ins, prescription reminders, and organizing appointment folders.",
    "Grocery Shopping": "Picking up fresh vegetables, milk, grains, and everyday kitchen items from neighborhood stores.",
    "Medicine Collection": "Collecting prescribed medicines from nearby pharmacies with clear receipt transparency.",
    Transportation: "Accompanied local rides to banks, clinics, post offices, or community gatherings.",
    "Hospital Visits": "Support navigating hospital registration counters, waiting rooms, and follow-up instructions.",
    "Household Assistance": "Light household help such as changing bulbs, organizing shelves, or minor safe tasks.",
    "Digital Assistance": "Patient help with video calling family, smartphone settings, online forms, and scam awareness.",
    "Bill Payments": "Guidance paying electricity, water, property tax, or phone bills safely.",
    Companionship: "Warm conversation, newspaper reading, morning walks, and regular wellness check-ins.",
    "Other Assistance": "Any other safe everyday community help tailored to your routine.",
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Community Assistance Services
          </h1>
          <p className="mt-2 text-base text-slate-600 max-w-2xl">
            Ten structured categories so volunteers match with tasks they are qualified and comfortable supporting.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(profile ? "create-request" : "register")}
          className="px-5 py-3 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer whitespace-nowrap shrink-0"
        >
          Request Assistance
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {ASSISTANCE_CATEGORIES.map((cat, index) => (
          <div key={cat} className="bg-white border border-slate-200 rounded-xl p-6 flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <span className="font-mono text-xs text-blue-700 tabular-nums">
                {String(index + 1).padStart(2, "0")}.
              </span>
              <h2 className="font-display text-lg font-semibold text-slate-900">
                {language === "kn" ? `${CATEGORY_LABELS_KN[cat]} (${cat})` : cat}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">{descriptions[cat]}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate(profile ? "create-request" : "register")}
              className="text-xs font-semibold text-blue-700 hover:underline shrink-0 cursor-pointer"
            >
              Request
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BecomeVolunteerPage() {
  const { navigate } = useApp();
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7 space-y-5">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Become a Verified Neighborhood Volunteer
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Give an hour a week to help an elder nearby with groceries, clinic visits, bill payments, or friendly
            company.
          </p>
          <ul className="space-y-3 text-sm text-slate-700">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>Choose the exact categories, skills, and service neighborhoods you prefer.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>Upload your verification ID securely into private encrypted Supabase Storage.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>View matched requests nearby and accept only when your schedule fits.</span>
            </li>
          </ul>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate("register")}
              className="px-6 py-3.5 text-base font-semibold text-white bg-blue-700 rounded-xl hover:bg-blue-800 cursor-pointer"
            >
              Apply as a Volunteer
            </button>
          </div>
        </div>
        <div className="lg:col-span-5">
          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
            <SafeImage
              src={PORTRAIT_IMAGE}
              alt="Smiling community volunteer portrait"
              className="w-full aspect-square object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">
      <div className="flex items-center gap-3">
        <Lock className="w-6 h-6 text-blue-700" />
        <h1 className="font-display text-3xl font-bold text-slate-900">Privacy & Safety Policy</h1>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold text-slate-900">1. Residential Address Protection</h2>
          <p>
            Elderly members’ exact residential street addresses, phone numbers, and emergency contacts are never shown on
            public listings or open volunteer feeds. Only general neighborhood/city text is displayed for matching. Exact
            contact details are disclosed exclusively to the single verified volunteer assigned to an active request.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold text-slate-900">2. Verification Document Security</h2>
          <p>
            Volunteer identity verification documents are stored inside a private Supabase Storage bucket protected by
            Row Level Security policies. Only the document owner and authorized platform administrators can generate
            time-limited signed access links.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold text-slate-900">3. Non-Medical AI Assistance</h2>
          <p>
            ElderCare AI Assistant helps with website navigation, request preparation, and Kannada/English translation.
            It never diagnoses health conditions or prescribes medications. For urgent medical situations, always call
            local emergency services immediately.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold text-slate-900">4. Incident Reporting & Account Suspension</h2>
          <p>
            Members can report inappropriate conduct on any request. Administrators review every incident report and can
            suspend suspicious accounts immediately to safeguard the community.
          </p>
        </section>
      </div>
    </div>
  );
}
