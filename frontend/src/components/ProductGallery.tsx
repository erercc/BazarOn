import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Product gallery: thumbnails, hover-to-zoom (follows the cursor) and a centered lightbox on click.
export function ProductGallery({ images, alt, badge }: { images: string[]; alt: string; badge?: React.ReactNode }) {
  const { t, dir } = useI18n();
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [open, setOpen] = useState(false);
  const n = images.length;
  const go = useCallback((d: number) => setActive((i) => (i + d + n) % n), [n]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(dir === "rtl" ? -1 : 1);
      if (e.key === "ArrowLeft") go(dir === "rtl" ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go, dir]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  const Prev = dir === "rtl" ? ChevronRight : ChevronLeft;
  const Next = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row" data-testid="product-gallery">
      {n > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto sm:max-h-[560px] sm:flex-col sm:overflow-y-auto">
          {images.map((src, i) => (
            <button
              key={src + i}
              data-testid={`product-gallery-thumb-${i}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => setActive(i)}
              className={cn(
                "size-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition-[border-color,opacity] duration-150 sm:size-20",
                i === active ? "border-primary" : "border-slate-200 opacity-70 hover:opacity-100",
              )}
            >
              <img src={src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <div
        className="group relative aspect-square flex-1 cursor-zoom-in overflow-hidden rounded-3xl border border-slate-200 bg-white"
        onMouseMove={onMove}
        onMouseLeave={() => setZoom(null)}
        onClick={() => setOpen(true)}
        data-testid="product-detail-image-zoom-area"
      >
        <img
          src={images[active]}
          alt={alt}
          data-testid="product-detail-image"
          className="size-full object-cover transition-transform duration-150 ease-out"
          style={zoom ? { transform: "scale(2.2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
        />
        {badge}
        <span className="pointer-events-none absolute bottom-3 end-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow opacity-0 transition-opacity group-hover:opacity-100">
          <Expand className="size-3.5" /> {t("click_to_enlarge")}
        </span>
        {n > 1 && (
          <>
            <button
              aria-label={t("prev")}
              data-testid="product-gallery-prev"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              className="absolute start-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow transition-transform hover:scale-110 sm:hidden"
            >
              <Prev className="size-5" />
            </button>
            <button
              aria-label={t("next")}
              data-testid="product-gallery-next"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              className="absolute end-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow transition-transform hover:scale-110 sm:hidden"
            >
              <Next className="size-5" />
            </button>
          </>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-1rem)] gap-3 bg-white p-3 sm:max-w-4xl sm:p-5" data-testid="product-lightbox">
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <div className="relative flex items-center justify-center">
            <img src={images[active]} alt={alt} className="max-h-[75dvh] w-auto rounded-xl object-contain" data-testid="product-lightbox-image" />
            {n > 1 && (
              <>
                <button aria-label={t("prev")} data-testid="product-lightbox-prev" onClick={() => go(-1)} className="absolute start-2 grid size-11 place-items-center rounded-full bg-white/95 text-slate-800 shadow-lg transition-transform hover:scale-110">
                  <Prev className="size-6" />
                </button>
                <button aria-label={t("next")} data-testid="product-lightbox-next" onClick={() => go(1)} className="absolute end-2 grid size-11 place-items-center rounded-full bg-white/95 text-slate-800 shadow-lg transition-transform hover:scale-110">
                  <Next className="size-6" />
                </button>
              </>
            )}
          </div>
          {n > 1 && (
            <div className="flex justify-center gap-2">
              {images.map((src, i) => (
                <button key={src + i} onClick={() => setActive(i)} data-testid={`product-lightbox-thumb-${i}`} className={cn("size-14 overflow-hidden rounded-lg border-2", i === active ? "border-primary" : "border-transparent opacity-60 hover:opacity-100")}>
                  <img src={src} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <p className="text-center text-xs font-semibold text-slate-500" dir="ltr" data-testid="product-lightbox-counter">
            {active + 1} / {n}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
