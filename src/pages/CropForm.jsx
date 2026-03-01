import { useState, lazy, Suspense, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/I18nProvider.jsx";
import API_BASE from "../config.js";

const MapPicker = lazy(() => import("../components/MapPicker.jsx"));

const INITIAL_FORM = {
  location: "",
  previous_crop: "",
  land_size: "",
  irrigation_type: "",
  goal: "",
  temperature: "",
  humidity: "",
  rainfall: "",
  // Optional additional soil info (N, P, K, pH) — only sent if user expands "Additional Information"
  N: "",
  P: "",
  K: "",
  ph: ""
};

// Map friendly weather categories to numeric mid‑points for the backend
function mapTemperatureCategory(value) {
  if (value === "Cool") return 18; // < 20°C
  if (value === "Moderate") return 25; // 20–30°C
  if (value === "Hot") return 32; // > 30°C
  return null;
}

function mapHumidityCategory(value) {
  if (value === "Low") return 30; // < 40%
  if (value === "Medium") return 55; // 40–70%
  if (value === "High") return 80; // > 70%
  return null;
}

function mapRainfallCategory(value) {
  if (value === "Low") return 400; // < 500 mm/year
  if (value === "Medium") return 750; // 500–1000 mm/year
  if (value === "High") return 1200; // > 1000 mm/year
  return null;
}

// API_BASE imported from config.js

function buildPayload(form) {
  const payload = {
    location: form.location.trim(),
    previous_crop: form.previous_crop || null,
    land_size: form.land_size ? Number(form.land_size) : null,
    irrigation_type: form.irrigation_type || null,
    goal: form.goal || null,
    temperature: mapTemperatureCategory(form.temperature),
    humidity: mapHumidityCategory(form.humidity),
    rainfall: mapRainfallCategory(form.rainfall),
    manual_soil: null
  };
  if (form.N !== "" || form.P !== "" || form.K !== "" || form.ph !== "") {
    payload.manual_soil = {
      N: form.N !== "" ? Number(form.N) : 0,
      P: form.P !== "" ? Number(form.P) : 0,
      K: form.K !== "" ? Number(form.K) : 0,
      ph: form.ph !== "" ? Number(form.ph) : 7
    };
  }
  return payload;
}

// Crop recommendation form – preview → confirm → results
export default function CropForm() {
  // Restore cached location (if any)
  const cachedLoc = useRef(null);
  try {
    const saved = localStorage.getItem("agrisense_last_location");
    if (saved) cachedLoc.current = JSON.parse(saved);
  } catch { /* ignore */ }

  const [form, setForm] = useState(() => {
    const init = { ...INITIAL_FORM };
    if (cachedLoc.current?.name) init.location = cachedLoc.current.name;
    return init;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [usingGps, setUsingGps] = useState(false);
  const [gpsMessage, setGpsMessage] = useState("");
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
  const [step, setStep] = useState("form"); // 'form' | 'confirm'
  const [previewData, setPreviewData] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [mapCoords, setMapCoords] = useState(() => cachedLoc.current?.coords || null);
  const [isListening, setIsListening] = useState(false);
  const navigate = useNavigate();
  const { t } = useI18n();

  // Persist location whenever it changes
  const saveLocationCache = (name, coords) => {
    try {
      localStorage.setItem("agrisense_last_location", JSON.stringify({ name, coords }));
    } catch { /* ignore */ }
  };

  // Voice input for location (Web Speech API)
  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice input is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      setError("Could not recognize speech. Please try again.");
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setForm((prev) => ({ ...prev, location: transcript }));
      setGpsMessage("");
    };
    recognition.start();
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setGpsMessage("");
  };

  // Shared helper: reverse geocode lat/lng → location name
  const resolveLocation = async (latitude, longitude) => {
    try {
      const res = await fetch(`${API_BASE}/reverse-geocode?lat=${latitude}&lon=${longitude}`);
      if (res.ok) {
        const data = await res.json();
        return data.location || `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }
    } catch { /* ignore */ }
    return `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setError("GPS is not supported in this browser. Please enter location manually.");
      return;
    }
    setError("");
    setGpsMessage("");
    setUsingGps(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const locationName = await resolveLocation(latitude, longitude);
        setForm((prev) => ({ ...prev, location: locationName }));
        setMapCoords({ lat: latitude, lng: longitude });
        setGpsMessage(locationName);
        saveLocationCache(locationName, { lat: latitude, lng: longitude });
        setUsingGps(false);
      },
      () => {
        setError("Unable to fetch GPS location. Please enter location manually.");
        setUsingGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleMapSelect = async (lat, lng) => {
    setMapCoords({ lat, lng });
    setGpsMessage("");
    const locationName = await resolveLocation(lat, lng);
    setForm((prev) => ({ ...prev, location: locationName }));
    setGpsMessage(locationName);
    saveLocationCache(locationName, { lat, lng });
  };

  const handlePreview = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.location.trim()) {
      setError("Please enter a location.");
      return;
    }
    setIsLoading(true);
    const payload = buildPayload(form);
    try {
      const response = await fetch(`${API_BASE}/farmer-crop-advisory-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        const detail =
          (errData?.detail && (Array.isArray(errData.detail) ? errData.detail.map((d) => d.msg).join("; ") : errData.detail)) ||
          "Preview failed.";
        throw new Error(detail);
      }
      const data = await response.json();
      setPreviewData(data);
      setStep("confirm");
    } catch (err) {
      setError(err?.message || "Unable to load location data. Check backend and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!previewData) return;
    setIsLoading(true);
    setError("");
    const payload = buildPayload(form);
    try {
      const response = await fetch(`${API_BASE}/farmer-crop-advisory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        const detail =
          (errData?.detail && (Array.isArray(errData.detail) ? errData.detail.map((d) => d.msg).join("; ") : errData.detail)) ||
          "Advisory request failed.";
        throw new Error(detail);
      }
      const advisory = await response.json();
      const landAcres = form.land_size ? Number(form.land_size) : null;
      const resultPayload = {
        recommendedCrop: advisory.recommended_crop,
        expectedYield: advisory.expected_yield,
        estimatedProfit: advisory.estimated_profit,
        topCrops: advisory.top_crops || [
          { crop_name: advisory.recommended_crop, expected_yield: advisory.expected_yield, estimated_profit: advisory.estimated_profit }
        ],
        inputs: { ...payload, soil_source: advisory.soil_source, weather_source: advisory.weather_source },
        land_size: landAcres,
      };
      navigate("/results", {
        state: {
          data: resultPayload,
          inputSummary: previewData
        }
      });
    } catch (err) {
      setError(err?.message || "Unable to fetch recommendations. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToForm = () => {
    setStep("form");
    setPreviewData(null);
    setError("");
  };

  if (step === "confirm" && previewData) {
    const w = previewData.weather || {};
    const s = previewData.soil || {};
    const soilSrc = previewData.soil_source === "manual" ? t("sourceManual") : t("sourceAuto");
    const weatherSrc = previewData.weather_source === "farmer" ? t("sourceFarmer") : t("sourceApi");
    return (
      <div className="animate-fade-in flex w-full items-start justify-center">
        <div className="w-full max-w-3xl space-y-6">
          {/* Header */}
          <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-white p-6 shadow-sm ring-1 ring-emerald-100/60 md:p-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              {t("confirmationTitle")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              {t("confirmationDesc")}
            </p>
          </div>

          {/* Data cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-gray-100">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">📍 {t("location")}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{previewData.location}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-sky-100">
              <p className="text-[11px] font-bold uppercase tracking-wider text-sky-500">🌤️ {t("weatherUsed")}</p>
              <p className="mt-2 text-sm text-slate-800">
                🌡️ {w.temperature}°C &nbsp; 💧 {w.humidity}% &nbsp; 🌧️ {w.rainfall}mm
              </p>
              <p className="mt-1 text-[10px] text-gray-500">({weatherSrc})</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-amber-100">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500">🧪 {t("soilUsed")}</p>
              <p className="mt-2 text-sm text-slate-800">
                N:{s.N} &nbsp; P:{s.P} &nbsp; K:{s.K} &nbsp; pH:{s.ph}
              </p>
              <p className="mt-1 text-[10px] text-gray-500">({soilSrc})</p>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm">
              <span className="font-medium">Error:</span> {error}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className="inline-flex items-center rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  {t("analyzing")}
                </span>
              ) : (
                <>✅ {t("confirmAndGetRec")}</>
              )}
            </button>
            <button
              type="button"
              onClick={handleBackToForm}
              disabled={isLoading}
              className="inline-flex items-center rounded-2xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              ← {t("back")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex w-full items-start justify-center">
      <div className="w-full max-w-3xl space-y-6">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-white p-6 shadow-sm ring-1 ring-emerald-100/60 md:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            {t("cropTitle")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base leading-relaxed">
            {t("cropDesc")}
          </p>
          <div className="mt-4 rounded-xl bg-emerald-100/60 px-4 py-3 text-xs ring-1 ring-emerald-200/50">
            <h2 className="text-sm font-semibold text-emerald-900">{t("advisoryTitle")}</h2>
            <p className="mt-1 text-[11px] text-emerald-800 leading-relaxed">
              {t("advisoryDesc")}
            </p>
          </div>
        </div>

        <form
          onSubmit={handlePreview}
          className="space-y-5 rounded-2xl bg-white p-5 shadow-md ring-1 ring-gray-100 md:p-6"
        >
          <div className="space-y-1">
            <label
              htmlFor="location"
              className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-600"
            >
              {t("location")}
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                {t("fieldRequired")}
              </span>
            </label>
            <input
              id="location"
              name="location"
              type="text"
              value={form.location}
              onChange={handleChange}
              placeholder="Village / district / region"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              required
            />
            <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-gray-600">
              <p>Type a name, use GPS, or drop a pin on the map.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  disabled={isListening}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-medium shadow-sm transition ${
                    isListening
                      ? "border-red-200 bg-red-50 text-red-600 animate-pulse"
                      : "border-purple-100 bg-white text-purple-700 hover:bg-purple-50"
                  }`}
                >
                  {isListening ? "🔴 Listening..." : "🎤 Voice"}
                </button>
                <button
                  type="button"
                  onClick={handleUseGps}
                  disabled={usingGps}
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-white px-3 py-1 text-[11px] font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-emerald-400"
                >
                  {usingGps ? t("detecting") : t("gps")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowMap((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-full border border-sky-100 bg-white px-3 py-1 text-[11px] font-medium text-sky-700 shadow-sm transition hover:bg-sky-50"
                >
                  {showMap ? "✕ Hide Map" : "🗺️ Pick on Map"}
                </button>
              </div>
            </div>

            {/* Map picker */}
            {showMap && (
              <div className="mt-2 animate-slide-up">
                <Suspense fallback={
                  <div className="flex h-64 items-center justify-center rounded-2xl bg-gray-50 text-sm text-gray-500">
                    Loading map...
                  </div>
                }>
                  <MapPicker
                    onLocationSelect={handleMapSelect}
                    initialLat={mapCoords?.lat}
                    initialLng={mapCoords?.lng}
                  />
                </Suspense>
              </div>
            )}

            {gpsMessage && (
              <p className="mt-1.5 rounded-lg bg-emerald-50 px-2 py-1.5 text-[11px] text-emerald-800">
                <span className="font-medium">{t("locationDetected")}:</span> {gpsMessage}. {t("confirmLocationOk")}
              </p>
            )}
          </div>

          <p className="border-t border-gray-200 pt-4 text-xs font-medium text-gray-500">
            {t("optionalDetailsHeading")}
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label
                htmlFor="previous_crop"
                className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-600"
              >
                {t("previousCrop")}
                <span className="text-[10px] font-normal normal-case text-gray-400">({t("fieldOptional")})</span>
              </label>
              <select
                id="previous_crop"
                name="previous_crop"
                value={form.previous_crop}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Select previous crop</option>
                <option value="Rice">Rice</option>
                <option value="Wheat">Wheat</option>
                <option value="Cotton">Cotton</option>
                <option value="Maize">Maize</option>
                <option value="Pulses">Pulses</option>
                <option value="None">None</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="land_size"
                className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-600"
              >
                {t("landArea")}
                <span className="text-[10px] font-normal normal-case text-gray-400">({t("fieldOptional")})</span>
              </label>
              <input
                id="land_size"
                name="land_size"
                type="number"
                min="0"
                step="0.1"
                value={form.land_size}
                onChange={handleChange}
                placeholder="e.g. 2.5"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label
                htmlFor="irrigation_type"
                className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-600"
              >
                {t("irrigation")}
                <span className="text-[10px] font-normal normal-case text-gray-400">({t("fieldOptional")})</span>
              </label>
              <select
                id="irrigation_type"
                name="irrigation_type"
                value={form.irrigation_type}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Select irrigation</option>
                <option value="Rainfed">Rainfed</option>
                <option value="Canal Irrigation">Canal Irrigation</option>
                <option value="Drip Irrigation">Drip Irrigation</option>
                <option value="Borewell">Borewell</option>
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="goal"
                className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-600"
              >
                {t("goal")}
                <span className="text-[10px] font-normal normal-case text-gray-400">({t("fieldOptional")})</span>
              </label>
              <select
                id="goal"
                name="goal"
                value={form.goal}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Select goal</option>
                <option value="Maximum Profit">Maximum Profit</option>
                <option value="Soil Sustainability">Soil Sustainability</option>
                <option value="Low Risk Crop">Low Risk Crop</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label
                htmlFor="temperature"
                className="text-xs font-medium uppercase tracking-wide text-slate-600"
              >
                {t("temperatureOpt")}
              </label>
              <select
                id="temperature"
                name="temperature"
                value={form.temperature}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Auto-detect</option>
                <option value="Cool">Cool (&lt; 20°C)</option>
                <option value="Moderate">Moderate (20–30°C)</option>
                <option value="Hot">Hot (&gt; 30°C)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="humidity"
                className="text-xs font-medium uppercase tracking-wide text-slate-600"
              >
                {t("humidityOpt")}
              </label>
              <select
                id="humidity"
                name="humidity"
                value={form.humidity}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Auto-detect</option>
                <option value="Low">Low (&lt; 40%)</option>
                <option value="Medium">Medium (40–70%)</option>
                <option value="High">High (&gt; 70%)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="rainfall"
                className="text-xs font-medium uppercase tracking-wide text-slate-600"
              >
                {t("rainfallOpt")}
              </label>
              <select
                id="rainfall"
                name="rainfall"
                value={form.rainfall}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Auto-detect</option>
                <option value="Low">Low (&lt; 500 mm/year)</option>
                <option value="Medium">Medium (500–1000 mm/year)</option>
                <option value="High">High (&gt; 1000 mm/year)</option>
              </select>
            </div>
          </div>

          <p className="text-[11px] text-gray-500">
            {t("autoDetectHint")}
          </p>

          {/* Additional Information: N, P, K, pH (optional soil test) */}
          <div className="space-y-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={() => setShowAdditionalInfo((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100"
            >
              {showAdditionalInfo ? t("hide") : (t("additionalInfoHeading") || t("additionalInfo"))}
              <span className="text-emerald-600">{showAdditionalInfo ? "▲" : "▼"}</span>
            </button>
            {showAdditionalInfo && (
              <div className="grid gap-4 rounded-xl bg-gray-100/80 p-4 md:grid-cols-4">
                <div className="space-y-1">
                  <label htmlFor="N" className="text-xs font-medium uppercase tracking-wide text-slate-600">Nitrogen (N)</label>
                  <input
                    id="N"
                    name="N"
                    type="number"
                    inputMode="decimal"
                    value={form.N}
                    onChange={handleChange}
                    placeholder="e.g. 90"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="P" className="text-xs font-medium uppercase tracking-wide text-slate-600">Phosphorus (P)</label>
                  <input
                    id="P"
                    name="P"
                    type="number"
                    inputMode="decimal"
                    value={form.P}
                    onChange={handleChange}
                    placeholder="e.g. 42"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="K" className="text-xs font-medium uppercase tracking-wide text-slate-600">Potassium (K)</label>
                  <input
                    id="K"
                    name="K"
                    type="number"
                    inputMode="decimal"
                    value={form.K}
                    onChange={handleChange}
                    placeholder="e.g. 30"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="ph" className="text-xs font-medium uppercase tracking-wide text-slate-600">pH</label>
                  <input
                    id="ph"
                    name="ph"
                    type="number"
                    step="0.1"
                    min="0"
                    max="14"
                    inputMode="decimal"
                    value={form.ph}
                    onChange={handleChange}
                    placeholder="e.g. 6.5"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>
            )}
            {showAdditionalInfo && (
              <p className="text-[11px] text-gray-500">
                {t("optionalSoilHint")}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-300 disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  {t("previewing")}
                </span>
              ) : (
                <>🔍 {t("getPreview")}</>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}
      </div>
    </div>
  );
}

