import { useId } from "react";
import type { Lang } from "@/lib/types";

function star(cx: number, cy: number, R: number, rot = -90): string {
  const r = R * 0.382;
  return Array.from({ length: 10 }, (_, i) => {
    const a = ((rot + i * 36) * Math.PI) / 180;
    const rad = i % 2 === 0 ? R : r;
    return `${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

function Syria() {
  // Syrian independence flag (green-white-black, three red stars), in use since 2025.
  return (
    <svg viewBox="0 0 900 600" aria-hidden="true">
      <rect width="900" height="200" fill="#007A3D" />
      <rect y="200" width="900" height="200" fill="#FFFFFF" />
      <rect y="400" width="900" height="200" fill="#000000" />
      {[225, 450, 675].map((x) => (
        <polygon key={x} points={star(x, 300, 62)} fill="#CE1126" />
      ))}
    </svg>
  );
}

function Turkey() {
  return (
    <svg viewBox="0 0 1200 800" aria-hidden="true">
      <rect width="1200" height="800" fill="#E30A17" />
      <circle cx="425" cy="400" r="200" fill="#FFFFFF" />
      <circle cx="475" cy="400" r="160" fill="#E30A17" />
      <polygon points={star(583, 400, 80, 180)} fill="#FFFFFF" />
    </svg>
  );
}

function UK() {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 60 30" aria-hidden="true">
      <clipPath id={`${id}s`}>
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id={`${id}t`}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath={`url(#${id}s)`}>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${id}t)`} stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}

const FLAGS: Record<Lang, () => React.ReactElement> = { ar: Syria, tr: Turkey, en: UK };

export function Flag({ lang, className }: { lang: Lang; className?: string }) {
  const F = FLAGS[lang];
  return (
    <span
      data-testid={`flag-${lang}`}
      className={`inline-block h-3.5 w-5 shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/10 [&>svg]:size-full [&>svg]:object-cover ${className ?? ""}`}
    >
      <F />
    </span>
  );
}
