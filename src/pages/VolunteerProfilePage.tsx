import { useState } from "react";
import { Upload, ShieldCheck, Loader2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getSupabaseClient } from "../lib/supabase";
import { ASSISTANCE_CATEGORIES } from "../types/database";
import { DashboardShell } from "../components/DashboardShell";

export function VolunteerProfilePage() {
  const { user, profile, volunteerDetails, refreshProfile, navigate } = useApp();

  const [serviceArea, setServiceArea] = useState(volunteerDetails?.service_area || "");
  const [city, setCity] = useState(volunteerDetails?.city || "");
  const [pincode, setPincode] = useState(volunteerDetails?.pincode || "");
  const [availability, setAvailability] = useState(volunteerDetails?.availability || "");
  const [skillsText, setSkillsText] = useState((volunteerDetails?.skills || []).join(", "));
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    volunteerDetails?.categories || []
  );
  const [bio, setBio] = useState(volunteerDetails?.bio || "");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!user || !profile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-slate-900">Sign In Required</h1>
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

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      let docPath = volunteerDetails?.verification_document_path || null;
      if (idFile) {
        const safeName = `${Date.now()}-${idFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const uploadPath = `${user.id}/${safeName}`;
        const { error: uploadErr } = await supabase.storage
          .from("verification-documents")
          .upload(uploadPath, idFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        docPath = uploadPath;
      }

      const skills = skillsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const { error: upErr } = await supabase.from("volunteer_details").upsert({
        user_id: user.id,
        service_area: serviceArea.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        availability: availability.trim(),
        skills,
        categories: selectedCategories,
        bio: bio.trim(),
        verification_document_path: docPath,
      });

      if (upErr) throw upErr;
      await refreshProfile();
      setNotice("Volunteer profile and verification document updated.");
      setIdFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell
      title="Volunteer Profile & Verification"
      subtitle="Manage your skills, preferred service area, availability, and identity document."
    >
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-700" />
          <div>
            <p className="text-sm font-semibold text-slate-900 capitalize">
              Verification Status: {volunteerDetails?.verification_status || "pending"}
            </p>
            <p className="text-xs text-slate-600">
              {volunteerDetails?.verification_notes ||
                "Administrators verify your uploaded ID before enabling request acceptance."}
            </p>
          </div>
        </div>
        <span className="font-mono text-sm font-semibold text-slate-800 tabular-nums">
          {volunteerDetails?.rating ? `${volunteerDetails.rating} ★ (${volunteerDetails.review_count})` : "No ratings yet"}
        </span>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
      )}
      {notice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
          {notice}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">Service Area *</label>
            <input
              type="text"
              required
              value={serviceArea}
              onChange={(e) => setServiceArea(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">City *</label>
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">Pincode</label>
            <input
              type="text"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg"
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
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">Skills (comma separated)</label>
            <input
              type="text"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-800 mb-2">Assistance Categories</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ASSISTANCE_CATEGORIES.map((cat) => (
              <label
                key={cat}
                className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat)}
                  onChange={() => toggleCategory(cat)}
                />
                <span>{cat}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1">Introduction Bio</label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1">
            Upload or Replace Verification Document (Private Bucket)
          </label>
          <label className="flex items-center gap-3 p-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer">
            <Upload className="w-5 h-5 text-blue-700 shrink-0" />
            <span className="text-sm text-slate-700 truncate">
              {idFile
                ? idFile.name
                : volunteerDetails?.verification_document_path
                ? "Document uploaded on file (click to replace)"
                : "Select government ID (PDF/JPG/PNG)"}
            </span>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setIdFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-700 rounded-xl hover:bg-blue-800 disabled:opacity-60 cursor-pointer"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{saving ? "Saving Changes..." : "Save Volunteer Profile"}</span>
        </button>
      </form>
    </DashboardShell>
  );
}
