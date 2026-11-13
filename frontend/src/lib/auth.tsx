import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { apiGet, setTokenGetter } from "@/lib/api";
import { resetSessionCache } from "@/lib/session";
import type { Me } from "@/lib/types";

// Registers Clerk's getToken with the fetch layer and clears per-user cache on account change.
export function AuthBridge() {
  const { getToken, userId, isLoaded } = useAuth();
  // Assigned during render (not in an effect) so child queries already carry the token.
  setTokenGetter(() => getToken());
  const prev = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!isLoaded) return;
    if (prev.current !== undefined && prev.current !== (userId ?? null)) resetSessionCache();
    prev.current = userId ?? null;
  }, [userId, isLoaded]);
  return null;
}

export function useMe() {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const q = useQuery({
    queryKey: ["me", userId],
    queryFn: () => apiGet<Me>("/me"),
    enabled: isLoaded && !!isSignedIn,
    staleTime: 30_000,
  });
  return { ...q, me: isSignedIn && !q.isError ? q.data : undefined, isSignedIn: !!isSignedIn, isLoaded };
}
