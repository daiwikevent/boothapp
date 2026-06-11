import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getEvent, listEventPhotos } from "@/lib/db-scoped";
import type { ScopedSession } from "@/lib/db-scoped";
import type { Metadata } from "next";
import Link from "next/link";
import EventGalleryClient from "./EventGalleryClient";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await auth();
  if (!session?.user?.id) return { title: "Gallery | BoothMagic" };

  const scoped: ScopedSession = { user: { id: session.user.id } };
  const event = await getEvent(scoped, params.id);
  return {
    title: `${event ? event.name : "Gallery"} | BoothMagic`,
  };
}

export default async function EventDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const scoped: ScopedSession = { user: { id: session.user.id } };
  const event = await getEvent(scoped, params.id);
  if (!event) redirect("/events");

  const photos = await listEventPhotos(scoped, params.id);

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Breadcrumb nav */}
      <div style={{ marginBottom: "var(--space-4)", fontSize: 13, color: "var(--text-muted)" }}>
        <Link href="/events" style={{ color: "var(--text-muted)", textDecoration: "none" }}>← Events</Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <span style={{ color: "var(--text)" }}>{event.name}</span>
      </div>

      <EventGalleryClient
        event={JSON.parse(JSON.stringify(event))}
        initialPhotos={JSON.parse(JSON.stringify(photos))}
      />
    </div>
  );
}
