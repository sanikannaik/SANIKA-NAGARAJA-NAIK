import { useEffect, useState } from "react";
import { Mic, MicOff, Sparkles, Upload, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getSupabaseClient } from "../lib/supabase";
import { ASSISTANCE_CATEGORIES, UrgencyLevel } from "../types/database";
import { DashboardShell } from "../components/DashboardShell";
import { createSpeechRecognition, SpeechRecognitionResultEvent } from "../lib/speech";

export function CreateRequestPage() {
  const { user, profile, elderlyDetails, language, navigate, refreshProfile } = useApp();

  const [categories, setCategories] = useState<string[]>([...ASSISTANCE_CATEGORIES]);
  const [voiceDraft, setVoiceDraft] = useState("");
  const [listening, setListening] = useState(false);
  const [aiParsing, setAiParsing] = useState(false);
  const [emergencyWarning, setEmergencyWarning] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("Grocery Shopping");
  const [description, setDescription] = useState("");
  const [simplifiedDescription, setSimplifiedDescription] = useState("");
  const [location, setLocation] = useState(
    elderlyDetails ? `${elderlyDetails.city}${elderlyDetails.pincode ? ` (${elderlyDetails.pincode})` : ""}` : ""
  );
  const [preferredDate, setPreferredDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [preferredTime, setPreferredTime] = useState("10:00 AM");
  const [urgency, setUrgency] = useState<UrgencyLevel>("normal");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  // Inline member auth/contact fields when visitor is not yet signed in
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<{ id: string; code: string } | null>(null);

  const handleResendConfirmation = async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !email.trim()) return;
    setResending(true);
    setResendNotice(null);
    const { error: resendErr } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
    });
    setResending(false);
    if (resendErr) {
      setError(resendErr.message);
    } else {
      setResendNotice("Confirmation email sent! Please check your inbox/spam folder and click the link.");
    }
  };

  useEffect(() => {
    if (elderlyDetails && !location) {
      setLocation(`${elderlyDetails.city}${elderlyDetails.pincode ? ` (${elderlyDetails.pincode})` : ""}`);
    }
  }, [elderlyDetails, location]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    supabase
      .from("assistance_categories")
      .select("name")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setCategories(data.map((d) => d.name));
        }
      });
  }, []);

  const startVoiceDictation = () => {
    const recognition = createSpeechRecognition();
    if (!recognition) {
      setError("Voice recognition is unavailable in this browser. Please type your description below.");
      return;
    }

    recognition.lang = language === "kn" ? "kn-IN" : "en-US";
    recognition.interimResults = false;
    setListening(true);
    setError(null);

    recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      const spoken = event.results[0]?.[0]?.transcript || "";
      setVoiceDraft((prev) => (prev ? `${prev} ${spoken}` : spoken));
      setDescription((prev) => (prev ? `${prev} ${spoken}` : spoken));
      setListening(false);
    };

    recognition.onerror = () => {
      setListening(false);
      setError("Could not hear clearly. Please try again or type your request.");
    };

    recognition.onend = () => setListening(false);
    recognition.start();
  };

  const handleAiSmartFill = async () => {
    const sourceText = (voiceDraft || description).trim();
    if (!sourceText) {
      setError("Please speak or type a brief description first so ElderCare AI can fill the form.");
      return;
    }
    setAiParsing(true);
    setError(null);
    setEmergencyWarning(null);

    try {
      const res = await fetch("/api/ai/parse-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: sourceText, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI assistant could not parse the request.");

      if (data.is_emergency && data.emergency_warning) {
        setEmergencyWarning(data.emergency_warning);
      }
      if (data.title) setTitle(data.title);
      if (data.category) setCategory(data.category);
      if (data.simplified_description) {
        setSimplifiedDescription(data.simplified_description);
        if (!description.trim()) setDescription(sourceText);
      }
      if (data.urgency) setUrgency(data.urgency as UrgencyLevel);
      if (data.suggested_instructions && !additionalInstructions.trim()) {
        setAdditionalInstructions(data.suggested_instructions);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to organize request with AI.");
    } finally {
      setAiParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setResendNotice(null);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase is not configured. Check your environment configuration.");
      return;
    }

    if (!title.trim() || !description.trim() || !location.trim() || !preferredDate || !preferredTime.trim()) {
      setError("Please complete all required assistance booking fields.");
      return;
    }

    setSubmitting(true);
    try {
      let activeUserId = user?.id;

      // Authenticate inline if visitor isn't signed in yet
      if (!activeUserId) {
        if (!email.trim() || !password) {
          throw new Error("Please enter your email and password to save your booking securely.");
        }

        if (authMode === "signin") {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (signInErr) throw signInErr;
          activeUserId = signInData.user.id;
        } else {
          if (!fullName.trim() || !phone.trim() || !address.trim() || !emergencyContact.trim()) {
            throw new Error(
              "Please fill in your full name, phone, residential address, and emergency contact so a verified volunteer can reach you."
            );
          }
          if (password.length < 6) {
            throw new Error("Password must be at least 6 characters long.");
          }

          const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                full_name: fullName.trim(),
                phone: phone.trim(),
                role: "elderly",
                preferred_language: language,
              },
            },
          });

          if (signUpErr) throw signUpErr;
          if (!signUpData.session || !signUpData.user) {
            throw new Error(
              "Account created! Please check your email inbox to confirm your address, or disable 'Confirm email' in Supabase Auth settings, then click Submit again using Sign In."
            );
          }

          activeUserId = signUpData.user.id;

          const { error: edErr } = await supabase.from("elderly_details").upsert({
            user_id: activeUserId,
            address: address.trim(),
            city: location.trim(),
            pincode: pincode.trim() || "000000",
            emergency_contact: emergencyContact.trim(),
          });
          if (edErr) throw edErr;
        }

        await refreshProfile();
      }

      let attachmentPath: string | null = null;
      if (attachmentFile) {
        const safeName = `${Date.now()}-${attachmentFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const uploadPath = `${activeUserId}/${safeName}`;
        const { error: uploadErr } = await supabase.storage
          .from("request-attachments")
          .upload(uploadPath, attachmentFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        attachmentPath = uploadPath;
      }

      const { data: inserted, error: insertErr } = await supabase
        .from("assistance_requests")
        .insert({
          elderly_user_id: activeUserId,
          category,
          title: title.trim(),
          description: description.trim(),
          simplified_description: simplifiedDescription.trim() || null,
          location: location.trim(),
          preferred_date: preferredDate,
          preferred_time: preferredTime.trim(),
          urgency,
          attachment_path: attachmentPath,
          additional_instructions: additionalInstructions.trim() || null,
          status: "WAITING FOR VOLUNTEER",
        })
        .select("id, request_code")
        .single();

      if (insertErr) {
        if (insertErr.message.includes("schema cache") || insertErr.message.includes("does not exist")) {
          throw new Error(
            "Your Supabase database tables have not been created yet. Open Database Setup (#/setup) and run supabase/schema.sql in your Supabase SQL Editor."
          );
        }
        throw insertErr;
      }

      setCreatedCode({ id: inserted.id, code: inserted.request_code });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save assistance request.");
    } finally {
      setSubmitting(false);
    }
  };

  const formContent = createdCode ? (
    <div className="bg-white border border-emerald-200 rounded-xl p-8 space-y-5">
      <div className="flex items-center gap-3 text-emerald-800">
        <CheckCircle2 className="w-7 h-7" />
        <h2 className="font-display text-2xl font-bold">Booking Saved to Supabase</h2>
      </div>
      <p className="text-base text-slate-700">
        Your unique Request ID is{" "}
        <span className="font-mono font-semibold text-slate-900">{createdCode.code}</span>. Your assistance request is
        now stored in the Supabase database and visible to verified volunteers in your neighborhood.
      </p>
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          onClick={() => navigate("track-request", createdCode.id)}
          className="px-5 py-3 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer"
        >
          Track Request Live
        </button>
        <button
          type="button"
          onClick={() => {
            setCreatedCode(null);
            setTitle("");
            setDescription("");
            setSimplifiedDescription("");
            setVoiceDraft("");
            setAdditionalInstructions("");
            setAttachmentFile(null);
          }}
          className="px-5 py-3 text-sm font-semibold text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
        >
          Book Another Assistance Visit
        </button>
      </div>
    </div>
  ) : (
    <div className="space-y-6">
      {/* Voice & AI Helper Box */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Voice Input & AI Request Helper
            </h2>
            <p className="text-sm text-slate-600">
              Speak naturally in English or Kannada, then click AI Smart Fill to auto-populate your booking details.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={startVoiceDictation}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border cursor-pointer ${
                listening
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
              }`}
            >
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-blue-700" />}
              {listening ? "Listening..." : "Speak Request"}
            </button>
            <button
              type="button"
              onClick={handleAiSmartFill}
              disabled={aiParsing}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-60 cursor-pointer"
            >
              {aiParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {aiParsing ? "Organizing..." : "AI Smart Fill"}
            </button>
          </div>
        </div>
        <textarea
          rows={2}
          value={voiceDraft}
          onChange={(e) => setVoiceDraft(e.target.value)}
          placeholder='Example: "I need someone to accompany me to St. Martha Hospital tomorrow at 10 AM"'
          className="w-full px-3.5 py-2.5 text-base bg-white border border-blue-200 rounded-lg focus:border-blue-600 focus:outline-none"
        />
      </div>

      {emergencyWarning && (
        <div className="p-5 rounded-xl bg-red-50 border border-red-300 text-red-900 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-display font-bold text-base">Urgent Emergency Guidance</p>
            <p className="text-sm leading-relaxed">{emergencyWarning}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800 space-y-2">
          <p>{error}</p>
          {error.includes("schema.sql") && (
            <button
              type="button"
              onClick={() => navigate("setup")}
              className="font-semibold underline cursor-pointer"
            >
              Open Database Setup & Schema →
            </button>
          )}
          {(error.toLowerCase().includes("email not confirmed") || error.toLowerCase().includes("confirm your address")) &&
            email.trim() && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resending}
                  className="px-3 py-1.5 text-xs font-semibold bg-white border border-red-300 rounded-md hover:bg-red-100 cursor-pointer"
                >
                  {resending ? "Sending..." : "Resend Confirmation Email"}
                </button>
              </div>
            )}
        </div>
      )}

      {resendNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
          {resendNotice}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1.5">Appointment / Request Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Grocery pickup from local market"
              className="w-full px-3.5 py-3 text-base border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1.5">Assistance Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-3 text-base border border-slate-300 rounded-lg bg-white focus:border-blue-600 focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1.5">Detailed Description *</label>
          <textarea
            rows={4}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what help you need..."
            className="w-full px-3.5 py-3 text-base border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
          />
        </div>

        {simplifiedDescription && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1">
            <p className="text-xs font-semibold text-emerald-900">AI-Simplified Summary (Shown to Volunteers)</p>
            <p className="text-sm text-emerald-900">{simplifiedDescription}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-800 mb-1.5">
              Neighborhood / City * (Exact street address kept private)
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Jayanagar 4th Block, Bengaluru"
              className="w-full px-3.5 py-3 text-base border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1.5">Preferred Date *</label>
            <input
              type="date"
              required
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              className="w-full px-3.5 py-3 text-base border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1.5">Preferred Time *</label>
            <input
              type="text"
              required
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              placeholder="10:00 AM"
              className="w-full px-3.5 py-3 text-base border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1.5">Urgency Level</label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as UrgencyLevel)}
              className="w-full px-3.5 py-3 text-base border border-slate-300 rounded-lg bg-white focus:border-blue-600 focus:outline-none"
            >
              <option value="low">Low — Flexible timing</option>
              <option value="normal">Normal — Standard request</option>
              <option value="high">High — Needed soon</option>
              <option value="urgent">Urgent — Today (Non-medical emergency only)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1.5">
              Optional Image Attachment (e.g. grocery list)
            </label>
            <label className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer">
              <Upload className="w-4 h-4 text-blue-700 shrink-0" />
              <span className="text-sm text-slate-700 truncate">
                {attachmentFile ? attachmentFile.name : "Upload optional photo or note"}
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1.5">Additional Instructions</label>
          <textarea
            rows={2}
            value={additionalInstructions}
            onChange={(e) => setAdditionalInstructions(e.target.value)}
            placeholder="e.g. Please ring the doorbell twice, prefers Kannada-speaking helper"
            className="w-full px-3.5 py-3 text-base border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
          />
        </div>

        {/* Inline Account & Private Contact Details when visitor is not signed in */}
        {!user && (
          <div className="pt-5 border-t border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  Your Contact & Account Details
                </h3>
                <p className="text-xs text-slate-600">
                  Required to save your booking securely and let you track volunteer updates.
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
                <button
                  type="button"
                  onClick={() => setAuthMode("signup")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                    authMode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                  }`}
                >
                  New Member
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("signin")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                    authMode === "signin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                  }`}
                >
                  Existing Account
                </button>
              </div>
            </div>

            {authMode === "signup" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Kamala Rao"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98XXXXXXXX"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-800 mb-1">
                    Private Home Address * (Shared only with your assigned volunteer)
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House/Flat No., Street"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Pincode *</label>
                  <input
                    type="text"
                    required
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="560011"
                    className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Emergency Contact *</label>
                  <input
                    type="text"
                    required
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="Family Name & Phone"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(profile ? "elderly-dashboard" : "home")}
            className="px-5 py-3 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 text-base font-semibold text-white bg-blue-700 rounded-xl hover:bg-blue-800 disabled:opacity-60 flex items-center gap-2 cursor-pointer"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{submitting ? "Saving Booking..." : "Submit Assistance Request"}</span>
          </button>
        </div>
      </form>
    </div>
  );

  if (user && profile) {
    return (
      <DashboardShell
        title="Book Assistance / Create Request"
        subtitle="Speak or type what help you need. Verified neighborhood volunteers will be notified."
      >
        {formContent}
      </DashboardShell>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-900">
          Book Assistance / Submit Request
        </h1>
        <p className="mt-2 text-base text-slate-600">
          Fill out the appointment booking form below to save your assistance request directly to our verified
          community network.
        </p>
      </div>
      {formContent}
    </div>
  );
}
