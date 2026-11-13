import { useState } from "react";
import { useAuth } from "@clerk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, ImagePlus, Loader2, MessageSquareText, Star, X } from "lucide-react";
import { toast } from "sonner";
import { ApiError, apiGet, apiPost, apiUpload } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Review, ReviewEligibility, ReviewIn, UploadOut } from "@/lib/types";
import { useDate } from "@/pages/Orders";
import { Rating } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1" dir="ltr" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" aria-label={`${n}`} data-testid={`review-star-${n}`} onMouseEnter={() => setHover(n)} onClick={() => onChange(n)} className="transition-transform hover:scale-110">
          <Star className={cn("size-7", n <= (hover || value) ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({ productId }: { productId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    try {
      for (const f of Array.from(files).slice(0, 4 - images.length)) {
        const form = new FormData();
        form.append("file", f);
        const res = await apiUpload<UploadOut>("/uploads", form);
        setImages((x) => [...x, res.url].slice(0, 4));
      }
    } catch {
      toast.error(t("upload_failed"));
    } finally {
      setUploading(false);
    }
  };

  const submit = useMutation({
    mutationFn: (body: ReviewIn) => apiPost<Review>(`/products/${productId}/reviews`, body),
    onSuccess: () => {
      toast.success(t("review_sent"));
      qc.invalidateQueries({ queryKey: ["reviews", productId] });
      qc.invalidateQueries({ queryKey: ["me", "review-eligibility", productId] });
      qc.invalidateQueries({ queryKey: ["product", productId] });
    },
    onError: (e) => toast.error(e instanceof ApiError && e.status === 409 ? t("review_already") : t("error_generic")),
  });

  return (
    <form
      className="space-y-3 rounded-2xl border border-teal-200 bg-teal-50/40 p-4"
      data-testid="review-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!rating) return toast.error(t("rating_required"));
        submit.mutate({ rating, comment: comment.trim(), images });
      }}
    >
      <p className="font-black text-slate-900">{t("write_review")}</p>
      <div>
        <p className="mb-1 text-sm font-semibold text-slate-600">{t("your_rating")}</p>
        <StarInput value={rating} onChange={setRating} />
      </div>
      <Textarea data-testid="review-comment-input" rows={3} maxLength={1000} placeholder={t("comment_ph")} value={comment} onChange={(e) => setComment(e.target.value)} className="bg-white" />
      <div className="flex flex-wrap items-center gap-2">
        {images.map((src) => (
          <span key={src} className="relative size-16 overflow-hidden rounded-lg border border-slate-200">
            <img src={src} alt="" className="size-full object-cover" />
            <button type="button" aria-label={t("remove")} onClick={() => setImages((x) => x.filter((y) => y !== src))} className="absolute end-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-slate-900/70 text-white">
              <X className="size-3" />
            </button>
          </span>
        ))}
        {images.length < 4 && (
          <label className="flex h-16 cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 transition-colors hover:border-primary hover:text-primary" data-testid="review-photo-label">
            {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
            {uploading ? t("uploading") : t("add_photos")}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="sr-only" data-testid="review-photo-input" disabled={uploading} onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
          </label>
        )}
      </div>
      <Button type="submit" disabled={submit.isPending || uploading} data-testid="review-submit-button">
        {submit.isPending && <Loader2 className="size-4 animate-spin" />} {t("submit_review")}
      </Button>
    </form>
  );
}

export function Reviews({ productId, rating, count }: { productId: string; rating: number; count: number }) {
  const { t } = useI18n();
  const fmtDate = useDate();
  const { isSignedIn, isLoaded } = useAuth();
  const [zoom, setZoom] = useState<string | null>(null);
  const list = useQuery({ queryKey: ["reviews", productId], queryFn: () => apiGet<Review[]>(`/products/${productId}/reviews`) });
  const elig = useQuery({
    queryKey: ["me", "review-eligibility", productId],
    queryFn: () => apiGet<ReviewEligibility>(`/products/${productId}/review-eligibility`),
    enabled: isLoaded && !!isSignedIn,
  });
  const reviews = list.isError ? [] : (list.data ?? []);
  const e = elig.isError ? undefined : elig.data;

  return (
    <section className="mt-12" data-testid="product-reviews">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900">{t("reviews_title")}</h2>
          <Rating value={rating} count={count} />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {reviews.length === 0 && (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-slate-500" data-testid="reviews-empty">
              <MessageSquareText className="size-6" /> {t("no_reviews")}
            </div>
          )}
          {reviews.map((r) => (
            <article key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4" data-testid={`review-${r.id}`}>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Rating value={r.rating} />
                <span className="text-sm font-bold text-slate-800">{r.user_name ? `${r.user_name.slice(0, 1)}***${r.user_name.slice(-1)}` : "—"}</span>
                <span className="text-xs text-slate-400">{fmtDate(r.created_at)}</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700"><BadgeCheck className="size-3.5" /> {t("verified_purchase")}</span>
              </div>
              {r.comment && <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{r.comment}</p>}
              {r.images.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {r.images.map((src) => (
                    <button key={src} onClick={() => setZoom(src)} className="size-16 overflow-hidden rounded-lg border border-slate-200 transition-transform hover:scale-105" data-testid="review-photo-thumb">
                      <img src={src} alt="" className="size-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
        <div>
          {e?.can_review ? (
            <ReviewForm productId={productId} />
          ) : (
            <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600" data-testid="review-not-eligible">
              {e?.has_reviewed ? t("review_already") : t("review_only_buyers")}
            </p>
          )}
        </div>
      </div>
      <Dialog open={!!zoom} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent className="max-w-[calc(100%-1rem)] bg-white p-3 sm:max-w-3xl">
          <DialogTitle className="sr-only">{t("reviews_title")}</DialogTitle>
          {zoom && <img src={zoom} alt="" className="mx-auto max-h-[75dvh] rounded-xl object-contain" />}
        </DialogContent>
      </Dialog>
    </section>
  );
}
