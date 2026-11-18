import { useEffect, useMemo, useState } from "react";
import { Search, Star, MapPin, Clock, ShieldCheck } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getSupabaseClient } from "../lib/supabase";
import { ASSISTANCE_CATEGORIES, PublicVolunteer } from "../types/database";

export function FindAssistancePage() {
  const { navigate, supabaseConfigured, profile } = useApp();
  const [volunteers, setVolunteers] = useState<PublicVolunteer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: rpcError } = await supabase.rpc("get_public_verified_volunteers");
        if (cancelled) return;
        if (rpcError) {
          setError(rpcError.message);
        } else {
          setVolunteers((data as PublicVolunteer[]) || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabaseConfigured]);

  const filtered = useMemo(() => {
    return volunteers.filter((v) => {
      const matchesCat =
        categoryFilter === "all" || v.categories.includes(categoryFilter) || v.skills.includes(categoryFilter);
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        v.full_name.toLowerCase().includes(q) ||
        v.service_area.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q) ||
        v.skills.some((s) => s.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [volunteers, searchTerm, categoryFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900">Find Community Assistance</h1>
          <p className="mt-2 text-base text-slate-600 max-w-2xl">
            Browse administrator-verified volunteers by neighborhood and skill, or submit an assistance request to
            automatically notify nearby helpers.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(profile ? "create-request" : "register")}
          className="px-5 py-3 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer whitespace-nowrap shrink-0"
        >
          Submit Assistance Request
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by neighborhood, city, skill, or volunteer name..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
          />
        </div>
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:border-blue-600 focus:outline-none"
            aria-label="Filter by assistance category"
          >
            <option value="all">All Assistance Categories</option>
            {ASSISTANCE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!supabaseConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm text-amber-900">
            Connect your Supabase project to search live verified volunteers in your community.
          </p>
          <button
            type="button"
            onClick={() => navigate("setup")}
            className="px-4 py-2 text-xs font-semibold text-amber-950 bg-amber-200 rounded-lg cursor-pointer shrink-0"
          >
            Open Setup
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 h-48 animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((v) => (
            <article key={v.user_id} className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-slate-900">{v.full_name}</h2>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {v.service_area}
                      {v.city ? `, ${v.city}` : ""}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800">
                    <ShieldCheck className="w-4 h-4" />
                    Verified
                  </span>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">
                  {v.bio || "Trusted community volunteer available for neighborhood support."}
                </p>

                <div className="text-xs text-slate-600 space-y-1">
                  <p>
                    <strong className="text-slate-800">Categories:</strong>{" "}
                    {v.categories.length > 0 ? v.categories.join(" · ") : "General Support"}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{v.availability || "Flexible schedule"}</span>
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums text-slate-700">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  {v.rating > 0 ? `${v.rating} (${v.review_count} reviews)` : "New Volunteer"}
                </span>
                <button
                  type="button"
                  onClick={() => navigate(profile ? "create-request" : "register")}
                  className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                >
                  Request Help →
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <p className="font-display text-lg font-semibold text-slate-900">No matching verified volunteers found</p>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Try clearing your search filters, or submit an assistance request so newly verified volunteers in your
            neighborhood can respond.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate(profile ? "create-request" : "register")}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer"
            >
              Create Assistance Request
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
