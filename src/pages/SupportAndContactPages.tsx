import { useState } from "react";
import { Mail, PhoneCall, MapPin, CheckCircle2, Loader2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getSupabaseClient } from "../lib/supabase";

export function SupportPage() {
  const { user, profile } = useApp();
  const [name, setName] = useState(profile?.full_name || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"support" | "feedback">("support");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase is not connected yet. Connect Supabase in Setup to submit support tickets.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { error: insErr } = await supabase.from("support_messages").insert({
        user_id: user?.id || null,
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        type,
      });
      if (insErr) throw insErr;
      setDone(true);
      setSubject("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-900">Feedback & Community Support</h1>
        <p className="mt-2 text-base text-slate-600 max-w-2xl">
          Have a question about using ElderCare Connect, feedback on a volunteer visit, or need help with your account?
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-slate-900">Common Questions</h2>
            <div className="space-y-3 text-sm text-slate-600">
              <div>
                <p className="font-semibold text-slate-900">Can I request help on behalf of my parent?</p>
                <p>Yes. Family members can register and manage requests alongside their elderly loved one.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Who sees my home address?</p>
                <p>Only the single verified volunteer assigned to your active request.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">What if I have a medical emergency?</p>
                <p>Call local emergency services (112 / 108 / 911) immediately rather than creating a volunteer task.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          {done ? (
            <div className="space-y-3 text-emerald-900">
              <div className="flex items-center gap-2 font-display text-lg font-bold">
                <CheckCircle2 className="w-6 h-6 text-emerald-700" />
                Thank you for reaching out!
              </div>
              <p className="text-sm text-slate-700">
                Your support message has been saved securely in our database. Our community team will follow up via
                email.
              </p>
              <button
                type="button"
                onClick={() => setDone(false)}
                className="px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg cursor-pointer"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Topic</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as "support" | "feedback")}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="support">Platform Support</option>
                    <option value="feedback">Platform Feedback</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="How can we help?"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Message *</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-700 rounded-xl hover:bg-blue-800 cursor-pointer"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{submitting ? "Sending..." : "Submit Support Request"}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export function ContactPage() {
  const { user, profile } = useApp();
  const [name, setName] = useState(profile?.full_name || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Please connect Supabase in Setup to send contact inquiries.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { error: insErr } = await supabase.from("support_messages").insert({
        user_id: user?.id || null,
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        type: "contact",
      });
      if (insErr) throw insErr;
      setSent(true);
      setSubject("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send inquiry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-900">Contact ElderCare Connect</h1>
        <p className="mt-2 text-base text-slate-600 max-w-2xl">
          Reach our neighborhood coordination desk for partnerships, volunteer onboarding questions, or safety support.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5 text-sm text-slate-700">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900">Community Desk Email</p>
              <p className="font-mono text-xs text-slate-600">support@eldercareconnect.org</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <PhoneCall className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900">Emergency Reminder</p>
              <p>For urgent medical emergencies, always dial 112 / 108 / 911 directly.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900">Community Coverage</p>
              <p>Neighborhood chapters supporting seniors across urban and suburban wards.</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          {sent ? (
            <div className="space-y-3">
              <p className="font-display text-lg font-bold text-emerald-800">Inquiry Received</p>
              <p className="text-sm text-slate-700">Thank you for contacting ElderCare Connect.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Message *</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 text-sm font-semibold text-white bg-blue-700 rounded-xl hover:bg-blue-800 cursor-pointer"
              >
                {submitting ? "Sending..." : "Send Message"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
