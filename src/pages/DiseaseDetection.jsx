import { useState, useCallback, useEffect } from "react";
import ResultCard from "../components/ResultCard.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import API_BASE from "../config.js";

function formatDiseaseName(name) {
  if (!name) return "Unknown";
  return name
    .replace(/___/g, " - ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DiseaseDetection() {
  const { t } = useI18n();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  const resetAll = useCallback(() => {
    setFile(null);
    setPreviewUrl("");
    setError("");
    setResult(null);
  }, []);

  const processFile = useCallback((selected) => {
    setError("");
    setResult(null);
    if (!selected) {
      setFile(null);
      setPreviewUrl("");
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError("File too large. Maximum size is 10MB.");
      return;
    }
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }, []);

  const handleFileChange = (event) => {
    processFile(event.target.files?.[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type.startsWith("image/")) {
      processFile(dropped);
    } else {
      setError("Please drop an image file (JPG, PNG, WebP).");
    }
  };

  const handleDetect = async () => {
    setError("");
    setResult(null);
    if (!file) {
      setError("Please upload a leaf image first.");
      return;
    }
    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch(`${API_BASE}/detect-disease`, {
        method: "POST",
        body: formData
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        let detail = "Disease detection request failed.";
        if (errData) {
          if (typeof errData.detail === "string") detail = errData.detail;
          else if (typeof errData.message === "string") detail = errData.message;
        }
        throw new Error(detail);
      }
      const data = await response.json();
      setResult({
        diseaseName: data.disease_name || data.disease || data.label || "Unknown disease",
        confidence: typeof data.confidence === "number" ? data.confidence : data.confidence_percent,
        treatment: data.treatment_advice || data.treatment || data.recommendation || data.advice
      });
      // Save to analysis history
      try {
        const history = JSON.parse(localStorage.getItem("agrisense_history") || "[]");
        history.unshift({
          type: "disease",
          summary: {
            disease: data.disease_name || data.disease || data.label || "Unknown",
            confidence: data.confidence,
            fileName: file?.name || "image",
          },
          date: new Date().toISOString(),
        });
        localStorage.setItem("agrisense_history", JSON.stringify(history.slice(0, 20)));
      } catch { /* ignore */ }
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to run disease detection. Ensure the backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  const confidencePercent = typeof result?.confidence === "number"
    ? Math.min(result.confidence * 100, 100)
    : 0;
  const confidenceColor = confidencePercent >= 80
    ? "bg-emerald-500"
    : confidencePercent >= 50
      ? "bg-amber-500"
      : "bg-red-400";

  return (
    <div className="animate-fade-in flex w-full items-start justify-center">
      <div className="w-full max-w-3xl space-y-6">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-white p-6 shadow-sm ring-1 ring-emerald-100/60 md:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            {t("diseaseTitle")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base leading-relaxed">
            {t("diseaseDesc")}
          </p>
        </div>

        {/* Upload + Preview Grid */}
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-4 rounded-2xl bg-white p-5 shadow-md ring-1 ring-gray-100 md:p-6">
            <div className="space-y-2">
              <label htmlFor="image" className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                {t("leafImage")}
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById("image")?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-all duration-300 ${
                  isDragOver
                    ? "border-emerald-400 bg-emerald-50/60 scale-[1.01]"
                    : "border-gray-300 bg-gray-50/50 hover:border-emerald-300 hover:bg-emerald-50/30"
                }`}
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-800">{t("dropHere")}</p>
                <p className="mt-1 text-xs text-gray-500">{t("browse")}</p>
                <span className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-medium text-emerald-700">
                  JPG · PNG · WebP · Max 10MB
                </span>
              </div>
              <input id="image" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              <input id="camera-input" type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
            </div>

            {/* Camera button for mobile */}
            {isMobile && (
              <button
                type="button"
                onClick={() => document.getElementById("camera-input")?.click()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition-all duration-300 hover:bg-emerald-100 hover:border-emerald-300"
              >
                📸 {t("takePhoto") || "Take Photo with Camera"}
              </button>
            )}

            <button
              type="button"
              onClick={handleDetect}
              disabled={isLoading || !file}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-300 disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  {t("detectingDisease")}
                </span>
              ) : (
                <>🔬 {t("detectDisease")}</>
              )}
            </button>
          </div>

          {/* Preview panel */}
          <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-gray-100 md:p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t("preview")}
            </p>
            {previewUrl ? (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <img src={previewUrl} alt="Selected leaf" className="h-56 w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-56 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 text-gray-400">
                <div className="text-center">
                  <span className="text-3xl">🍃</span>
                  <p className="mt-2 text-xs">{t("noImage")}</p>
                </div>
              </div>
            )}
            {file && (
              <p className="mt-2 truncate text-[11px] text-gray-500">
                {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="animate-slide-up space-y-4">
            {/* Low confidence warning */}
            {confidencePercent > 0 && confidencePercent < 40 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 shadow-sm">
                <p className="font-semibold">⚠️ Low Confidence Detection ({confidencePercent.toFixed(0)}%)</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-700">
                  The model is not very confident about this result. This could mean the image is unclear, the leaf isn't centered,
                  or the disease isn't in our training data. Try uploading a clearer, close-up photo of the affected leaf.
                </p>
              </div>
            )}

            <ResultCard title={t("diseaseAnalysis")}>
              <dl className="space-y-5 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t("diseaseName")}</dt>
                  <dd className="mt-1 text-lg font-bold text-slate-900">
                    {formatDiseaseName(result.diseaseName)}
                  </dd>
                </div>

                <div>
                  <dt className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{t("confidence")}</dt>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${confidenceColor} transition-all duration-700 ease-out`}
                      style={{ width: `${confidencePercent}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-gray-600">
                    {confidencePercent > 0 ? `${confidencePercent.toFixed(1)}%` : "Not available"}
                  </p>
                </div>

                {result.treatment && (
                  <div>
                    <dt className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">{t("treatmentRec")}</dt>
                    <dd className="space-y-3">
                      {typeof result.treatment === "object" ? (
                        <>
                          {result.treatment.immediate && (
                            <div className="rounded-xl bg-red-50 p-4 ring-1 ring-red-100">
                              <p className="text-xs font-bold uppercase text-red-700">⚠️ Immediate Action</p>
                              <p className="mt-1.5 text-sm leading-relaxed text-red-900">{result.treatment.immediate}</p>
                            </div>
                          )}
                          {result.treatment.long_term && (
                            <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-100">
                              <p className="text-xs font-bold uppercase text-amber-700">📋 Long-term Treatment</p>
                              <p className="mt-1.5 text-sm leading-relaxed text-amber-900">{result.treatment.long_term}</p>
                            </div>
                          )}
                          {result.treatment.prevention && (
                            <div className="rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
                              <p className="text-xs font-bold uppercase text-emerald-700">🛡️ Prevention</p>
                              <p className="mt-1.5 text-sm leading-relaxed text-emerald-900">{result.treatment.prevention}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-100 text-sm leading-relaxed text-emerald-900">
                          {result.treatment}
                        </div>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </ResultCard>

            {/* Reset / Try Again */}
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md"
            >
              🔄 {t("tryAnother") || "Try Another Image"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

