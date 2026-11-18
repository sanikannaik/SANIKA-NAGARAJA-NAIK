import { Bell, CheckCheck, ArrowRight } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getSupabaseClient } from "../lib/supabase";
import { DashboardShell } from "../components/DashboardShell";

export function NotificationsPage() {
  const { user, notifications, unreadCount, refreshNotifications, navigate } = useApp();

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-slate-900">Sign In to View Notifications</h1>
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

  const markRead = async (id: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    await refreshNotifications();
  };

  const markAllRead = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    await refreshNotifications();
  };

  return (
    <DashboardShell
      title="Real-Time Notifications"
      subtitle="Instant alerts for request acceptance, status progress, completion reminders, and verification decisions."
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Unread alerts: <span className="font-mono font-semibold tabular-nums">{unreadCount}</span>
        </p>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            Mark All Read
          </button>
        )}
      </div>

      {notifications.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                n.is_read ? "bg-white" : "bg-blue-50/40"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Bell className={`w-4 h-4 ${n.is_read ? "text-slate-400" : "text-blue-700"}`} />
                  <h2 className="font-display text-base font-semibold text-slate-900">{n.title}</h2>
                </div>
                <p className="text-sm text-slate-700">{n.message}</p>
                <p className="text-xs font-mono text-slate-400 tabular-nums">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {!n.is_read && (
                  <button
                    type="button"
                    onClick={() => markRead(n.id)}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Mark Read
                  </button>
                )}
                {n.related_request_id && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.is_read) void markRead(n.id);
                      navigate("track-request", n.related_request_id);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer"
                  >
                    View Request <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-600">
          No notifications yet. Activity alerts will arrive here in real time.
        </div>
      )}
    </DashboardShell>
  );
}
