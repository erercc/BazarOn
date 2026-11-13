// Session boundary: Clerk owns the session; the frontend's duty is wiping the
// react-query cache whenever the signed-in account changes (sign-in, sign-out, switch).
import { queryClient } from "./queryClient";

export function resetSessionCache(): void {
  queryClient.removeQueries({ queryKey: ["me"] });
  queryClient.removeQueries({ queryKey: ["seller"] });
  queryClient.removeQueries({ queryKey: ["admin"] });
}
