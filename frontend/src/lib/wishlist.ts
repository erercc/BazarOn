import { useAuth } from "@clerk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPut } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { WishlistIds } from "@/lib/types";

const KEY = ["me", "wishlist", "ids"];

export function useWishlist() {
  const { isSignedIn, isLoaded } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: KEY,
    queryFn: () => apiGet<WishlistIds>("/wishlist/ids"),
    enabled: isLoaded && !!isSignedIn,
  });
  const ids = new Set(isSignedIn ? (data?.ids ?? []) : []);

  const mutation = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) =>
      on ? apiPut<WishlistIds>(`/wishlist/${id}`) : apiDelete<WishlistIds>(`/wishlist/${id}`),
    onMutate: async ({ id, on }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<WishlistIds>(KEY);
      const cur = prev?.ids ?? [];
      qc.setQueryData<WishlistIds>(KEY, { ids: on ? [...cur, id] : cur.filter((x) => x !== id) });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
      toast.error(t("error_generic"));
    },
    onSuccess: (res, { on }) => {
      qc.setQueryData(KEY, res);
      qc.invalidateQueries({ queryKey: ["me", "wishlist", "items"] });
      toast.success(on ? t("wishlist_added") : t("wishlist_removed"));
    },
  });

  const toggle = (id: string) => {
    if (!isSignedIn) {
      toast(t("wishlist_sign_in"));
      navigate("/sign-in");
      return;
    }
    mutation.mutate({ id, on: !ids.has(id) });
  };

  return { ids, toggle, count: ids.size };
}
