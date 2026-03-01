import { Link, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/I18nProvider.jsx";

export default function Signup() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem("agrisense_authed", "1");
    navigate("/home");
  };

  return (
    <div className="animate-fade-in flex w-full items-center justify-center">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-gray-100">
        <div className="h-2 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600" />

        <div className="p-7 md:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100">
              <span className="text-2xl">🌱</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {t("signupTitle")}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {t("signupDesc")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                {t("fullName")}
              </label>
              <input
                id="name"
                type="text"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                placeholder="Farmer name"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                {t("email")}
              </label>
              <input
                id="email"
                type="email"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                {t("password")}
              </label>
              <input
                id="password"
                type="password"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-300"
            >
              {t("signup")}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-gray-500">
            {t("alreadyHave")}{" "}
            <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700 transition">
              {t("login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

