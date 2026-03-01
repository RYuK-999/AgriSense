import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nProvider.jsx";

export default function Startup() {
  const { t } = useI18n();
  return (
    <div className="animate-fade-in w-full">
      {/* Hero */}
      <section className="pt-4 pb-14 md:pt-2">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
          {/* Left content */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200/60">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-xs text-white shadow-sm">
                🌿
              </span>
              <span>{t("startupBadge")}</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-extrabold leading-tight text-gray-900 md:text-4xl lg:text-5xl">
                {t("startupTitlePrefix")}{" "}
                <span className="bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                  {t("startupTitleHighlight")}
                </span>
              </h1>
              <p className="max-w-lg text-sm leading-relaxed text-gray-600 md:text-base">
                {t("startupDesc")}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-300"
              >
                {t("getStarted")}
                <span className="ml-2 text-lg">→</span>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center rounded-2xl border-2 border-green-500/30 px-6 py-3 text-sm font-semibold text-green-700 transition hover:border-green-500/60 hover:bg-green-50"
              >
                {t("learnMore")}
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-5 pt-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700">✓</span>
                <span>{t("noComplexSoil")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700">✓</span>
                <span>{t("localLanguage")}</span>
              </div>
            </div>
          </div>

          {/* Right visual */}
          <div className="relative">
            <div className="overflow-hidden rounded-3xl shadow-2xl ring-1 ring-black/5">
              <img
                src="https://images.unsplash.com/photo-1725308283640-cf46e178bd02?auto=format&fit=crop&w=1000&q=80"
                alt="Green agricultural field"
                className="h-72 w-full object-cover md:h-[400px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </div>
            {/* Floating stat card */}
            <div className="absolute -bottom-4 -left-4 rounded-2xl bg-white/90 px-4 py-3 shadow-lg ring-1 ring-gray-100 backdrop-blur-sm md:-bottom-6 md:-left-6">
              <p className="text-2xl font-bold text-emerald-600">40+</p>
              <p className="text-[11px] text-gray-500">Crop varieties analyzed</p>
            </div>
          </div>
        </div>
      </section>

      {/* Three pillars */}
      <section className="border-t border-gray-100 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">{t("pillarsTitle")}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-gray-600 md:text-base">{t("pillarsDesc")}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: "🌱", title: t("soilIntel"), desc: t("soilIntelDesc"), border: "hover:ring-emerald-300", bg: "bg-amber-100" },
              { icon: "☁️", title: t("weather"), desc: t("weatherDesc"), border: "hover:ring-sky-300", bg: "bg-sky-100" },
              { icon: "📈", title: t("market"), desc: t("marketDesc"), border: "hover:ring-emerald-300", bg: "bg-emerald-100" }
            ].map((item) => (
              <div
                key={item.title}
                className={`group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${item.border}`}
              >
                <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${item.bg} text-2xl transition-transform duration-300 group-hover:scale-110`}>
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-gradient-to-b from-green-50/60 to-white py-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">{t("howTitle")}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-gray-600 md:text-base">{t("howDesc")}</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              { num: "1", title: t("step1"), desc: t("step1Desc") },
              { num: "2", title: t("step2"), desc: t("step2Desc") },
              { num: "3", title: t("step3"), desc: t("step3Desc") }
            ].map((step) => (
              <div key={step.num} className="text-center">
                <div className="relative mx-auto inline-flex">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600 text-xl font-bold text-white shadow-lg shadow-emerald-200">
                    {step.num}
                  </div>
                </div>
                <h3 className="mt-5 text-lg font-bold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="pb-4 pt-2">
        <div className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-green-600 to-emerald-500 p-10 text-center text-white shadow-xl md:p-14">
            <div className="pointer-events-none absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-24 w-24 -translate-x-1/2 rounded-full bg-white/5" />

            <div className="relative space-y-5">
              <h2 className="text-2xl font-extrabold md:text-3xl">{t("ctaTitle")}</h2>
              <p className="mx-auto max-w-xl text-sm text-emerald-50 md:text-base leading-relaxed">{t("ctaDesc")}</p>
              <Link
                to="/login"
                className="inline-flex items-center rounded-2xl bg-white px-8 py-3.5 text-sm font-semibold text-emerald-700 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-50 hover:shadow-xl"
              >
                {t("startJourney")}
                <span className="ml-2 text-lg">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

