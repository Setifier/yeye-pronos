/**
 * Petites briques de l'interface mobile (sans état : utilisables partout).
 */

/** 1 → « 1er », 3 → « 3e » */
export function ordinal(rank: number): string {
  return rank === 1 ? "1er" : `${rank}e`;
}

/** 1240 → « 1 240 » */
export function fmtNumber(n: number): string {
  return n.toLocaleString("fr-FR");
}

export function Avatar({ name, image, size = 36, rounded = "full", className = "" }: {
  name: string;
  image: string | null;
  size?: number;
  rounded?: "full" | "xl";
  className?: string;
}) {
  const radius = rounded === "full" ? "rounded-full" : "rounded-xl";
  return image ? (
    <img src={image} alt="" className={`flex-shrink-0 object-cover ${radius} ${className}`} style={{ width: size, height: size }} />
  ) : (
    <span
      className={`flex flex-shrink-0 items-center justify-center bg-gradient-to-br from-[#5096ff] to-[#ff5050] font-bold text-white ${radius} ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size / 2.8) }}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

/** Anneau de progression (ex. 3 pronos sur 8). */
export function ProgressRing({ value, max, size = 76, stroke = 7, children }: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const id = `ring-${size}-${stroke}`;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5096ff" />
            <stop offset="100%" stopColor="#dcff50" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#27272a" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
