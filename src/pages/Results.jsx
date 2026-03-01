import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import ResultCard from "../components/ResultCard.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";

const MEDAL = ["🥇", "🥈", "🥉"];
const RANK_BORDER = [
  "ring-2 ring-emerald-400 shadow-lg shadow-emerald-100",
  "ring-1 ring-amber-200",
  "ring-1 ring-gray-200"
];

// Crop emoji map — covers the 40 crops in the model
const CROP_ICON = {
  rice: "🌾", wheat: "🌾", maize: "🌽", corn: "🌽",
  cotton: "☁️", jute: "🧵", sugarcane: "🍬",
  coffee: "☕", tea: "🍵",
  banana: "🍌", mango: "🥭", grapes: "🍇", apple: "🍎",
  orange: "🍊", papaya: "🏝️", pomegranate: "🫐", watermelon: "🍉",
  muskmelon: "🍈", coconut: "🥥", lentil: "🫘",
  chickpea: "🫛", pigeonpeas: "🫛", kidneybeans: "🫘",
  mothbeans: "🫘", mungbean: "🫛", blackgram: "🫘",
  potato: "🥔", tomato: "🍅", onion: "🧅",
  garlic: "🧄", ginger: "🫚", chilli: "🌶️", pepper: "🌶️",
  turmeric: "🟡", groundnut: "🥜", peanut: "🥜",
  soybean: "🫘", sunflower: "🌻", mustard: "🟡",
  tobacco: "🍂", rubber: "🌳",
  default: "🌱"
};

function getCropIcon(name) {
  if (!name) return CROP_ICON.default;
  const key = name.toLowerCase().trim();
  return CROP_ICON[key] || CROP_ICON.default;
}

// Sowing and harvesting month data for popular crops (Indian context)
const CROP_CALENDAR = {
  rice: { sow: "Jun–Jul", harvest: "Oct–Nov", season: "Kharif" },
  wheat: { sow: "Oct–Nov", harvest: "Mar–Apr", season: "Rabi" },
  maize: { sow: "Jun–Jul", harvest: "Sep–Oct", season: "Kharif" },
  corn: { sow: "Jun–Jul", harvest: "Sep–Oct", season: "Kharif" },
  cotton: { sow: "Apr–May", harvest: "Oct–Dec", season: "Kharif" },
  jute: { sow: "Mar–May", harvest: "Jul–Sep", season: "Kharif" },
  sugarcane: { sow: "Feb–Mar", harvest: "Dec–Mar", season: "Annual" },
  coffee: { sow: "Jun–Jul", harvest: "Nov–Feb", season: "Perennial" },
  banana: { sow: "Feb–Mar", harvest: "Year-round", season: "Perennial" },
  mango: { sow: "Jul–Aug", harvest: "Apr–Jun", season: "Perennial" },
  grapes: { sow: "Jan–Feb", harvest: "Mar–May", season: "Perennial" },
  apple: { sow: "Dec–Feb", harvest: "Aug–Oct", season: "Perennial" },
  orange: { sow: "Jul–Aug", harvest: "Nov–Mar", season: "Perennial" },
  papaya: { sow: "Sep–Oct", harvest: "Year-round", season: "Perennial" },
  pomegranate: { sow: "Jun–Jul", harvest: "Nov–Feb", season: "Perennial" },
  watermelon: { sow: "Feb–Mar", harvest: "May–Jun", season: "Zaid" },
  muskmelon: { sow: "Feb–Mar", harvest: "May–Jun", season: "Zaid" },
  coconut: { sow: "Jun–Sep", harvest: "Year-round", season: "Perennial" },
  lentil: { sow: "Oct–Nov", harvest: "Feb–Mar", season: "Rabi" },
  chickpea: { sow: "Oct–Nov", harvest: "Feb–Mar", season: "Rabi" },
  pigeonpeas: { sow: "Jun–Jul", harvest: "Dec–Feb", season: "Kharif" },
  kidneybeans: { sow: "Jun–Jul", harvest: "Sep–Oct", season: "Kharif" },
  mothbeans: { sow: "Jul–Aug", harvest: "Oct–Nov", season: "Kharif" },
  mungbean: { sow: "Mar–Apr", harvest: "Jun–Jul", season: "Zaid" },
  blackgram: { sow: "Jun–Jul", harvest: "Sep–Oct", season: "Kharif" },
  potato: { sow: "Oct–Nov", harvest: "Jan–Mar", season: "Rabi" },
  tomato: { sow: "Jun–Jul", harvest: "Sep–Oct", season: "Kharif/Rabi" },
  onion: { sow: "Oct–Nov", harvest: "Feb–Mar", season: "Rabi" },
  garlic: { sow: "Oct–Nov", harvest: "Feb–Mar", season: "Rabi" },
  ginger: { sow: "Mar–Apr", harvest: "Dec–Jan", season: "Kharif" },
  chilli: { sow: "Jun–Jul", harvest: "Oct–Dec", season: "Kharif" },
  turmeric: { sow: "May–Jun", harvest: "Jan–Feb", season: "Kharif" },
  groundnut: { sow: "Jun–Jul", harvest: "Oct–Nov", season: "Kharif" },
  soybean: { sow: "Jun–Jul", harvest: "Oct–Nov", season: "Kharif" },
  sunflower: { sow: "Jan–Feb", harvest: "Apr–May", season: "Rabi" },
  mustard: { sow: "Oct–Nov", harvest: "Feb–Mar", season: "Rabi" },
  tobacco: { sow: "Aug–Sep", harvest: "Feb–Mar", season: "Rabi" },
  rubber: { sow: "Jun–Jul", harvest: "Year-round", season: "Perennial" },
};

