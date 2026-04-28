import { WARDS, CATEGORIES, URGENCY_LEVELS, SORT_OPTIONS } from "../../data/mockNeeds";
import { getUrgencyConfig } from "../../utils/urgency";

const selectClass = `
  text-sm bg-slate-800/80 border border-slate-700
  text-slate-300 px-3 py-2 rounded-xl
  focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500
  cursor-pointer font-medium
  hover:border-slate-500 hover:bg-slate-700/80
  transition-all duration-150
`;

const PILL_ACTIVE = {
  All:      "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-900/50",
  critical: "bg-red-600 text-white border-red-500 shadow-lg shadow-red-900/50",
  high:     "bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-900/50",
  medium:   "bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-900/50",
};

const PILL_INACTIVE = {
  All:      "bg-slate-800/60 text-slate-400 border-slate-700 hover:border-indigo-500 hover:text-indigo-300 hover:bg-indigo-900/30",
  critical: "bg-slate-800/60 text-red-400 border-slate-700 hover:border-red-600 hover:bg-red-900/30",
  high:     "bg-slate-800/60 text-amber-400 border-slate-700 hover:border-amber-600 hover:bg-amber-900/30",
  medium:   "bg-slate-800/60 text-emerald-400 border-slate-700 hover:border-emerald-600 hover:bg-emerald-900/30",
};

export default function FilterBar({ filters, onChange }) {
  const { ward, category, urgency, sortBy } = filters;

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex flex-wrap items-center gap-3 sticky top-0 z-10">

      <div className="flex items-center gap-2">
        <select className={selectClass} value={ward}
          onChange={e => onChange({ ...filters, ward: e.target.value })}>
          {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
        <select className={selectClass} value={category}
          onChange={e => onChange({ ...filters, category: e.target.value })}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="h-6 w-px bg-slate-700" />

      <div className="flex items-center gap-1.5">
        {URGENCY_LEVELS.map(level => {
          const isActive = urgency === level;
          const cfg = level !== "All" ? getUrgencyConfig(level) : null;
          return (
            <button
              key={level}
              onClick={() => onChange({ ...filters, urgency: level })}
              className={`
                px-4 py-1.5 text-xs font-bold rounded-full border
                tracking-wide uppercase
                transition-all duration-200 active:scale-95
                ${isActive ? PILL_ACTIVE[level] : PILL_INACTIVE[level]}
              `}
            >
              {level === "All" ? "All" : cfg.label}
            </button>
          );
        })}
      </div>

      <div className="h-6 w-px bg-slate-700" />

      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Sort</span>
        <select className={selectClass} value={sortBy}
          onChange={e => onChange({ ...filters, sortBy: e.target.value })}>
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

    </div>
  );
}