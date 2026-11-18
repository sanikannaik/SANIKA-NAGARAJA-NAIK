import { useCallback, useEffect, useState } from "react";
import { PlusCircle, MapPin, Clock, Star, CheckCircle2, ArrowRight, UserCheck } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getSupabaseClient } from "../lib/supabase";
import { AssistanceRequest, PublicVolunteer } from "../types/database";
import { STATUS_LABELS_KN } from "../lib/i18n";
import { DashboardShell } from "../components/DashboardShell";

export function ElderlyDashboardPage() {
  const { user, profile, elderlyDetails, refreshProfile, navigate, language } = useApp();
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [matchedVolunteers, setMatchedVolunteers] = useState<PublicVolunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline details form if elderly_details row is missing (e.g., after email verification)
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  const loadDashboard = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [reqRes, volRes] = await Promise.all([
        supabase
          .from("assistance_requests")
          .select("*")
          .eq("elderly_user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.rpc("get_public_verified_volunteers"),
      ]);

      if (reqRes.error) throw reqRes.error;
      setRequests((reqRes.data as AssistanceRequest[]) || []);

      if (Array.isArray(volRes.data)) {
        const allVols = volRes.data as PublicVolunteer[];
        const userCity = elderlyDetails?.city?.toLowerCase() || "";
        const sorted = [...allVols].sort((a, b) => {
          const aMatch = userCity && (a.city.toLowerCase().includes(userCity) || a.service_area.toLowerCase().includes(userCity)) ? 1 : 0;
          const bMatch = userCity && (b.city.toLowerCase().includes(userCity) || b.service_area.toLowerCase().includes(userCity)) ? 1 : 0;
          if (bMatch !== aMatch) return bMatch - aMatch;
          return b.rating - a.rating;
        });
        setMatchedVolunteers(sorted.slice(0, 4));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [user, elderlyDetails]);

  useEffect(() => {
    loadDashboard();
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;

    const channel = supabase
      .channel(`elderly-requests-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assistance_requests",
          filter: `elderly_user_id=eq.${user.id}`,
        },
        () => {
          loadDashboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadDashboard]);

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    setSavingDetails(true);
    setError(null);
    try {
      const { error: upErr } = await supabase.from("elderly_details").upsert({
        user_id: user.id,
        address: address.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        emergency_contact: emergencyContact.trim(),
      });
      if (upErr) throw upErr;
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your details.");
    } finally {
      setSavingDetails(false);
    }
  };

  const handleConfirmCompletion = async (requestId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error: rpcErr } = await supabase.rpc("update_request_status", {
      p_request_id: requestId,
      p_new_status: "ELDERLY USER CONFIRMATION",
      p_note: "Elderly member confirmed task completion",
    });
    if (rpcErr) {
      setError(rpcErr.message);
    } else {
      loadDashboard();
      navigate("track-request", requestId);
    }
  };

  if (!user || !profile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-slate-900">Please Sign In</h1>
        <p className="text-sm text-slate-600">Sign in to view your Elderly Assistance Dashboard.</p>
        <button
          type="button"
          onClick={() => navigate("login")}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg cursor-pointer"
        >
          Sign In
        </button>
      </div>
    );
  }

  const activeRequests = requests.filter(
    (r) => !["FEEDBACK AND RATING", "CANCELLED"].includes(r.status)
  );
  const pastRequests = requests.filter((r) =>
    ["FEEDBACK AND RATING", "CANCELLED"].includes(r.status)
  );

  return (
    <DashboardShell
      title={`Welcome, ${profile.full_name}`}
      subtitle="Simple, large-print dashboard to request help and follow volunteer updates."
    >
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
      )}

      {!elderlyDetails && (
        <form
          onSubmit={handleSaveDetails}
          className="bg-blue-50 border border-blue-200 rounded-xl p-6 space-y-4"
        >
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Complete Your Home & Emergency Contact Details
          </h2>
          <p className="text-sm text-slate-700">
            This information stays private and is shared only with a verified volunteer once you are matched.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Residential Address *"
              className="px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              required
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="Emergency Contact Name & Phone *"
              className="px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City / Neighborhood *"
              className="px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              required
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              placeholder="Pincode *"
              className="px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <button
            type="submit"
            disabled={savingDetails}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer"
          >
            {savingDetails ? "Saving..." : "Save Private Details"}
          </button>
        </form>
      )}

      {/* Large accessible primary action card */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <h2 className="font-display text-xl font-bold text-slate-900">Need Everyday Assistance?</h2>
          <p className="text-base text-slate-600">
            Request groceries, medicine pickup, hospital visit help, bill payment, or friendly company.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("create-request")}
          className="inline-flex items-center justify-center gap-2.5 px-6 py-4 text-base font-semibold text-white bg-blue-700 rounded-xl hover:bg-blue-800 transition-colors shrink-0 cursor-pointer"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Request Assistance</span>
        </button>
      </section>

      {/* Active Requests */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-slate-900">
          Active Requests (<span className="font-mono tabular-nums">{activeRequests.length}</span>)
        </h2>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 h-32 animate-pulse" />
        ) : activeRequests.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {activeRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-semibold text-slate-800">{req.request_code}</span>
                    <span aria-hidden="true">·</span>
                    <span>{req.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {req.preferred_date} at {req.preferred_time}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-slate-900">{req.title}</h3>
                  <p className="text-sm text-slate-700">
                    Current Status:{" "}
                    <strong className="text-blue-800">
                      {language === "kn" ? STATUS_LABELS_KN[req.status] || req.status : req.status}
                    </strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  {req.status === "TASK COMPLETED" && (
                    <button
                      type="button"
                      onClick={() => handleConfirmCompletion(req.id)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm Completion
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate("track-request", req.id)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer"
                  >
                    <span>Track & Message</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
            <p className="font-display text-base font-semibold text-slate-900">No active assistance requests</p>
            <p className="text-sm text-slate-600">
              When you submit a request, live volunteer matching and progress updates will appear right here.
            </p>
          </div>
        )}
      </section>

      {/* Nearby Verified Volunteers */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-slate-900">Verified Volunteers Near You</h2>
          <button
            type="button"
            onClick={() => navigate("find-assistance")}
            className="text-sm font-semibold text-blue-700 hover:underline cursor-pointer"
          >
            View All
          </button>
        </div>

        {matchedVolunteers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matchedVolunteers.map((v) => (
              <div key={v.user_id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-700" />
                    {v.full_name}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums text-slate-700">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    {v.rating > 0 ? v.rating : "New"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {v.service_area} {v.city ? `· ${v.city}` : ""}
                </p>
                <p className="text-xs text-slate-600 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {v.availability}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-600">
            Verified volunteers in your neighborhood will be listed here once approved by an administrator.
          </div>
        )}
      </section>

      {/* Previous Assistance History */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-slate-900">
          Previous Assistance History (<span className="font-mono tabular-nums">{pastRequests.length}</span>)
        </h2>
        {pastRequests.length > 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Request ID</th>
                    <th className="py-3 px-4 font-semibold">Title</th>
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold">Date</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pastRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-xs text-slate-700">{req.request_code}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{req.title}</td>
                      <td className="py-3 px-4 text-slate-600">{req.category}</td>
                      <td className="py-3 px-4 font-mono text-xs tabular-nums text-slate-600">
                        {req.preferred_date}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-700">{req.status}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => navigate("track-request", req.id)}
                          className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-600">
            Completed or past assistance requests will appear here for your records.
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
