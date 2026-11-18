import { useCallback, useEffect, useState } from "react";
import { Download, Eye, ShieldCheck, ShieldX, Ban, Check, Plus } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getSupabaseClient } from "../lib/supabase";
import {
  AssistanceCategory,
  AssistanceRequest,
  IncidentReport,
  Profile,
  VolunteerDetails,
} from "../types/database";
import { DashboardShell } from "../components/DashboardShell";

interface VolunteerWithProfile extends VolunteerDetails {
  profiles?: Profile;
}

export function AdminDashboardPage() {
  const { user, profile, navigate } = useApp();
  const [tab, setTab] = useState<"overview" | "volunteers" | "requests" | "reports" | "categories">(
    "overview"
  );

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [volunteers, setVolunteers] = useState<VolunteerWithProfile[]>([]);
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [categories, setCategories] = useState<AssistanceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [newCatName, setNewCatName] = useState("");
  const [newCatKn, setNewCatKn] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);

  const loadAdminData = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !user || profile?.role !== "admin") {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [profRes, volRes, reqRes, repRes, catRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("volunteer_details").select("*").order("created_at", { ascending: false }),
        supabase.from("assistance_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("reports").select("*").order("created_at", { ascending: false }),
        supabase.from("assistance_categories").select("*").order("sort_order", { ascending: true }),
      ]);

      if (profRes.error) throw profRes.error;
      const allProfs = (profRes.data as Profile[]) || [];
      setProfiles(allProfs);

      const profMap = new Map(allProfs.map((p) => [p.id, p]));
      const volList = ((volRes.data as VolunteerDetails[]) || []).map((v) => ({
        ...v,
        profiles: profMap.get(v.user_id),
      }));
      setVolunteers(volList);
      setRequests((reqRes.data as AssistanceRequest[]) || []);
      setReports((repRes.data as IncidentReport[]) || []);
      setCategories((catRes.data as AssistanceCategory[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load administrator data.");
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  if (!user || profile?.role !== "admin") {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-slate-900">Administrator Access Required</h1>
        <p className="text-sm text-slate-600">
          This area is restricted to authorized ElderCare Connect administrators.
        </p>
        <button
          type="button"
          onClick={() => navigate("home")}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg cursor-pointer"
        >
          Return Home
        </button>
      </div>
    );
  }

  const handleVerifyVolunteer = async (
    volunteerUserId: string,
    status: "approved" | "rejected"
  ) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setError(null);
    const notes = status === "rejected" ? "Please re-upload a clearer government ID document." : "Verified by administrator.";
    const { error: rpcErr } = await supabase.rpc("admin_verify_volunteer", {
      p_volunteer_user_id: volunteerUserId,
      p_status: status,
      p_notes: notes,
    });
    if (rpcErr) setError(rpcErr.message);
    else {
      setNotice(`Volunteer status updated to ${status}.`);
      loadAdminData();
    }
  };

  const handleViewDocument = async (path: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data, error: signErr } = await supabase.storage
      .from("verification-documents")
      .createSignedUrl(path, 300);
    if (signErr) {
      setError(signErr.message);
    } else if (data?.signedUrl) {
      setDocPreviewUrl(data.signedUrl);
    }
  };

  const handleToggleSuspend = async (targetUserId: string, currentlySuspended: boolean) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error: upErr } = await supabase
      .from("profiles")
      .update({ is_suspended: !currentlySuspended })
      .eq("id", targetUserId);
    if (upErr) setError(upErr.message);
    else {
      setNotice(`Account ${!currentlySuspended ? "suspended" : "reactivated"}.`);
      loadAdminData();
    }
  };

  const handleUpdateReportStatus = async (reportId: string, status: IncidentReport["status"]) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error: repErr } = await supabase.from("reports").update({ status }).eq("id", reportId);
    if (repErr) setError(repErr.message);
    else {
      setNotice(`Report marked ${status}.`);
      loadAdminData();
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase || !newCatName.trim()) return;
    const { error: catErr } = await supabase.from("assistance_categories").insert({
      name: newCatName.trim(),
      name_kn: newCatKn.trim(),
      description: newCatDesc.trim(),
      sort_order: categories.length + 1,
    });
    if (catErr) setError(catErr.message);
    else {
      setNewCatName("");
      setNewCatKn("");
      setNewCatDesc("");
      setNotice("Category added.");
      loadAdminData();
    }
  };

  const handleToggleCategory = async (cat: AssistanceCategory) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase
      .from("assistance_categories")
      .update({ is_active: !cat.is_active })
      .eq("id", cat.id);
    loadAdminData();
  };

  const exportCsvReport = () => {
    const headers = ["Request Code", "Title", "Category", "Location", "Date", "Urgency", "Status"];
    const rows = requests.map((r) => [
      r.request_code,
      `"${r.title.replace(/"/g, '""')}"`,
      `"${r.category}"`,
      `"${r.location.replace(/"/g, '""')}"`,
      r.preferred_date,
      r.urgency,
      r.status,
    ]);
    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eldercare-requests-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const elderlyCount = profiles.filter((p) => p.role === "elderly").length;
  const volunteerCount = profiles.filter((p) => p.role === "volunteer").length;
  const pendingVolCount = volunteers.filter((v) => v.verification_status === "pending").length;
  const completedCount = requests.filter((r) =>
    ["TASK COMPLETED", "ELDERLY USER CONFIRMATION", "FEEDBACK AND RATING"].includes(r.status)
  ).length;
  const pendingReqCount = requests.filter((r) =>
    ["REQUEST SUBMITTED", "WAITING FOR VOLUNTEER", "VOLUNTEER ACCEPTED", "ASSISTANCE IN PROGRESS"].includes(r.status)
  ).length;
  const openReportsCount = reports.filter((r) => r.status === "open").length;

  return (
    <DashboardShell
      title="Administrator Console"
      subtitle="Verify volunteer identities, monitor community requests, manage categories, and handle safety reports."
    >
      {/* Segmented Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {[
          { id: "overview", label: "Overview" },
          { id: "volunteers", label: `Volunteers (${pendingVolCount} pending)` },
          { id: "requests", label: `Requests (${requests.length})` },
          { id: "reports", label: `Incidents (${openReportsCount} open)` },
          { id: "categories", label: "Categories" },
        ].map((tItem) => (
          <button
            key={tItem.id}
            type="button"
            onClick={() => setTab(tItem.id as typeof tab)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === tItem.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tItem.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
      )}
      {notice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
          {notice}
        </div>
      )}

      {docPreviewUrl && (
        <div className="bg-white border border-blue-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Signed Verification Document Preview</p>
            <button
              type="button"
              onClick={() => setDocPreviewUrl(null)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Close Preview
            </button>
          </div>
          <iframe
            src={docPreviewUrl}
            title="Volunteer Verification Document"
            className="w-full h-80 rounded-lg border border-slate-200"
          />
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 h-40 animate-pulse" />
      ) : (
        <>
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                {[
                  { label: "Elderly Users", val: elderlyCount },
                  { label: "Total Volunteers", val: volunteerCount },
                  { label: "Pending IDs", val: pendingVolCount },
                  { label: "Pending Requests", val: pendingReqCount },
                  { label: "Completed Tasks", val: completedCount },
                  { label: "Open Incidents", val: openReportsCount },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">{stat.label}</p>
                    <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900">
                      {stat.val}
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-slate-900">
                    Platform Activity & Reports
                  </h2>
                  <p className="text-sm text-slate-600">
                    Download a CSV summary of all assistance requests and current workflow statuses.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={exportCsvReport}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  Export CSV Report
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-200">
                  <h3 className="font-display text-base font-semibold text-slate-900">Registered Accounts</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Name</th>
                        <th className="py-3 px-4 font-semibold">Email</th>
                        <th className="py-3 px-4 font-semibold">Role</th>
                        <th className="py-3 px-4 font-semibold">Status</th>
                        <th className="py-3 px-4 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {profiles.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium text-slate-900">{p.full_name}</td>
                          <td className="py-3 px-4 text-slate-600">{p.email}</td>
                          <td className="py-3 px-4 capitalize text-slate-700">{p.role}</td>
                          <td className="py-3 px-4 text-xs font-medium">
                            {p.is_suspended ? (
                              <span className="text-red-700">Suspended</span>
                            ) : (
                              <span className="text-emerald-700">Active</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {p.id !== user.id && (
                              <button
                                type="button"
                                onClick={() => handleToggleSuspend(p.id, p.is_suspended)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-red-700 cursor-pointer"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                {p.is_suspended ? "Reactivate" : "Suspend"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === "volunteers" && (
            <div className="space-y-4">
              {volunteers.length > 0 ? (
                volunteers.map((v) => (
                  <div
                    key={v.id}
                    className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold capitalize text-slate-800">{v.verification_status}</span>
                        <span aria-hidden="true">·</span>
                        <span>{v.service_area}</span>
                        <span aria-hidden="true">·</span>
                        <span>{v.city}</span>
                      </div>
                      <h3 className="font-display text-lg font-bold text-slate-900">
                        {v.profiles?.full_name || "Volunteer"} ({v.profiles?.email})
                      </h3>
                      <p className="text-xs text-slate-600">
                        Categories: {v.categories.join(", ") || "None"} · Availability: {v.availability}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {v.verification_document_path && (
                        <button
                          type="button"
                          onClick={() => handleViewDocument(v.verification_document_path!)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View ID Doc
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleVerifyVolunteer(v.user_id, "approved")}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVerifyVolunteer(v.user_id, "rejected")}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 cursor-pointer"
                      >
                        <ShieldX className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-sm text-slate-600">
                  No volunteer applications found yet.
                </div>
              )}
            </div>
          )}

          {tab === "requests" && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Code</th>
                      <th className="py-3 px-4 font-semibold">Title</th>
                      <th className="py-3 px-4 font-semibold">Category</th>
                      <th className="py-3 px-4 font-semibold">Location</th>
                      <th className="py-3 px-4 font-semibold">Date</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requests.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-xs text-slate-700">{r.request_code}</td>
                        <td className="py-3 px-4 font-medium text-slate-900">{r.title}</td>
                        <td className="py-3 px-4 text-slate-600">{r.category}</td>
                        <td className="py-3 px-4 text-slate-600">{r.location}</td>
                        <td className="py-3 px-4 font-mono text-xs tabular-nums text-slate-600">
                          {r.preferred_date}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-blue-800">{r.status}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => navigate("track-request", r.id)}
                            className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "reports" && (
            <div className="space-y-4">
              {reports.length > 0 ? (
                reports.map((rep) => (
                  <div key={rep.id} className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-bold text-red-800">{rep.reason}</span>
                      <span className="text-xs font-mono uppercase text-slate-600">{rep.status}</span>
                    </div>
                    <p className="text-sm text-slate-700">{rep.description}</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateReportStatus(rep.id, "under_review")}
                        className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg cursor-pointer"
                      >
                        Mark Under Review
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateReportStatus(rep.id, "resolved")}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg cursor-pointer"
                      >
                        Resolve
                      </button>
                      {rep.reported_user_id && (
                        <button
                          type="button"
                          onClick={() => handleToggleSuspend(rep.reported_user_id!, false)}
                          className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg cursor-pointer"
                        >
                          Suspend Reported User
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-sm text-slate-600">
                  No incident reports submitted.
                </div>
              )}
            </div>
          )}

          {tab === "categories" && (
            <div className="space-y-6">
              <form
                onSubmit={handleAddCategory}
                className="bg-white border border-slate-200 rounded-xl p-6 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
              >
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category Name *</label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="e.g. Banking Errands"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Kannada Label</label>
                  <input
                    type="text"
                    value={newCatKn}
                    onChange={(e) => setNewCatKn(e.target.value)}
                    placeholder="ಬ್ಯಾಂಕ್ ಸಹಾಯ"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    placeholder="Short description"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Category
                </button>
              </form>

              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                {categories.map((cat) => (
                  <div key={cat.id} className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-sm text-slate-900">
                        {cat.name} {cat.name_kn ? `· ${cat.name_kn}` : ""}
                      </p>
                      <p className="text-xs text-slate-500">{cat.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleCategory(cat)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                        cat.is_active
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-slate-100 border-slate-200 text-slate-600"
                      }`}
                    >
                      {cat.is_active && <Check className="w-3.5 h-3.5" />}
                      {cat.is_active ? "Active" : "Disabled"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
}
