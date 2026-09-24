export default function Logo({ className = "h-10 w-auto", withTagline = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <path
          d="M50 6 L92 40 V94 H70 V58 L50 42 L30 58 V94 H8 V40 Z"
          fill="#1C1B19"
        />
        <rect x="46" y="70" width="8" height="16" rx="2" fill="#F5F1E8" />
      </svg>
      <div className="leading-none">
        <div className="font-heading text-xl font-extrabold tracking-tight">
          <span className="text-charcoal">MÜLK</span>
          <span className="text-gold-500">ERA</span>
        </div>
        <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-charcoal/60">
          Əmlak Satışı Agentliyi
        </div>
        {withTagline && (
          <div className="mt-1 text-xs text-charcoal/50">Sizin eranız, sizin mülkünüz.</div>
        )}
      </div>
    </div>
  );
}
