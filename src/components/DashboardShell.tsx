import React from "react";
import {
  LayoutDashboard,
  PlusCircle,
  MapPin,
  Bell,
  UserCheck,
  ShieldAlert,
  LifeBuoy,
  LogOut,
  Globe,
  Type,
  Database,
} from "lucide-react";
import { PageRoute, useApp } from "../context/AppContext";
import { TRANSLATIONS } from "../lib/i18n";

interface DashboardShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function DashboardShell({ title, subtitle, children }: DashboardShellProps) {
  const {
    page,
    navigate,
    profile,
    volunteerDetails,
    unreadCount,
    signOut,
    language,
    setLanguage,
    largeText,
    toggleLargeText,
    supabaseConfigured,
  } = useApp();
  const t = TRANSLATIONS[language];

  const role = profile?.role ?? "elderly";

  const links: Array<{ label: string; route: PageRoute; icon: React.ReactNode; badge?: number }> = [];

  if (role === "elderly") {
    links.push(
      { label: "Overview", route: "elderly-dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: t.createRequest, route: "create-request", icon: <PlusCircle className="w-4 h-4" /> },
      { label: t.trackRequests, route: "track-request", icon: <MapPin className="w-4 h-4" /> },
      { label: "Find Volunteers", route: "find-assistance", icon: <UserCheck className="w-4 h-4" /> }
    );
  } else if (role === "volunteer") {
    links.push(
      { label: "Volunteer Desk", route: "volunteer-dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: t.trackRequests, route: "track-request", icon: <MapPin className="w-4 h-4" /> },
      { label: "My Profile & ID", route: "volunteer-profile", icon: <UserCheck className="w-4 h-4" /> }
    );
  } else if (role === "admin") {
    links.push(
      { label: "Admin Console", route: "admin-dashboard", icon: <ShieldAlert className="w-4 h-4" /> },
      { label: t.trackRequests, route: "track-request", icon: <MapPin className="w-4 h-4" /> }
    );
  }

  links.push(
    {
      label: t.notifications,
      route: "notifications",
      icon: <Bell className="w-4 h-4" />,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { label: "Support & Help", route: "support", icon: <LifeBuoy className="w-4 h-4" /> }
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {!supabaseConfigured && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900">
              Supabase is not connected yet. Connect your project URL and Anon Key to persist accounts and requests.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("setup")}
            className="px-4 py-2 text-xs font-semibold text-amber-950 bg-amber-200/80 hover:bg-amber-200 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
          >
            Configure Supabase
          </button>
        </div>
      )}

      {profile?.is_suspended && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-900">
          Your account has been suspended by an administrator. Please contact Support if you believe this is an error.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 items-start">
        {/* Sidebar */}
        <aside className="bg-white border border-slate-200 rounded-xl p-4 space-y-6">
          {profile && (
            <div className="pb-4 border-b border-slate-200">
              <p className="text-xs text-slate-500 font-medium capitalize">
                {profile.role} account
                {profile.role === "volunteer" && volunteerDetails
                  ? ` · ${volunteerDetails.verification_status}`
                  : ""}
              </p>
              <p className="mt-1 font-display text-base font-semibold text-slate-900 truncate">
                {profile.full_name}
              </p>
              <p className="text-xs text-slate-500 truncate">{profile.email}</p>
            </div>
          )}

          <nav className="space-y-1" aria-label="Workspace navigation">
            {links.map((item) => {
              const active = page === item.route;
              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => navigate(item.route)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? "bg-blue-50 text-blue-800 font-semibold"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span className="font-mono text-xs tabular-nums text-blue-700 font-semibold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-slate-200 space-y-2">
            <button
              type="button"
              onClick={() => setLanguage(language === "en" ? "kn" : "en")}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Globe className="w-4 h-4 text-blue-700" />
              <span>{language === "en" ? "Switch to ಕನ್ನಡ" : "Switch to English"}</span>
            </button>
            <button
              type="button"
              onClick={toggleLargeText}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Type className="w-4 h-4 text-blue-700" />
              <span>{largeText ? t.standardText : t.largeText}</span>
            </button>
            {profile && (
              <button
                type="button"
                onClick={signOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-700 hover:bg-red-50 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </aside>

        {/* Main Viewport */}
        <main className="min-w-0 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
            </div>
            {role === "elderly" && page !== "create-request" && (
              <button
                type="button"
                onClick={() => navigate("create-request")}
                className="px-5 py-3 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                + {t.createRequest}
              </button>
            )}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
