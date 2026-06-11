"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EventPresetsRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (params.id) {
      router.replace(`/events/${params.id}?tab=presets`);
    }
  }, [params.id, router]);

  return (
    <div style={{ color: "var(--text-muted)", padding: "var(--space-8)", textAlign: "center" }}>
      Redirecting to presets settings...
    </div>
  );
}
