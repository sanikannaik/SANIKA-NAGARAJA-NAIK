import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Send,
  Star,
  Flag,
  Phone,
  MapPin,
  ShieldCheck,
  Clock,
  FileText,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { getSupabaseClient } from "../lib/supabase";
import {
  AssistanceRequest,
  REQUEST_WORKFLOW_STEPS,
  RequestMessage,
  RequestStatusHistoryItem,
} from "../types/database";
import { STATUS_LABELS_KN } from "../lib/i18n";
import { DashboardShell } from "../components/DashboardShell";

interface ParticipantContacts {
  elderly?: {
    full_name: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    pincode: string | null;
    emergency_contact: string | null;
    additional_requirements: string | null;
  };
  volunteer?: {
    full_name: string;
    phone: string | null;
    service_area: string | null;
    rating: number;
    review_count: number;
    verification_status: string;
  } | null;
}

export function RequestTrackingPage() {
  const { user, profile, selectedRequestId, navigate, language } = useApp();
  const [myRequests, setMyRequests] = useState<AssistanceRequest[]>([]);
  const [activeReqId, setActiveReqId] = useState<string | null>(selectedRequestId);
  const [activeReq, setActiveReq] = useState<AssistanceRequest | null>(null);
  const [history, setHistory] = useState<RequestStatusHistoryItem[]>([]);
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [contacts, setContacts] = useState<ParticipantContacts | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);

  const [newMessage, setNewMessage] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  // Review state
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Report state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("Inappropriate Behaviour");
  const [reportDesc, setReportDesc] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (selectedRequestId) setActiveReqId(selectedRequestId);
  }, [selectedRequestId]);

  const loadList = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    const { data } = await supabase
      .from("assistance_requests")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(30);
    const list = (data as AssistanceRequest[]) || [];
    setMyRequests(list);
    if (!activeReqId && list.length > 0) {
      setActiveReqId(list[0].id);
    }
  }, [user, activeReqId]);

  const loadRequestDetail = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !user || !activeReqId) return;

    setError(null);
    const [reqRes, histRes, msgRes, revRes] = await Promise.all([
      supabase.from("assistance_requests").select("*").eq("id", activeReqId).maybeSingle(),
      supabase
        .from("request_status_history")
        .select("*")
        .eq("request_id", activeReqId)
        .order("created_at", { ascending: true }),
      supabase
        .from("request_messages")
        .select("*")
        .eq("request_id", activeReqId)
        .order("created_at", { ascending: true }),
      supabase.from("reviews").select("id").eq("request_id", activeReqId).maybeSingle(),
    ]);

    if (reqRes.error) {
      setError(reqRes.error.message);
      return;
    }

    const reqData = reqRes.data as AssistanceRequest | null;
    setActiveReq(reqData);
    setHistory((histRes.data as RequestStatusHistoryItem[]) || []);
    setMessages((msgRes.data as RequestMessage[]) || []);
    setReviewSubmitted(Boolean(revRes.data));

    if (reqData) {
      const { data: contactData } = await supabase.rpc("get_request_participant_contacts", {
        p_request_id: reqData.id,
      });
      setContacts((contactData as ParticipantContacts) || null);

      if (reqData.attachment_path) {
        const { data: signed } = await supabase.storage
          .from("request-attachments")
          .createSignedUrl(reqData.attachment_path, 3600);
        setAttachmentUrl(signed?.signedUrl || null);
      } else {
        setAttachmentUrl(null);
      }
    }
  }, [user, activeReqId]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadRequestDetail();
    const supabase = getSupabaseClient();
    if (!supabase || !activeReqId) return;

    const channel = supabase
      .channel(`request-track-${activeReqId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assistance_requests",
          filter: `id=eq.${activeReqId}`,
        },
        () => loadRequestDetail()
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "request_status_history",
          filter: `request_id=eq.${activeReqId}`,
        },
        () => loadRequestDetail()
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "request_messages",
          filter: `request_id=eq.${activeReqId}`,
        },
        () => loadRequestDetail()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeReqId, loadRequestDetail]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase || !user || !activeReq || !newMessage.trim() || sendingMsg) return;

    setSendingMsg(true);
    try {
      const { error: msgErr } = await supabase.from("request_messages").insert({
        request_id: activeReq.id,
        sender_id: user.id,
        message: newMessage.trim(),
      });
      if (msgErr) throw msgErr;
      setNewMessage("");
      await loadRequestDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSendingMsg(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    const supabase = getSupabaseClient();
    if (!supabase || !activeReq) return;
    setError(null);
    const { error: rpcErr } = await supabase.rpc("update_request_status", {
      p_request_id: activeReq.id,
      p_new_status: newStatus,
      p_note: `Updated to ${newStatus}`,
    });
    if (rpcErr) setError(rpcErr.message);
    else {
      setNotice(`Request status updated to ${newStatus}.`);
      await loadRequestDetail();
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase || !user || !activeReq || !activeReq.assigned_volunteer_id || submittingReview) return;

    setSubmittingReview(true);
    setError(null);
    try {
      const { error: revErr } = await supabase.from("reviews").insert({
        request_id: activeReq.id,
        elderly_user_id: user.id,
        volunteer_id: activeReq.assigned_volunteer_id,
        rating,
        feedback: feedback.trim(),
      });
      if (revErr) throw revErr;
      setReviewSubmitted(true);
      setNotice("Thank you! Your feedback and rating have been recorded.");
      await loadRequestDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase || !user || !activeReq || submittingReport) return;

    setSubmittingReport(true);
    setError(null);
    try {
      const reportedUserId =
        user.id === activeReq.elderly_user_id ? activeReq.assigned_volunteer_id : activeReq.elderly_user_id;

      const { error: repErr } = await supabase.from("reports").insert({
        reported_by: user.id,
        reported_user_id: reportedUserId,
        request_id: activeReq.id,
        reason: reportReason,
        description: reportDesc.trim(),
      });
      if (repErr) throw repErr;
      setShowReportModal(false);
      setReportDesc("");
      setNotice("Incident report submitted. An administrator will review it promptly.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit incident report.");
    } finally {
      setSubmittingReport(false);
    }
  };

  if (!user || !profile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-slate-900">Sign In to Track Requests</h1>
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

  const currentStepIndex = activeReq ? REQUEST_WORKFLOW_STEPS.indexOf(activeReq.status) : -1;
  const isOwner = activeReq?.elderly_user_id === user.id;
  const isAssignedVol = activeReq?.assigned_volunteer_id === user.id;

  return (
    <DashboardShell
      title="Live Request Tracking"
      subtitle="Real-time status workflow, protected messaging, completion confirmation, and feedback."
    >
      {myRequests.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-medium text-slate-700 shrink-0">Select Request:</label>
          <select
            value={activeReqId || ""}
            onChange={(e) => setActiveReqId(e.target.value)}
            className="flex-1 px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          >
            {myRequests.map((r) => (
              <option key={r.id} value={r.id}>
                {r.request_code} — {r.title} ({r.status})
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
      )}
      {notice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
          {notice}
        </div>
      )}

      {!activeReq ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <p className="font-display text-lg font-semibold text-slate-900">No request selected</p>
          <p className="text-sm text-slate-600">
            Create an assistance request or accept a neighborhood request to track its progress live.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Request Summary + Actions */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono font-semibold text-slate-900">{activeReq.request_code}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeReq.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {activeReq.preferred_date} at {activeReq.preferred_time}
                  </span>
                </div>
                <h2 className="font-display text-2xl font-bold text-slate-900">{activeReq.title}</h2>
                <p className="text-sm text-slate-700 leading-relaxed">{activeReq.description}</p>
                {activeReq.additional_instructions && (
                  <p className="text-xs text-slate-600">
                    <strong>Instructions:</strong> {activeReq.additional_instructions}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 shrink-0">
                {isAssignedVol && activeReq.status === "VOLUNTEER ACCEPTED" && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("ASSISTANCE IN PROGRESS")}
                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer"
                  >
                    Start Assistance
                  </button>
                )}
                {isAssignedVol &&
                  ["VOLUNTEER ACCEPTED", "ASSISTANCE IN PROGRESS"].includes(activeReq.status) && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange("TASK COMPLETED")}
                      className="px-4 py-2 text-sm font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
                    >
                      Mark Completed
                    </button>
                  )}
                {isOwner && activeReq.status === "TASK COMPLETED" && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("ELDERLY USER CONFIRMATION")}
                    className="px-4 py-2 text-sm font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
                  >
                    Confirm Task Completed
                  </button>
                )}
                {isOwner &&
                  ["REQUEST SUBMITTED", "WAITING FOR VOLUNTEER"].includes(activeReq.status) && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange("CANCELLED")}
                      className="px-4 py-2 text-sm font-medium text-red-700 border border-red-200 rounded-lg hover:bg-red-50 cursor-pointer"
                    >
                      Cancel Request
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() => setShowReportModal((s) => !s)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5 text-red-600" />
                  Report Issue
                </button>
              </div>
            </div>

            {attachmentUrl && (
              <div className="pt-2">
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 hover:underline"
                >
                  <FileText className="w-4 h-4" />
                  View Attached Request File
                </a>
              </div>
            )}
          </div>

          {/* 7-Stage Workflow Stepper */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold text-slate-900">
              Live Progress Workflow
            </h3>
            {activeReq.status === "CANCELLED" ? (
              <p className="text-sm font-semibold text-red-700">This request was cancelled.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
                {REQUEST_WORKFLOW_STEPS.map((step, index) => {
                  const completed = index <= currentStepIndex;
                  const current = index === currentStepIndex;
                  return (
                    <div
                      key={step}
                      className={`p-3 rounded-lg border text-xs space-y-1 ${
                        current
                          ? "bg-blue-50 border-blue-400 text-blue-950 font-semibold"
                          : completed
                          ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                          : "bg-slate-50 border-slate-200 text-slate-500"
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono tabular-nums">
                        <span>0{index + 1}</span>
                        {completed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
                      </div>
                      <p className="leading-snug">
                        {language === "kn" ? STATUS_LABELS_KN[step] || step : step}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Protected Contact Disclosure & Protected Chat */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    Protected Participant Details
                  </h3>
                </div>

                {contacts?.volunteer ? (
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-sm">
                    <p className="text-xs font-semibold text-slate-500">Assigned Volunteer</p>
                    <p className="font-semibold text-slate-900">{contacts.volunteer.full_name}</p>
                    {contacts.volunteer.phone && (
                      <p className="text-slate-700 flex items-center gap-1.5 font-mono text-xs">
                        <Phone className="w-3.5 h-3.5 text-blue-700" />
                        {contacts.volunteer.phone}
                      </p>
                    )}
                    <p className="text-xs text-slate-600">
                      Area: {contacts.volunteer.service_area} · Rating:{" "}
                      {contacts.volunteer.rating > 0 ? `${contacts.volunteer.rating} ★` : "Verified"}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">
                    Waiting for a verified volunteer to accept this request.
                  </p>
                )}

                {contacts?.elderly && (isAssignedVol || isOwner || profile.role === "admin") && (
                  <div className="p-4 rounded-lg bg-blue-50/60 border border-blue-200 space-y-1.5 text-sm">
                    <p className="text-xs font-semibold text-blue-900">
                      Elderly Member Contact (Shared Only After Assignment)
                    </p>
                    <p className="font-semibold text-slate-900">{contacts.elderly.full_name}</p>
                    {contacts.elderly.phone && (
                      <p className="text-slate-700 flex items-center gap-1.5 font-mono text-xs">
                        <Phone className="w-3.5 h-3.5 text-blue-700" />
                        {contacts.elderly.phone}
                      </p>
                    )}
                    {contacts.elderly.address && (
                      <p className="text-xs text-slate-700 flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-700 shrink-0 mt-0.5" />
                        <span>
                          {contacts.elderly.address}, {contacts.elderly.city} {contacts.elderly.pincode}
                        </span>
                      </p>
                    )}
                    {contacts.elderly.emergency_contact && (
                      <p className="text-xs text-slate-600">
                        <strong>Emergency Contact:</strong> {contacts.elderly.emergency_contact}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Status Timeline History */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                <h3 className="font-display text-base font-semibold text-slate-900">Status History</h3>
                {history.length > 0 ? (
                  <ul className="space-y-3 text-xs">
                    {history.map((h) => (
                      <li key={h.id} className="flex items-start gap-2.5">
                        <Clock className="w-3.5 h-3.5 text-blue-700 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-slate-900">{h.new_status}</p>
                          {h.note && <p className="text-slate-600">{h.note}</p>}
                          <p className="text-slate-400 font-mono tabular-nums">
                            {new Date(h.created_at).toLocaleString()}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">No history entries yet.</p>
                )}
              </div>
            </div>

            {/* Protected Communication System */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between min-h-[380px]">
              <div className="space-y-4">
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  Protected Communication
                </h3>
                {!activeReq.assigned_volunteer_id ? (
                  <p className="text-sm text-slate-600">
                    Direct messaging opens automatically once a verified volunteer accepts this request.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto p-3 rounded-lg bg-slate-50 border border-slate-200">
                    {messages.length > 0 ? (
                      messages.map((m) => {
                        const mine = m.sender_id === user.id;
                        return (
                          <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm ${
                                mine
                                  ? "bg-blue-700 text-white"
                                  : "bg-white text-slate-800 border border-slate-200"
                              }`}
                            >
                              <p>{m.message}</p>
                              <p
                                className={`text-[11px] mt-1 font-mono tabular-nums ${
                                  mine ? "text-blue-100" : "text-slate-400"
                                }`}
                              >
                                {new Date(m.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-500 text-center py-6">
                        No messages yet. Say hello to coordinate arrival time safely.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {activeReq.assigned_volunteer_id && activeReq.status !== "CANCELLED" && (
                <form onSubmit={handleSendMessage} className="mt-4 pt-3 border-t border-slate-200 flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Write a message..."
                    className="flex-1 px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sendingMsg || !newMessage.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Feedback and Rating Form (After completion/confirmation) */}
          {isOwner &&
            activeReq.assigned_volunteer_id &&
            ["TASK COMPLETED", "ELDERLY USER CONFIRMATION"].includes(activeReq.status) &&
            !reviewSubmitted && (
              <form
                onSubmit={handleSubmitReview}
                className="bg-white border border-emerald-200 rounded-xl p-6 space-y-4"
              >
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  Rate Your Assistance Experience
                </h3>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setRating(num)}
                      className="p-2 rounded-lg border border-slate-200 hover:bg-amber-50 cursor-pointer"
                      aria-label={`Rate ${num} stars`}
                    >
                      <Star
                        className={`w-6 h-6 ${
                          num <= rating ? "text-amber-500 fill-amber-500" : "text-slate-300"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-mono text-sm text-slate-700 tabular-nums">{rating} / 5</span>
                </div>
                <textarea
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share how the volunteer helped you..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                />
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
                >
                  {submittingReview ? "Submitting..." : "Submit Rating & Feedback"}
                </button>
              </form>
            )}

          {/* Report Modal / Inline Panel */}
          {showReportModal && (
            <form
              onSubmit={handleSubmitReport}
              className="bg-red-50 border border-red-200 rounded-xl p-6 space-y-4"
            >
              <h3 className="font-display text-lg font-semibold text-red-900">
                Report Inappropriate Behaviour or Safety Concern
              </h3>
              <div>
                <label className="block text-sm font-medium text-red-900 mb-1">Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-red-200 rounded-lg"
                >
                  <option>Inappropriate Behaviour</option>
                  <option>No Show / Unresponsive</option>
                  <option>Safety or Privacy Concern</option>
                  <option>Suspicious Activity</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-red-900 mb-1">Details *</label>
                <textarea
                  required
                  rows={3}
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  placeholder="Describe what happened so our administrators can act promptly..."
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-red-200 rounded-lg"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-700 rounded-lg hover:bg-red-800 cursor-pointer"
                >
                  {submittingReport ? "Submitting..." : "Submit Report"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
