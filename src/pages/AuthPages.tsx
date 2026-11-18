import { useState } from "react";
import { Loader2, Upload, ShieldCheck, AlertCircle } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getSupabaseClient } from "../lib/supabase";
import { ASSISTANCE_CATEGORIES, Language } from "../types/database";

export function LoginPage() {
  const { navigate, supabaseConfigured, refreshProfile } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setResendNotice("Confirmation email sent! Check your inbox and spam folder, then click the link.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResendNotice(null);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase is not connected yet. Please configure Supabase first.");
      return;
    }

    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;

      await refreshProfile();

      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      const role = prof?.role || "elderly";
      if (role === "admin") navigate("admin-dashboard");
      else if (role === "volunteer") navigate("volunteer-dashboard");
      else navigate("elderly-dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const isUnconfirmedError = Boolean(error && error.toLowerCase().includes("email not confirmed"));

  return (
    <div className="max-w-md mx-auto px-4 py-14">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Sign In to ElderCare Connect</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Access your elderly, volunteer, or administrator dashboard.
          </p>
        </div>

        {!supabaseConfigured && (
          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2">
            <span>Supabase backend not configured yet.</span>
            <button
              type="button"
              onClick={() => navigate("setup")}
              className="font-semibold underline cursor-pointer shrink-0"
            >
              Setup Now
            </button>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {isUnconfirmedError && (
              <div className="pt-1 text-xs text-red-900 space-y-2">
                <p>
                  Supabase requires email verification before signing in. Click the link sent to{" "}
                  <strong>{email}</strong>, or resend it below.
                </p>
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resending}
                  className="px-3 py-1.5 font-semibold bg-white border border-red-300 rounded-md hover:bg-red-100 cursor-pointer"
                >
                  {resending ? "Sending..." : "Resend Confirmation Email"}
                </button>
              </div>
            )}
          </div>
        )}

        {resendNotice && (
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            {resendNotice}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="name@example.com"
              className="w-full px-3.5 py-3 text-base border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              className="w-full px-3.5 py-3 text-base border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-base font-semibold text-white bg-blue-700 rounded-xl hover:bg-blue-800 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{loading ? "Signing In..." : "Sign In"}</span>
          </button>
        </form>

        <div className="pt-4 border-t border-slate-200 text-center text-sm text-slate-600">
          New to ElderCare Connect?{" "}
          <button
            type="button"
            onClick={() => navigate("register")}
            className="font-semibold text-blue-700 hover:underline cursor-pointer"
          >
            Create an Account
          </button>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { navigate, supabaseConfigured, refreshProfile } = useApp();
  const [role, setRole] = useState<"elderly" | "volunteer">("elderly");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<Language>("en");
  const [password, setPassword] = useState("");

  // Elderly fields
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [additionalRequirements, setAdditionalRequirements] = useState("");

  // Volunteer fields
  const [serviceArea, setServiceArea] = useState("");
  const [volCity, setVolCity] = useState("");
  const [volPincode, setVolPincode] = useState("");
  const [availability, setAvailability] = useState("Weekdays Morning & Evening");
  const [skillsText, setSkillsText] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["Grocery Shopping"]);
  const [bio, setBio] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase is not connected yet. Open Setup to link your Supabase project.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (role === "elderly" && (!address.trim() || !city.trim() || !emergencyContact.trim())) {
      setError("Please fill in your address, city, and emergency contact.");
      return;
    }

    if (role === "volunteer" && (!serviceArea.trim() || selectedCategories.length === 0)) {
      setError("Please enter your service area and choose at least one assistance category.");
      return;
    }

    setLoading(true);
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            role,
            preferred_language: preferredLanguage,
          },
        },
      });

      if (signUpError) throw signUpError;
      const newUser = authData.user;
      if (!newUser) throw new Error("Account could not be created.");

      // If an active session is returned immediately, populate role details & upload ID doc
      if (authData.session) {
        if (role === "elderly") {
          const { error: edError } = await supabase.from("elderly_details").upsert({
            user_id: newUser.id,
            address: address.trim(),
            city: city.trim(),
            pincode: pincode.trim(),
            emergency_contact: emergencyContact.trim(),
            additional_requirements: additionalRequirements.trim() || null,
          });
          if (edError) throw edError;
        } else {
          let docPath: string | null = null;
          if (idFile) {
            const safeName = `${Date.now()}-${idFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
            const uploadPath = `${newUser.id}/${safeName}`;
            const { error: uploadErr } = await supabase.storage
              .from("verification-documents")
              .upload(uploadPath, idFile, { upsert: true });
            if (uploadErr) throw uploadErr;
            docPath = uploadPath;
          }

          const skillsArr = skillsText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

          const { error: vdError } = await supabase.from("volunteer_details").upsert({
            user_id: newUser.id,
            skills: skillsArr,
            categories: selectedCategories,
            service_area: serviceArea.trim(),
            city: volCity.trim(),
            pincode: volPincode.trim(),
            availability: availability.trim(),
            bio: bio.trim(),
            verification_document_path: docPath,
          });
          if (vdError) throw vdError;
        }

        await refreshProfile();
        navigate(role === "volunteer" ? "volunteer-dashboard" : "elderly-dashboard");
      } else {
        setSuccessMsg(
          "Account created! Please check your email inbox to confirm your email address, then sign in to finish setup."
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Create Your ElderCare Connect Account
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Join as an elderly member (or family caregiver) or apply as a verified neighborhood volunteer.
          </p>
        </div>

        {!supabaseConfigured && (
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900 flex items-center justify-between gap-2">
            <span>Supabase is not connected yet. Connect your project first to register accounts.</span>
            <button
              type="button"
              onClick={() => navigate("setup")}
              className="font-semibold underline cursor-pointer shrink-0"
            >
              Setup
            </button>
          </div>
        )}

        {/* Role Selector */}
        <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setRole("elderly")}
            className={`py-3 px-4 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
              role === "elderly" ? "bg-white text-blue-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            I Need Assistance (Elderly)
          </button>
          <button
            type="button"
            onClick={() => setRole("volunteer")}
            className={`py-3 px-4 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
              role === "volunteer" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            I Want to Help (Volunteer)
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 space-y-2">
            <p>{successMsg}</p>
            <button
              type="button"
              onClick={() => navigate("login")}
              className="font-semibold text-emerald-900 underline cursor-pointer"
            >
              Go to Sign In →
            </button>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Kamala Rao"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
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
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">Preferred Language</label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value as Language)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:border-blue-600 focus:outline-none"
              >
                <option value="en">English</option>
                <option value="kn">Kannada (ಕನ್ನಡ)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">Password (min 6 characters) *</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a secure password"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
            />
          </div>

          {role === "elderly" ? (
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Home & Emergency Contact Details (Kept Private)
              </h2>
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Residential Address *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House / Flat number, Street (shared only with assigned volunteer)"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">City / Neighborhood *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Jayanagar, Bengaluru"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
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
                    className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">
                  Emergency Contact Name & Phone *
                </label>
                <input
                  type="text"
                  required
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="e.g. Suresh Rao (Son) - +91 99XXXXXXXX"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">
                  Mobility or Assistance Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={additionalRequirements}
                  onChange={(e) => setAdditionalRequirements(e.target.value)}
                  placeholder="e.g. Uses walking cane, prefers morning visits"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-emerald-800">
                <ShieldCheck className="w-5 h-5" />
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Volunteer Service Profile & ID Verification
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Service Area *</label>
                  <input
                    type="text"
                    required
                    value={serviceArea}
                    onChange={(e) => setServiceArea(e.target.value)}
                    placeholder="e.g. Indiranagar"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={volCity}
                    onChange={(e) => setVolCity(e.target.value)}
                    placeholder="Bengaluru"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={volPincode}
                    onChange={(e) => setVolPincode(e.target.value)}
                    placeholder="560038"
                    className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Availability *</label>
                  <input
                    type="text"
                    required
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    placeholder="e.g. Weekends & Evenings"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Skills (comma separated)</label>
                  <input
                    type="text"
                    value={skillsText}
                    onChange={(e) => setSkillsText(e.target.value)}
                    placeholder="Driving, Kannada speaking, First aid"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800 mb-2">
                  Categories You Can Assist With *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ASSISTANCE_CATEGORIES.map((cat) => (
                    <label
                      key={cat}
                      className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat)}
                        onChange={() => toggleCategory(cat)}
                        className="rounded border-slate-300 text-blue-700"
                      />
                      <span>{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Short Introduction</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share why you'd like to help seniors in your neighborhood..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">
                  Government ID / Verification Document (PDF, JPG, PNG)
                </label>
                <label className="flex items-center gap-3 p-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer">
                  <Upload className="w-5 h-5 text-blue-700 shrink-0" />
                  <span className="text-sm text-slate-700 truncate">
                    {idFile ? idFile.name : "Select ID document to upload securely to private storage"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-base font-semibold text-white bg-blue-700 rounded-xl hover:bg-blue-800 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{loading ? "Creating Account..." : "Complete Registration"}</span>
          </button>
        </form>

        <div className="pt-4 border-t border-slate-200 text-center text-sm text-slate-600">
          Already registered?{" "}
          <button
            type="button"
            onClick={() => navigate("login")}
            className="font-semibold text-blue-700 hover:underline cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
