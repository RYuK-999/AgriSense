import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import FeatureCard from "../components/FeatureCard.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";

function formatRelativeDate(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Home() {
  const { t } = useI18n();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem("agrisense_history") || "[]");
      setHistory(h.slice(0, 6));
    } catch { /* ignore */ }
  }, []);

  const clearHistory = () => {
    localStorage.removeItem("agrisense_history");
    setHistory([]);
  };
  return (
    <div className="flex w-full items-stretch justify-center">
      <div className="animate-fade-in w-full max-w-5xl space-y-8">
        {/* Hero Section */}
        <section className="rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-8 shadow-lg ring-1 ring-emerald-100/60 md:p-10">
          <div className="text-center">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t("appName")}
            </p>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              {t("homeTitle")}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-gray-600 md:text-base leading-relaxed">
              {t("homeDesc")}
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/crop-recommendation"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-300 sm:w-auto"
              >
                🌾 {t("btnCrop")}
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
              <Link
                to="/disease-detection"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-emerald-200 bg-white px-7 py-3.5 text-sm font-semibold text-emerald-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md sm:w-auto"
              >
                🔬 {t("btnDisease")}
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Cards */}
        <section>
          <h2 className="mb-5 text-center text-xl font-bold text-slate-900">
            {t("pillarsTitle")}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="animate-slide-up stagger-1">
              <FeatureCard
                title={t("soilIntel")}
                description={t("soilIntelDesc")}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 20h16" />
                    <path d="M5 16c1.5-1 3-3 3-6a4 4 0 1 1 8 0c0 3 1.5 5 3 6" />
                  </svg>
                }
              />
            </div>
            <div className="animate-slide-up stagger-2">
              <FeatureCard
                title={t("cropPrediction")}
                description={t("cropPredictionDesc")}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 13h6V4H4z" />
                    <path d="M14 20h6v-9h-6z" />
                    <path d="M14 4v5h6V4z" />
                    <path d="M4 20h6v-5H4z" />
                  </svg>
                }
              />
            </div>
            <div className="animate-slide-up stagger-3">
              <FeatureCard
                title={t("navDisease")}
                description={t("diseaseDesc")}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="7" />
                    <path d="M12 9v3l2 2" />
                  </svg>
                }
              />
            </div>
          </div>
        </section>

        {/* Recent Analysis History */}
        {history.length > 0 && (
          <section className="animate-slide-up">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                📊 {t("recentAnalyses") || "Recent Analyses"}
              </h2>
              <button
                type="button"
                onClick={clearHistory}
                className="rounded-full px-3 py-1 text-[11px] font-medium text-gray-500 transition hover:bg-gray-100 hover:text-red-600"
              >
                {t("clearHistory") || "Clear history"}
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {history.map((item, idx) => (
                <Link
                  key={idx}
                  to={item.type === "crop" ? "/crop-recommendation" : "/disease-detection"}
                  className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full text-lg" style={{ background: item.type === "crop" ? "#ecfdf5" : "#fef3c7" }}>
                      {item.type === "crop" ? "🌾" : "🔬"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {item.type === "crop"
                          ? item.summary?.crop || "Crop Analysis"
                          : (item.summary?.disease || "Disease Check").replace(/___/g, " - ").replace(/_/g, " ")}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {item.type === "crop" && item.summary?.location ? `📍 ${item.summary.location} · ` : ""}
                        {formatRelativeDate(item.date)}
                      </p>
                    </div>
                  </div>
                  {item.type === "crop" && item.summary?.profit && (
                    <p className="mt-2 text-xs font-medium text-emerald-700">
                      Est. Profit: ₹{Number(item.summary.profit).toLocaleString()}/ha
                    </p>
                  )}
                  {item.type === "disease" && item.summary?.confidence != null && (
                    <p className="mt-2 text-xs font-medium text-amber-700">
                      Confidence: {(item.summary.confidence * 100).toFixed(0)}%
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

