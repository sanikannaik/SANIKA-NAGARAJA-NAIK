/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Database } from "lucide-react";
import { AppProvider, useApp } from "./context/AppContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { ElderCareAIAssistant } from "./components/ElderCareAIAssistant";
import { HomePage } from "./pages/HomePage";
import {
  AboutPage,
  BecomeVolunteerPage,
  HowItWorksPage,
  PrivacyPolicyPage,
  ServicesPage,
} from "./pages/InfoPages";
import { FindAssistancePage } from "./pages/FindAssistancePage";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import { ElderlyDashboardPage } from "./pages/ElderlyDashboardPage";
import { VolunteerDashboardPage } from "./pages/VolunteerDashboardPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { CreateRequestPage } from "./pages/CreateRequestPage";
import { RequestTrackingPage } from "./pages/RequestTrackingPage";
import { VolunteerProfilePage } from "./pages/VolunteerProfilePage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ContactPage, SupportPage } from "./pages/SupportAndContactPages";
import { SetupPage } from "./pages/SetupPage";

function SchemaBanner() {
  const { page, schemaReady, navigate } = useApp();
  if (schemaReady !== false || page === "setup") return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm text-amber-950">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            Connected to Supabase (<span className="font-mono">pxeerwxhudgegodrarqr</span>), but database tables are
            not created yet. Run <span className="font-mono">supabase/schema.sql</span> once in your SQL Editor to
            save bookings.
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate("setup")}
          className="px-3 py-1 text-xs font-semibold bg-amber-200/80 hover:bg-amber-200 text-amber-950 rounded-md cursor-pointer whitespace-nowrap shrink-0 w-fit"
        >
          Open SQL Setup →
        </button>
      </div>
    </div>
  );
}

function PageRouter() {
  const { page, authLoading } = useApp();

  if (authLoading && ["elderly-dashboard", "volunteer-dashboard", "admin-dashboard"].includes(page)) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="bg-white border border-slate-200 rounded-xl p-8 h-48 animate-pulse" />
      </div>
    );
  }

  switch (page) {
    case "home":
      return <HomePage />;
    case "about":
      return <AboutPage />;
    case "how-it-works":
      return <HowItWorksPage />;
    case "services":
      return <ServicesPage />;
    case "find-assistance":
      return <FindAssistancePage />;
    case "become-volunteer":
      return <BecomeVolunteerPage />;
    case "login":
      return <LoginPage />;
    case "register":
      return <RegisterPage />;
    case "elderly-dashboard":
      return <ElderlyDashboardPage />;
    case "volunteer-dashboard":
      return <VolunteerDashboardPage />;
    case "admin-dashboard":
      return <AdminDashboardPage />;
    case "create-request":
      return <CreateRequestPage />;
    case "track-request":
      return <RequestTrackingPage />;
    case "volunteer-profile":
      return <VolunteerProfilePage />;
    case "notifications":
      return <NotificationsPage />;
    case "support":
      return <SupportPage />;
    case "privacy":
      return <PrivacyPolicyPage />;
    case "contact":
      return <ContactPage />;
    case "setup":
      return <SetupPage />;
    default:
      return <HomePage />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen flex flex-col bg-[#F7F9FB] text-slate-900">
        <Navbar />
        <SchemaBanner />
        <div className="flex-1">
          <PageRouter />
        </div>
        <Footer />
        <ElderCareAIAssistant />
      </div>
    </AppProvider>
  );
}
