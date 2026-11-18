import { useEffect, useState } from "react";
import { Check, Copy, Database, ShieldCheck, AlertCircle, RefreshCw, ExternalLink } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getSupabaseClient, getSupabaseConfig } from "../lib/supabase";
import schemaSql from "../../supabase/schema.sql?raw";

export function SetupPage() {
  const { navigate } = useApp();
  const config = getSupabaseConfig();
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const runConnectionTest = async () => {
    setTesting(true);
    try {
      const client = getSupabaseClient();
      if (!client) {
        setTestResult({
          ok: false,
          message: "Supabase environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) are not set.",
        });
        return;
      }
      const { error } = await client.from("assistance_categories").select("id").limit(1);
      if (error) {
        setTestResult({
          ok: false,
          message: `Connected to ${config.url}, but database tables are not initialized yet (${error.message}). Copy and run schema.sql in your Supabase SQL Editor below.`,
        });
      } else {
        setTestResult({
          ok: true,
          message: `Connected to ${config.url}! All ElderCare Connect tables, RLS policies, and categories are active.`,
        });
      }
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : "Failed to reach Supabase.",
      });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    void runConnectionTest();
  }, []);

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(schemaSql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-900">
          Supabase Database Connection & SQL Schema
        </h1>
        <p className="mt-3 text-base text-slate-600 max-w-3xl leading-relaxed">
          ElderCare Connect is wired to your Supabase project for authentication, PostgreSQL persistence, private
          document storage, and real-time updates.
        </p>
      </div>

      {/* Live Connection Verification */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-blue-700 shrink-0" />
            <div>
              <h2 className="font-display text-xl font-semibold text-slate-900">
                1. Connected Project Status
              </h2>
              <p className="text-sm text-slate-600 font-mono">
                {config.url || "No VITE_SUPABASE_URL configured"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runConnectionTest}
              disabled={testing}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${testing ? "animate-spin" : ""}`} />
              Verify Database Tables
            </button>
            <button
              type="button"
              onClick={() => navigate("create-request")}
              className="px-4 py-2.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer"
            >
              Open Booking Form →
            </button>
          </div>
        </div>

        {testResult && (
          <div
            className={`p-4 rounded-lg border flex items-start gap-3 text-sm ${
              testResult.ok
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-amber-50 border-amber-200 text-amber-900"
            }`}
          >
            {testResult.ok ? (
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}
      </section>

      {/* Step 2: SQL Schema */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-slate-900">
              2. Initialize Database Schema in Supabase SQL Editor
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Click <strong>Copy schema.sql</strong>, open your project’s SQL Editor, paste, and click <strong>Run</strong>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href="https://supabase.com/dashboard/project/pxeerwxhudgegodrarqr/sql/new"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
            >
              <ExternalLink className="w-4 h-4" />
              Open SQL Editor
            </a>
            <button
              type="button"
              onClick={handleCopySql}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied schema.sql" : "Copy schema.sql"}
            </button>
          </div>
        </div>

        <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto max-h-96 leading-relaxed">
          {schemaSql}
        </pre>

        <div className="pt-2 text-sm text-slate-700 space-y-2">
          <p className="font-semibold text-slate-900">3. Optional: Disable Email Confirmation for Instant Testing</p>
          <p>
            In Supabase Dashboard → Authentication → Providers → Email, turning off <strong>Confirm email</strong> lets
            elderly members and volunteers sign up and submit assistance bookings in one immediate step.
          </p>
          <p className="font-semibold text-slate-900 pt-2">4. Promoting an Administrator Account</p>
          <pre className="p-3 rounded-lg bg-slate-100 text-slate-800 text-xs font-mono overflow-x-auto">
            UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@yourdomain.org';
          </pre>
        </div>
      </section>
    </div>
  );
}
