import { useState } from "react";
import { Menu, X } from "lucide-react";
import { PageRoute, useApp } from "../context/AppContext";
import { TRANSLATIONS } from "../lib/i18n";

export function Navbar() {
  const { page, navigate, profile, language } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = TRANSLATIONS[language];

  const dashboardRoute: PageRoute =
    profile?.role === "admin"
      ? "admin-dashboard"
      : profile?.role === "volunteer"
      ? "volunteer-dashboard"
      : "elderly-dashboard";

  const navItems: Array<{ label: string; route: PageRoute }> = [
    { label: t.navFindAssistance, route: "find-assistance" },
    { label: t.navVolunteer, route: "become-volunteer" },
    { label: t.navHowItWorks, route: "how-it-works" },
    { label: t.navServices, route: "services" },
    { label: t.navAbout, route: "about" },
  ];

  const handleNav = (route: PageRoute) => {
    setMobileMenuOpen(false);
    navigate(route);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single clean wordmark */}
        <button
          type="button"
          onClick={() => handleNav("home")}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer hover:text-blue-700 transition-colors"
        >
          {t.brand}
        </button>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              key={item.route}
              type="button"
              onClick={() => handleNav(item.route)}
              className={`whitespace-nowrap shrink-0 cursor-pointer py-1 border-b-2 transition-colors ${
                page === item.route
                  ? "text-blue-700 border-blue-700 font-semibold"
                  : "border-transparent hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1 primary action + mobile drawer trigger */}
        <div className="flex items-center gap-3 shrink-0">
          {profile ? (
            <button
              type="button"
              onClick={() => handleNav(dashboardRoute)}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.dashboard}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleNav("login")}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.signIn}
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.route}
              type="button"
              onClick={() => handleNav(item.route)}
              className={`block w-full text-left px-3 py-2.5 rounded-lg text-base font-medium cursor-pointer ${
                page === item.route ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            {profile ? (
              <>
                <button
                  type="button"
                  onClick={() => handleNav("notifications")}
                  className="block w-full text-left px-3 py-2.5 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {t.notifications}
                </button>
                <button
                  type="button"
                  onClick={() => handleNav("create-request")}
                  className="block w-full text-left px-3 py-2.5 rounded-lg text-base font-medium text-blue-700 hover:bg-blue-50 cursor-pointer"
                >
                  {t.createRequest}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleNav("register")}
                className="block w-full text-left px-3 py-2.5 rounded-lg text-base font-medium text-blue-700 hover:bg-blue-50 cursor-pointer"
              >
                Create Account
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
