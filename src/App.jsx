import { useEffect, useState } from "react";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate
} from "react-router-dom";
import Startup from "./pages/Startup.jsx";
import Home from "./pages/Home.jsx";
import CropForm from "./pages/CropForm.jsx";
import Results from "./pages/Results.jsx";
import DiseaseDetection from "./pages/DiseaseDetection.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import { useI18n } from "./i18n/I18nProvider.jsx";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang, setLanguage, languages } = useI18n();

  const isPublicPage = ["/", "/login", "/signup"].includes(location.pathname);
  const isAuthPage = ["/login", "/signup"].includes(location.pathname);
  const showMainNav = !isPublicPage;
  const isAuthed = localStorage.getItem("agrisense_authed") === "1";
  const isProtectedRoute = !isPublicPage;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (!isAuthed && isProtectedRoute) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100/80 bg-white/80 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          {/* Logo */}
          <NavLink to={isAuthed ? "/home" : "/"} className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-emerald-50 ring-2 ring-emerald-100 transition group-hover:ring-emerald-200">
              <img src="/logo.png" alt="AgriSense AI logo" className="h-9 w-9 object-contain" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold tracking-tight text-slate-900">{t("appName")}</p>
              <p className="text-[10px] text-gray-500 leading-none">Intelligent Crop Advisory</p>
            </div>
          </NavLink>

          {/* Desktop Nav */}
          {showMainNav && (
            <nav className="hidden md:flex items-center gap-1">
              {[
                { to: "/home", label: t("navHome"), icon: "🏠" },
                { to: "/crop-recommendation", label: t("navCrop"), icon: "🌾" },
                { to: "/disease-detection", label: t("navDisease"), icon: "🔬" },
              ].map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100"
                        : "text-gray-600 hover:bg-gray-50 hover:text-emerald-700"
                    }`
                  }
                >
                  <span className="text-xs">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {showMainNav ? (
              <UserMenu
                onLogout={() => {
                  localStorage.removeItem("agrisense_authed");
                  navigate("/login");
                }}
                lang={lang}
                setLanguage={setLanguage}
                languages={languages}
                t={t}
              />
            ) : (
              <select
                value={lang}
                onChange={(e) => setLanguage(e.target.value)}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-700 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            )}

            {/* Mobile hamburger */}
            {showMainNav && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                className="inline-flex md:hidden items-center justify-center rounded-lg p-2 text-gray-600 hover:bg-gray-100 transition"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {showMainNav && mobileMenuOpen && (
          <div className="md:hidden animate-fade-in border-t border-gray-100 bg-white px-4 pb-4 pt-2">
            <nav className="flex flex-col gap-1">
              {[
                { to: "/home", label: t("navHome"), icon: "🏠" },
                { to: "/crop-recommendation", label: t("navCrop"), icon: "🌾" },
                { to: "/disease-detection", label: t("navDisease"), icon: "🔬" },
              ].map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition ${
                      isActive ? "bg-emerald-50 text-emerald-700" : "text-gray-600 hover:bg-gray-50"
                    }`
                  }
                >
                  <span>{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main
        className={
          isAuthPage
            ? "flex w-full flex-1 items-center justify-center px-4 py-10 md:py-14"
            : "mx-auto flex w-full max-w-6xl flex-1 px-4 py-8 md:px-6 md:py-10"
        }
      >
        <Routes>
          <Route path="/" element={<Startup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/home" element={<Home />} />
          <Route path="/crop-recommendation" element={<CropForm />} />
          <Route path="/results" element={<Results />} />
          <Route path="/disease-detection" element={<DiseaseDetection />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white/60 glass">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 text-[11px] text-gray-400 md:px-6">
          <p>© {new Date().getFullYear()} {t("appName")}</p>
          <p className="hidden sm:block">Built for SDG Hackathon</p>
        </div>
      </footer>
    </div>
  );
}

/* ---- User Menu ---- */
function UserMenu({ onLogout, lang, setLanguage, languages, t }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      const el = document.getElementById("user-menu-root");
      if (el && !el.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <div id="user-menu-root" className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2.5 py-1.5 text-sm shadow-sm transition hover:bg-gray-50 hover:shadow-md"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-xs font-bold">
          U
        </span>
        <span className="hidden text-xs font-medium text-gray-700 sm:inline">User</span>
        <svg className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="animate-fade-in absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
          <div className="border-b border-gray-100 px-4 py-3 bg-gradient-to-r from-emerald-50 to-white">
            <p className="text-sm font-semibold text-gray-900">User</p>
            <p className="text-[11px] text-gray-500">{t("userMenuProfile")}</p>
          </div>
          <div className="px-4 py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{t("userMenuLanguage")}</p>
            <select
              value={lang}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
          <div className="border-t border-gray-100 p-2">
            <button
              type="button"
              onClick={onLogout}
              className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
            >
              {t("logout")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
