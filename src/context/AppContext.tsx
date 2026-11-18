import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { getSupabaseClient, getSupabaseConfig } from "../lib/supabase";
import {
  AppNotification,
  ElderlyDetails,
  Language,
  Profile,
  VolunteerDetails,
} from "../types/database";

export type PageRoute =
  | "home"
  | "about"
  | "how-it-works"
  | "services"
  | "find-assistance"
  | "become-volunteer"
  | "login"
  | "register"
  | "elderly-dashboard"
  | "volunteer-dashboard"
  | "admin-dashboard"
  | "create-request"
  | "track-request"
  | "volunteer-profile"
  | "notifications"
  | "support"
  | "privacy"
  | "contact"
  | "setup";

interface AppContextValue {
  page: PageRoute;
  selectedRequestId: string | null;
  navigate: (nextPage: PageRoute, requestId?: string | null) => void;
  supabaseConfigured: boolean;
  configSource: "env" | "project" | "none";
  schemaReady: boolean | null;
  recheckSchema: () => Promise<void>;
  refreshSupabaseConnection: () => void;
  user: User | null;
  profile: Profile | null;
  elderlyDetails: ElderlyDetails | null;
  volunteerDetails: VolunteerDetails | null;
  authLoading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  language: Language;
  setLanguage: (lang: Language) => void;
  largeText: boolean;
  toggleLargeText: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
}

const VALID_PAGES: PageRoute[] = [
  "home",
  "about",
  "how-it-works",
  "services",
  "find-assistance",
  "become-volunteer",
  "login",
  "register",
  "elderly-dashboard",
  "volunteer-dashboard",
  "admin-dashboard",
  "create-request",
  "track-request",
  "volunteer-profile",
  "notifications",
  "support",
  "privacy",
  "contact",
  "setup",
];

function parseHashRoute(): { page: PageRoute; requestId: string | null } {
  if (typeof window === "undefined") return { page: "home", requestId: null };
  const raw = window.location.hash.replace(/^#\/?/, "");
  if (!raw) return { page: "home", requestId: null };
  const [routePart, queryPart] = raw.split("?");
  const page = VALID_PAGES.includes(routePart as PageRoute) ? (routePart as PageRoute) : "home";
  const params = new URLSearchParams(queryPart || "");
  return { page, requestId: params.get("id") };
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const initial = parseHashRoute();
  const [page, setPage] = useState<PageRoute>(initial.page);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(initial.requestId);

  const [configState, setConfigState] = useState(() => getSupabaseConfig());
  const [schemaReady, setSchemaReady] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [elderlyDetails, setElderlyDetails] = useState<ElderlyDetails | null>(null);
  const [volunteerDetails, setVolunteerDetails] = useState<VolunteerDetails | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("eldercare_lang");
      if (saved === "kn" || saved === "en") return saved;
    }
    return "en";
  });

  const [largeText, setLargeText] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("eldercare_large_text") === "true";
    }
    return false;
  });

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("elder-large-text", largeText);
    }
  }, [largeText]);

  const toggleLargeText = useCallback(() => {
    setLargeText((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("eldercare_large_text", String(next));
      }
      return next;
    });
  }, []);

  const navigate = useCallback((nextPage: PageRoute, requestId: string | null = null) => {
    setPage(nextPage);
    setSelectedRequestId(requestId);
    if (typeof window !== "undefined") {
      const hash = requestId ? `#/${nextPage}?id=${encodeURIComponent(requestId)}` : `#/${nextPage}`;
      if (window.location.hash !== hash) {
        window.location.hash = hash;
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseHashRoute();
      setPage(parsed.page);
      setSelectedRequestId(parsed.requestId);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const refreshSupabaseConnection = useCallback(() => {
    setConfigState(getSupabaseConfig());
  }, []);

  const recheckSchema = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setSchemaReady(null);
      return;
    }
    const { error } = await supabase.from("assistance_categories").select("id").limit(1);
    setSchemaReady(!error);
  }, []);

  useEffect(() => {
    void recheckSchema();
  }, [recheckSchema, configState.url, configState.anonKey]);

  const loadUserDetails = useCallback(async (uid: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();

    if (prof) {
      setProfile(prof as Profile);
      if (prof.preferred_language === "kn" || prof.preferred_language === "en") {
        setLanguageState(prof.preferred_language);
      }

      if (prof.role === "elderly") {
        const { data: ed } = await supabase
          .from("elderly_details")
          .select("*")
          .eq("user_id", uid)
          .maybeSingle();
        setElderlyDetails((ed as ElderlyDetails) || null);
        setVolunteerDetails(null);
      } else if (prof.role === "volunteer") {
        const { data: vd } = await supabase
          .from("volunteer_details")
          .select("*")
          .eq("user_id", uid)
          .maybeSingle();
        setVolunteerDetails((vd as VolunteerDetails) || null);
        setElderlyDetails(null);
      } else {
        setElderlyDetails(null);
        setVolunteerDetails(null);
      }
    } else {
      setProfile(null);
      setElderlyDetails(null);
      setVolunteerDetails(null);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) {
      setNotifications([]);
      return;
    }
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(40);
    setNotifications((data as AppNotification[]) || []);
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadUserDetails(user.id);
    }
  }, [user, loadUserDetails]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setUser(null);
      setProfile(null);
      setElderlyDetails(null);
      setVolunteerDetails(null);
      setNotifications([]);
      setAuthLoading(false);
      return;
    }

    let mounted = true;
    setAuthLoading(true);

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) {
        await loadUserDetails(sessionUser.id);
      } else {
        setProfile(null);
        setElderlyDetails(null);
        setVolunteerDetails(null);
      }
      if (mounted) setAuthLoading(false);
    });

    const { data: authSub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        await loadUserDetails(nextUser.id);
      } else {
        setProfile(null);
        setElderlyDetails(null);
        setVolunteerDetails(null);
        setNotifications([]);
      }
    });

    return () => {
      mounted = false;
      authSub.subscription.unsubscribe();
    };
  }, [configState.url, configState.anonKey, loadUserDetails]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    refreshNotifications();

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refreshNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshNotifications]);

  const setLanguage = useCallback(
    async (lang: Language) => {
      setLanguageState(lang);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("eldercare_lang", lang);
      }
      const supabase = getSupabaseClient();
      if (supabase && user) {
        await supabase.from("profiles").update({ preferred_language: lang }).eq("id", user.id);
      }
    },
    [user]
  );

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setElderlyDetails(null);
    setVolunteerDetails(null);
    setNotifications([]);
    navigate("home");
  }, [navigate]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <AppContext.Provider
      value={{
        page,
        selectedRequestId,
        navigate,
        supabaseConfigured: configState.source !== "none",
        configSource: configState.source,
        schemaReady,
        recheckSchema,
        refreshSupabaseConnection,
        user,
        profile,
        elderlyDetails,
        volunteerDetails,
        authLoading,
        refreshProfile,
        signOut,
        language,
        setLanguage,
        largeText,
        toggleLargeText,
        notifications,
        unreadCount,
        refreshNotifications,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
