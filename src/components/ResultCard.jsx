// Result card component with gradient accent
export default function ResultCard({ title, children, accent }) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-gray-100 transition-all duration-300 hover:shadow-lg">
      {title && (
        <div className="border-b border-gray-100 bg-gradient-to-r from-emerald-50/60 to-white px-6 py-3">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        </div>
      )}
      <div className={`${title ? "px-6 py-4" : "p-6"} text-sm text-gray-700`}>
        {children}
      </div>
    </section>
  );
}
