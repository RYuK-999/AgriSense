// Feature card with subtle hover animation and icon
export default function FeatureCard({ icon, title, description }) {
  return (
    <div className="group flex flex-col rounded-2xl bg-white p-5 shadow-md ring-1 ring-gray-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-emerald-100">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 transition group-hover:from-emerald-100 group-hover:to-emerald-200">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <p className="text-xs leading-relaxed text-gray-600">{description}</p>
    </div>
  );
}

