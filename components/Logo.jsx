export default function Logo({ className = "h-10 w-auto", withTagline = false }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <path
          d="M50 6 L92 40 V94 H70 V58 L50 42 L30 58 V94 H8 V40 Z"
          className="fill-navy dark:fill-white transition-colors"
        />
        <rect x="46" y="70" width="8" height="16" rx="2" className="fill-slate-100 dark:fill-slate-900 transition-colors" />
      </svg>
      <div className="leading-none">
        <div className="font-heading text-xl font-extrabold tracking-tight">
          <span className="text-navy dark:text-white transition-colors">MÜLK</span>
          <span className="text-copper dark:text-amber-500 font-black">ERA</span>
        </div>
        <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-navy/70 dark:text-slate-300">
          Əmlak Satışı Agentliyi
        </div>
        {withTagline && (
          <div className="mt-1 text-xs font-medium text-navy/60 dark:text-slate-400">Sizin eranız, sizin mülkünüz.</div>
        )}
      </div>
    </div>
  );
}
