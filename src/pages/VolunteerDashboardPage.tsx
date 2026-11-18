import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldAlert, CheckCircle2, MapPin, Sparkles, Clock, Star, ArrowRight } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getSupabaseClient } from "../lib/supabase";
import { AssistanceRequest, ReviewItem } from "../types/database";
import { DashboardShell } from "../components/DashboardShell";

export function VolunteerDashboardPage() {
  const { user, profile, volunteerDetails, navigate, language } = useApp();
  const [openRequests, setOpenRequests] = useState<AssistanceRequest[]>([]);
  const [myTasks, setMyTasks] = useState<AssistanceRequest[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [aiSummaries, setAiSummaries] = useState<Record<string, string>>({});
  const [loadingAiId, setLoadingAiId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const loadVolunteerData = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [assignedRes, openRes, revRes] = await Promise.all([
        supabase
          .from("assistance_requests")
          .select("*")
          .eq("assigned_volunteer_id", user.id)
          .order("updated_at", { ascending: false }),
        supabase
          .from("assistance_requests")
          .select("*")
          .is("assigned_volunteer_id", null)
          .in("status", ["REQUEST SUBMITTED", "WAITING FOR VOLUNTEER"])
          .order("created_at", { ascending: false }),
        supabase
          .from("reviews")
          .select("*")
          .eq("volunteer_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (assignedRes.error) throw assignedRes.error;
      setMyTasks((assignedRes.data as AssistanceRequest[]) || []);
      setOpenRequests((openRes.data as AssistanceRequest[]) || []);
      setReviews((revRes.data as ReviewItem[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load volunteer workspace.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadVolunteerData();
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;

    const channel = supabase
      .channel(`volunteer-requests-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assistance_requests" },
        () => {
          loadVolunteerData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadVolunteerData]);

  // Relevance scoring for Volunteer Matching System
  const matchedOpenRequests = useMemo(() => {
    const areaTokens = `${volunteerDetails?.service_area || ""} ${volunteerDetails?.city || ""}`
      .toLowerCase()
      .split(/[\s,]+/)
      .filter((t) => t.length > 2);
    const volCats = volunteerDetails?.categories || [];
    const volSkills = (volunteerDetails?.skills || []).map((s) => s.toLowerCase());

    return openRequests
      .filter((r) => !dismissedIds.includes(r.id))
      .map((req) => {
        let score = 0;
        const locLower = req.location.toLowerCase();
        if (areaTokens.some((tok) => locLower.includes(tok))) score += 40;
        if (volCats.includes(req.category)) score += 30;
        if (volSkills.some((sk) => req.description.toLowerCase().includes(sk))) score += 15;
        if (req.urgency === "urgent") score += 20;
        else if (req.urgency === "high") score += 10;
        return { req, score };
      })
      .sort((a, b) => b.score - a.score);
  }, [openRequests, volunteerDetails, dismissedIds]);

  const handleAccept = async (requestId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase || busyId) return;
    setBusyId(requestId);
    setError(null);
    setFeedbackMsg(null);
    try {
      const { error: rpcErr } = await supabase.rpc("accept_assistance_request", {
        p_request_id: requestId,
      });
      if (rpcErr) throw rpcErr;
      setFeedbackMsg("Request accepted! You can now view private address details and message the elder.");
      await loadVolunteerData();
      navigate("track-request", requestId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept request.");
    } finally {
      setBusyId(null);
    }
  };

  const handleUpdateProgress = async (
    requestId: string,
    newStatus: "ASSISTANCE IN PROGRESS" | "TASK COMPLETED"
  ) => {
    const supabase = getSupabaseClient();
    if (!supabase || busyId) return;
    setBusyId(requestId);
    setError(null);
    try {
      const { error: rpcErr } = await supabase.rpc("update_request_status", {
        p_request_id: requestId,
        p_new_status: newStatus,
        p_note:
          newStatus === "ASSISTANCE IN PROGRESS"
            ? "Volunteer started assistance"
            : "Volunteer marked task completed",
      });
      if (rpcErr) throw rpcErr;
      setFeedbackMsg(`Task updated to ${newStatus}.`);
      await loadVolunteerData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task progress.");
    } finally {
      setBusyId(null);
    }
  };

  const handleAiSummarize = async (req: AssistanceRequest) => {
    setLoadingAiId(req.id);
    try {
      const res = await fetch("/api/ai/simplify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `${req.title}. Category: ${req.category}. Description: ${req.description}. Instructions: ${req.additional_instructions || "None"}`,
          audience: "volunteer",
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to summarize request.");
      setAiSummaries((prev) => ({ ...prev, [req.id]: data.summary }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI briefing failed.");
    } finally {
      setLoadingAiId(null);
    }
  };

  if (!user || !profile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-slate-900">Volunteer Sign In Required</h1>
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

  const verificationStatus = volunteerDetails?.verification_status ?? "pending";
  const activeTasks = myTasks.filter((t) =>
    ["VOLUNTEER ACCEPTED", "ASSISTANCE IN PROGRESS"].includes(t.status)
  );
  const completedTasks = myTasks.filter((t) =>
    ["TASK COMPLETED", "ELDERLY USER CONFIRMATION", "FEEDBACK AND RATING"].includes(t.status)
  );

  return (
    <DashboardShell
      title="Volunteer Workspace"
      subtitle="Accept nearby requests, update task progress, and review your community feedback."
    >
      {/* Verification Status Banner */}
      {verificationStatus !== "approved" && (
        <div
          className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            verificationStatus === "rejected"
              ? "bg-red-50 border-red-200 text-red-900"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold">
                {verificationStatus === "rejected"
                  ? "Verification Requires Attention"
                  : "Identity Verification Pending Administrator Review"}
              </p>
              <p>
                {verificationStatus === "rejected"
                  ? volunteerDetails?.verification_notes ||
                    "Please upload a clear government ID document to complete verification."
                  : "For elderly safety, only approved volunteers can view and accept neighborhood requests."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("volunteer-profile")}
            className="px-4 py-2 text-xs font-semibold bg-white border border-slate-300 text-slate-900 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
          >
            Update Profile & ID
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
      )}
      {feedbackMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
          {feedbackMsg}
        </div>
      )}

      {/* Volunteer KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Verification</p>
          <p className="mt-1 font-display text-lg font-semibold capitalize text-slate-900">
            {verificationStatus}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Active Assigned</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-blue-700">
            {activeTasks.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Completed Assists</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-emerald-700">
            {completedTasks.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Member Rating</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {volunteerDetails?.rating ? `${volunteerDetails.rating} ★` : "—"}
          </p>
        </div>
      </div>

      {/* Assigned Tasks */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-slate-900">My Assigned Tasks</h2>
        {activeTasks.length > 0 ? (
          <div className="space-y-4">
            {activeTasks.map((task) => (
              <div key={task.id} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-slate-800">{task.request_code}</span>
                      <span aria-hidden="true">·</span>
                      <span>{task.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-blue-700">{task.status}</span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-slate-900 mt-1">{task.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("track-request", task.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer shrink-0"
                  >
                    Address, Chat & Details <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-sm text-slate-700">{task.simplified_description || task.description}</p>

                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
                  {task.status === "VOLUNTEER ACCEPTED" && (
                    <button
                      type="button"
                      disabled={busyId === task.id}
                      onClick={() => handleUpdateProgress(task.id, "ASSISTANCE IN PROGRESS")}
                      className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer"
                    >
                      Mark In Progress / Arrived
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyId === task.id}
                    onClick={() => handleUpdateProgress(task.id, "TASK COMPLETED")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Mark Completed
                  </button>
                  <button
                    type="button"
                    disabled={loadingAiId === task.id}
                    onClick={() => handleAiSummarize(task)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                    {loadingAiId === task.id ? "Summarizing..." : "AI Volunteer Briefing"}
                  </button>
                </div>

                {aiSummaries[task.id] && (
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {aiSummaries[task.id]}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-600">
            You have no active assigned tasks right now. Browse matched nearby requests below.
          </div>
        )}
      </section>

      {/* Matched Open Requests */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900">
            Matched Nearby Requests
          </h2>
          <p className="text-sm text-slate-600">
            Sorted by proximity to your service area ({volunteerDetails?.service_area || "Any"}), category match, and
            urgency.
          </p>
        </div>

        {verificationStatus !== "approved" ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-600">
            Open requests will unlock automatically once an administrator approves your identity verification.
          </div>
        ) : loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 h-32 animate-pulse" />
        ) : matchedOpenRequests.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {matchedOpenRequests.map(({ req, score }) => (
              <div key={req.id} className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-semibold text-slate-800">{req.request_code}</span>
                    <span aria-hidden="true">·</span>
                    <span>{req.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">Urgency: {req.urgency}</span>
                    {score >= 40 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-700 font-semibold">Strong Neighborhood Match</span>
                      </>
                    )}
                  </div>
                  <span className="text-xs font-mono tabular-nums text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {req.preferred_date} · {req.preferred_time}
                  </span>
                </div>

                <h3 className="font-display text-lg font-semibold text-slate-900">{req.title}</h3>
                <p className="text-sm text-slate-700">{req.simplified_description || req.description}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {req.location} (exact street address shared after acceptance)
                </p>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={busyId === req.id}
                    onClick={() => handleAccept(req.id)}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-60 cursor-pointer"
                  >
                    {busyId === req.id ? "Accepting..." : "Accept Request"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissedIds((prev) => [...prev, req.id])}
                    className="px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    Pass / Hide
                  </button>
                  <button
                    type="button"
                    disabled={loadingAiId === req.id}
                    onClick={() => handleAiSummarize(req)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium text-slate-700 hover:text-blue-700 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {loadingAiId === req.id ? "Summarizing..." : "AI Summary"}
                  </button>
                </div>

                {aiSummaries[req.id] && (
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap">
                    {aiSummaries[req.id]}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-600">
            There are currently no unassigned requests waiting in the pool. Check back soon!
          </div>
        )}
      </section>

      {/* Reviews & Volunteering History */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-slate-900">Volunteering History</h2>
          {completedTasks.length > 0 ? (
            <ul className="divide-y divide-slate-100 text-sm">
              {completedTasks.map((t) => (
                <li key={t.id} className="py-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{t.title}</p>
                    <p className="text-xs text-slate-500 font-mono">
                      {t.request_code} · {t.preferred_date}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("track-request", t.id)}
                    className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                  >
                    {t.status}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Completed assistance tasks will appear here.</p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-slate-900">Ratings & Feedback Received</h2>
          {reviews.length > 0 ? (
            <ul className="divide-y divide-slate-100 text-sm">
              {reviews.map((rev) => (
                <li key={rev.id} className="py-3 space-y-1">
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="w-4 h-4 fill-amber-500" />
                    <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                      {rev.rating} / 5
                    </span>
                  </div>
                  <p className="text-slate-700">{rev.feedback || "No written comment."}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No ratings submitted yet.</p>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
