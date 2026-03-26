"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function DashboardNotice() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const notice = params.get("notice");
    if (notice === "admin-required") {
      toast.error("Workspace admin access required");
      // Remove the param without adding a history entry
      const url = new URL(window.location.href);
      url.searchParams.delete("notice");
      router.replace(url.pathname + url.search);
    }
  }, [params, router]);

  return null;
}
