import { Globe, Type, PhoneCall } from "lucide-react";
import { useApp } from "../context/AppContext";
import { TRANSLATIONS } from "../lib/i18n";

export function Footer() {
  const { navigate, language, setLanguage, largeText, toggleLargeText, supabaseConfigured } = useApp();
  const t = TRANSLATIONS[language];

  return (
    <footer className="bg-white border-t border-slate-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        {/* Emergency safety reminder */}
        <div className="mb-12 p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <PhoneCall className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-800 leading-relaxed">{t.emergencyBanner}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setLanguage(language === "en" ? "kn" : "en")}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              <Globe className="w-4 h-4 text-blue-700" />
              {language === "en" ? "ಕನ್ನಡದಲ್ಲಿ ನೋಡಿ" : "View in English"}
            </button>
            <button
              type="button"
              onClick={toggleLargeText}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium border rounded-lg cursor-pointer whitespace-nowrap ${
                largeText
                  ? "bg-blue-700 text-white border-blue-700"
                  : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
              }`}
            >
              <Type className="w-4 h-4" />
              {largeText ? t.standardText : t.largeText}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900">{t.brand}</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{t.tagline}</p>
            <p className="mt-4 text-sm text-slate-500">
              Community Support Desk: <span className="font-mono text-slate-700">support@eldercareconnect.org</span>
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Platform</h4>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li>
                <button type="button" onClick={() => navigate("find-assistance")} className="hover:text-blue-700 cursor-pointer">
                  Find Assistance
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("become-volunteer")} className="hover:text-blue-700 cursor-pointer">
                  Become a Volunteer
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("how-it-works")} className="hover:text-blue-700 cursor-pointer">
                  How It Works
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("services")} className="hover:text-blue-700 cursor-pointer">
                  Assistance Services
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Member Access</h4>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li>
                <button type="button" onClick={() => navigate("login")} className="hover:text-blue-700 cursor-pointer">
                  Sign In
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("register")} className="hover:text-blue-700 cursor-pointer">
                  Register Account
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("create-request")} className="hover:text-blue-700 cursor-pointer">
                  Create Assistance Request
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("track-request")} className="hover:text-blue-700 cursor-pointer">
                  Track Request Status
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Trust & Support</h4>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li>
                <button type="button" onClick={() => navigate("about")} className="hover:text-blue-700 cursor-pointer">
                  About Us
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("support")} className="hover:text-blue-700 cursor-pointer">
                  Feedback & Support
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("privacy")} className="hover:text-blue-700 cursor-pointer">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("contact")} className="hover:text-blue-700 cursor-pointer">
                  Contact Us
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate("setup")} className="hover:text-blue-700 cursor-pointer">
                  {supabaseConfigured ? "Database Setup & Schema" : "Connect Supabase Backend"}
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} ElderCare Connect. Community Assistance Network.</p>
          <p>Safe, verified neighborhood support for older adults.</p>
        </div>
      </div>
    </footer>
  );
}