function getCropCalendar(name) {
  if (!name) return null;
  return CROP_CALENDAR[name.toLowerCase().trim()] || null;
}

function saveToHistory(type, summary) {
  try {
    const history = JSON.parse(localStorage.getItem("agrisense_history") || "[]");
    history.unshift({ type, summary, date: new Date().toISOString() });
    // Keep max 20 entries
    localStorage.setItem("agrisense_history", JSON.stringify(history.slice(0, 20)));
  } catch { /* ignore */ }
}

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const state = location.state || null;
  const data = state?.data;
  const inputSummary = state?.inputSummary || null;

  if (!data) {
    return (
      <div className="animate-fade-in flex w-full items-center justify-center">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-lg ring-1 ring-gray-100">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">📊</div>
          <h1 className="text-xl font-bold text-slate-900">{t("noResultsTitle")}</h1>
          <p className="mt-2 text-sm text-gray-600">{t("noResultsDesc")}</p>
          <button
            type="button"
            onClick={() => navigate("/crop-recommendation")}
            className="mt-5 inline-flex items-center rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            {t("analyzeCrop")}
          </button>
        </div>
      </div>
    );
  }

  const { recommendedCrop, expectedYield, estimatedProfit, topCrops, inputs, land_size } = data;
  const crops = Array.isArray(topCrops) && topCrops.length > 0
    ? topCrops
    : [{ crop_name: recommendedCrop, expected_yield: expectedYield, estimated_profit: estimatedProfit }];

  // Save to history once
  const saved = useRef(false);
  useEffect(() => {
    if (!saved.current && data) {
      saved.current = true;
      saveToHistory("crop", {
        crop: crops[0]?.crop_name || recommendedCrop,
        location: inputSummary?.location || inputs?.location || "—",
        profit: crops[0]?.estimated_profit,
      });
    }
  }, [data]);

  // Share results (Web Share API)
  const handleShare = async () => {
    const text = crops
      .map((c, i) => `${i + 1}. ${c.crop_name} — Yield: ${c.expected_yield} t/ha, Profit: ₹${Number(c.estimated_profit).toLocaleString()}/ha`)
      .join("\n");
    const shareData = {
      title: "AgriSense AI — Crop Recommendation",
      text: `Crop Recommendations for ${inputSummary?.location || "your farm"}:\n${text}`,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* cancelled */ }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareData.text);
        alert("Results copied to clipboard!");
      } catch { /* ignore */ }
    }
  };

  // Print / PDF download
  const handleDownloadPdf = () => {
    window.print();
  };

  // land_size in acres → hectares (1 acre ≈ 0.4047 ha)
  const landAcres = typeof land_size === "number" && land_size > 0 ? land_size : null;
  const landHectares = landAcres ? landAcres * 0.4047 : null;

  const ph = typeof inputs?.ph === "number" ? inputs.ph : Number(inputs?.ph);
  const rainfall =
    typeof inputSummary?.weather?.rainfall === "number"
      ? inputSummary.weather.rainfall
      : typeof data.rainfall === "number"
        ? data.rainfall
        : 120;

  let sustainability = "Low";
  let sustainIcon = "🔴";
  let sustainColor = "text-red-600 bg-red-50 ring-red-100";
  if (ph >= 6 && ph <= 7 && rainfall > 100) {
    sustainability = "High";
    sustainIcon = "🟢";
    sustainColor = "text-emerald-700 bg-emerald-50 ring-emerald-100";
  } else if (rainfall > 80) {
    sustainability = "Moderate";
    sustainIcon = "🟡";
    sustainColor = "text-amber-700 bg-amber-50 ring-amber-100";
  }

  return (
    <div className="animate-fade-in w-full space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-white p-6 shadow-sm ring-1 ring-emerald-100/60 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          {t("resultsTitle")}
        </h1>
        <p className="mt-2 text-sm text-gray-600 md:text-base">{t("resultsDesc")}</p>
      </div>

      {/* Input Summary */}
      {inputSummary && (
        <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-gray-100 md:p-6">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500">{t("yourInputSection")}</h2>
          <div className="grid gap-4 text-sm sm:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{t("location")}</p>
              <p className="mt-1 font-medium text-slate-800">📍 {inputSummary.location}</p>
            </div>
            {inputSummary.weather && (
              <div className="rounded-xl bg-sky-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-500">{t("weatherUsed")}</p>
                <p className="mt-1 text-slate-800">
                  🌡️ {inputSummary.weather.temperature}°C &nbsp; 💧 {inputSummary.weather.humidity}% &nbsp; 🌧️ {inputSummary.weather.rainfall}mm
                </p>
                <p className="mt-0.5 text-[10px] text-gray-500">
                  {inputSummary.weather_source === "farmer" ? t("sourceFarmer") : t("sourceApi")}
                </p>
              </div>
            )}
            {inputSummary.soil && (
              <div className="rounded-xl bg-amber-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">{t("soilUsed")}</p>
                <p className="mt-1 text-slate-800">
                  N:{inputSummary.soil.N} &nbsp; P:{inputSummary.soil.P} &nbsp; K:{inputSummary.soil.K} &nbsp; pH:{inputSummary.soil.ph}
                </p>
                <p className="mt-0.5 text-[10px] text-gray-500">
                  {inputSummary.soil_source === "manual" ? t("sourceManual") : t("sourceAuto")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Recommendations */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-slate-900">{t("topRecommendations")}</h2>
        <div className="grid gap-5 sm:grid-cols-1 md:grid-cols-3">
          {crops.map((crop, index) => (
            <div
              key={crop.crop_name + index}
              className={`animate-slide-up stagger-${index + 1} relative overflow-hidden rounded-2xl bg-white p-5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${RANK_BORDER[index] || "ring-1 ring-gray-100"}`}
            >
              {/* Medal badge */}
              <div className="mb-3 flex items-center gap-2">
                <span className="text-2xl">{MEDAL[index] || `#${index + 1}`}</span>
                {index === 0 && (
                  <span className="rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {t("highlyRecommended")}
                  </span>
                )}
              </div>

              <p className="text-xl font-bold text-slate-900">
                <span className="mr-1.5">{getCropIcon(crop.crop_name)}</span>
                {crop.crop_name || "—"}
              </p>

              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                  <dt className="text-xs text-gray-500">{t("expectedYield")}</dt>
                  <dd className="font-semibold text-slate-800">
                    {crop.expected_yield != null ? `${crop.expected_yield} t/ha` : "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                  <dt className="text-xs text-emerald-600">{t("estimatedProfit")}</dt>
                  <dd className="font-bold text-emerald-700">
                    {crop.estimated_profit != null ? `₹${Number(crop.estimated_profit).toLocaleString()}` : "—"}
                    <span className="ml-1 text-[10px] font-normal text-gray-500">/ha</span>
                  </dd>
                </div>
                {landHectares && crop.expected_yield != null && (
                  <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-sky-50 px-3 py-2.5 ring-1 ring-emerald-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t("forYourLand")} ({landAcres} acres / {landHectares.toFixed(1)} ha)</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-xs text-gray-600">{t("totalYield")}</span>
                      <span className="font-bold text-slate-800">{(crop.expected_yield * landHectares).toFixed(1)} t</span>
                    </div>
                    {crop.estimated_profit != null && (
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-xs text-gray-600">{t("totalProfit")}</span>
                        <span className="font-bold text-emerald-700">₹{Math.round(crop.estimated_profit * landHectares).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}
              </dl>

              <p className="mt-3 text-[11px] text-gray-500">
                {index === 0 ? "Best match for your soil and weather." : "Strong alternative for your conditions."}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Sustainability */}
      <div className={`flex items-center gap-4 rounded-2xl p-5 ring-1 ${sustainColor}`}>
        <span className="text-3xl">{sustainIcon}</span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{t("sustainability")}</p>
          <p className="text-lg font-bold">{sustainability}</p>
          <p className="mt-1 text-xs text-gray-600">
            Based on soil pH ({isNaN(ph) ? "—" : ph.toFixed(1)}) and rainfall ({rainfall} mm).
          </p>
        </div>
      </div>

      {/* Crop Calendar */}
      {crops.some((c) => getCropCalendar(c.crop_name)) && (
        <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-gray-100 md:p-6">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500">📅 {t("cropCalendar") || "Crop Calendar"}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {crops.map((crop) => {
              const cal = getCropCalendar(crop.crop_name);
              if (!cal) return null;
              return (
                <div key={crop.crop_name + "-cal"} className="rounded-xl bg-gradient-to-br from-emerald-50 to-sky-50 p-4 ring-1 ring-emerald-100">
                  <p className="text-sm font-bold text-slate-900">
                    {getCropIcon(crop.crop_name)} {crop.crop_name}
                  </p>
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Season</span>
                      <span className="font-semibold text-emerald-700">{cal.season}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">🌱 Sowing</span>
                      <span className="font-medium text-slate-800">{cal.sow}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">🌾 Harvest</span>
                      <span className="font-medium text-slate-800">{cal.harvest}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => navigate("/crop-recommendation")}
          className="inline-flex items-center rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:-translate-y-0.5 hover:shadow-xl"
        >
          🔄 {t("analyzeAgain")}
        </button>
        <button
          type="button"
          onClick={handleDownloadPdf}
          className="inline-flex items-center rounded-2xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:shadow-md print:hidden"
        >
          📄 {t("downloadPdf") || "Download PDF"}
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center rounded-2xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:shadow-md print:hidden"
        >
          📤 {t("shareResults") || "Share"}
        </button>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="inline-flex items-center rounded-2xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          {t("backHome")}
        </button>
      </div>
    </div>
  );
}

