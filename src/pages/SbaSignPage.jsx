import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { HMRC_SBA_TERMS_TEMPLATE } from "../constants/selfBilling";

// Public signing page. No AppShell, no auth, no ToastProvider — errors are
// surfaced inline via `error` state. The url token IS the auth.

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—"
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const SummaryRow = ({ label, value, bold }) => (
  <div className="flex justify-between gap-4 py-1.5 border-b border-gray-100 last:border-0">
    <span className="text-sm text-gray-500">{label}</span>
    <span className={`text-sm text-gray-900 ${bold ? "font-semibold" : ""}`}>{value || "—"}</span>
  </div>
);

const ErrorPanel = ({ title, description }) => (
  <div className="max-w-[720px] mx-auto bg-white border border-rose-200 rounded-xl p-8 text-center">
    <div className="text-rose-600 text-lg font-semibold mb-1">{title}</div>
    <div className="text-sm text-gray-600">{description}</div>
  </div>
);

function SuccessPanel({ signedAt }) {
  return (
    <div className="max-w-[720px] mx-auto bg-white border border-emerald-200 rounded-xl p-10 text-center">
      <div aria-hidden="true" className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl">✓</div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Agreement signed successfully</h1>
      <div className="text-sm text-gray-500 mb-4">{fmtDate(signedAt)}</div>
      <p className="text-sm text-gray-600">You can close this tab. A copy has been recorded for both parties.</p>
    </div>
  );
}

const ERROR_COPY = {
  invalid:       { title: "This signing link is no longer available", description: "It may be invalid or already used. Please contact the sender for a new link." },
  "rate-limited":{ title: "Too many attempts",      description: "Please wait a few minutes and try again." },
  network:       { title: "Connection error",       description: "Please check your connection and refresh the page." },
};

export default function SbaSignPage() {
  const { token } = useParams();
  const [state, setState] = useState({ kind: "loading" });
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const r = await fetch(`/api/sba-sign?token=${encodeURIComponent(token || "")}`);
        if (aborted) return;
        if (r.status === 404) {
          setState({ kind: "invalid" });
          return;
        }
        if (r.status === 429) {
          setState({ kind: "rate-limited" });
          return;
        }
        if (!r.ok) {
          setState({ kind: "network" });
          return;
        }
        const data = await r.json();
        setState({ kind: "ready", data });
      } catch {
        if (!aborted) setState({ kind: "network" });
      }
    })();
    return () => { aborted = true; };
  }, [token]);

  async function onSign() {
    if (!agreed || name.trim().length < 2 || signing) return;
    setSubmitError("");
    setSigning(true);
    try {
      const r = await fetch("/api/sba-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: name.trim() }),
      });
      if (r.status === 429) {
        setSubmitError("Too many attempts. Please wait a few minutes and try again.");
        return;
      }
      if (!r.ok) {
        setSubmitError("Signing failed. The link may be invalid or already used.");
        return;
      }
      const { signedAt } = await r.json();
      setState({ kind: "signed", signedAt });
    } catch {
      setSubmitError("Connection error. Please retry.");
    } finally {
      setSigning(false);
    }
  }

  if (state.kind === "loading") {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-[34px]"><div className="text-sm text-gray-500">Loading agreement…</div></div>;
  }
  if (ERROR_COPY[state.kind]) return <Shell><ErrorPanel {...ERROR_COPY[state.kind]} /></Shell>;
  if (state.kind === "signed") return <Shell><SuccessPanel signedAt={state.signedAt} /></Shell>;

  return <Ready data={state.data} name={name} setName={setName} agreed={agreed} setAgreed={setAgreed} signing={signing} submitError={submitError} onSign={onSign} />;
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[720px] mx-auto px-4 pt-[34px] pb-16">
        <div className="text-center mb-[34px]">
          <h1 className="text-xl font-semibold text-gray-900">
            Self-Billing Agreement — Counterparty Signature
          </h1>
          <p className="text-sm text-gray-500 mt-1">HMRC VAT Notice 700/62</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function Ready({ data, name, setName, agreed, setAgreed, signing, submitError, onSign }) {
  const { agreement, parties, pdfUrl } = data;
  const notices = useMemo(() => [
    "You will not issue your own sales invoices for any transaction covered by this agreement.",
    "You must notify the Self-Biller immediately of changes to your VAT registration, deregistration, or transfer of the business.",
    `This agreement expires on ${fmtDate(agreement.end_date)}. A new agreement must be entered into to continue self-billing after that date.`,
  ], [agreement.end_date]);
  const nameValid = name.trim().length >= 2 && name.trim().length <= 200;
  const canSign = agreed && nameValid && !signing;

  return (
    <Shell>
      <div className="space-y-[21px]">
        <section className="bg-white border border-gray-200 rounded-xl p-[21px]">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Agreement summary</h2>
          <SummaryRow label="Agreement" value={`${(agreement.id || "").slice(0, 8)} v${agreement.version}`} bold />
          <SummaryRow label="Period" value={`${fmtDate(agreement.start_date)} → ${fmtDate(agreement.end_date)}`} />
          <SummaryRow label="Self-Biller" value={parties.selfBiller?.name} />
          <SummaryRow label="Self-Billee (you)" value={parties.selfBillee?.name} />
          <p className="text-xs text-gray-500 mt-3 leading-relaxed">
            You are the Self-Billee — you agree that the Self-Biller will issue invoices on your
            behalf for supplies covered by this agreement.
          </p>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-[21px]">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Important notices</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-700">
            {notices.map((n, i) => (<li key={i}>{n}</li>))}
          </ul>
          <details className="mt-3 rounded-lg border border-gray-200 bg-gray-50">
            <summary className="cursor-pointer select-none px-4 py-2 text-sm font-medium text-gray-700">Full HMRC clause text</summary>
            <ol className="list-decimal pl-8 pr-4 py-3 space-y-2">
              {HMRC_SBA_TERMS_TEMPLATE.map((c) => (
                <li key={c.id} className="text-xs text-gray-600">
                  <span className="font-semibold text-gray-800">{c.title}. </span>{c.body}
                </li>
              ))}
            </ol>
          </details>
        </section>

        {pdfUrl && (
          <section className="bg-white border border-gray-200 rounded-xl p-[21px]">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Agreement PDF</h2>
            <iframe
              src={pdfUrl}
              title="Agreement PDF"
              style={{ width: "100%", height: "500px", border: 0 }}
            />
          </section>
        )}

        <section className="bg-white border border-gray-200 rounded-xl p-[21px]">
          <label className="flex items-start gap-2 cursor-pointer text-sm text-gray-900 mb-4">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5"
            />
            I have read and agree to the terms above.
          </label>

          <label className="block text-sm font-medium text-gray-900 mb-1" htmlFor="sba-sign-name">
            Full name
          </label>
          <input
            id="sba-sign-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            maxLength={200}
            required
            className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          {submitError && (
            <div role="alert" className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              {submitError}
            </div>
          )}

          <button
            type="button"
            onClick={onSign}
            disabled={!canSign}
            className="mt-4 w-full h-11 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {signing ? "Signing…" : "Sign Agreement"}
          </button>
        </section>
      </div>
    </Shell>
  );
}
