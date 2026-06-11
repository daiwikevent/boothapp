import type { Metadata } from "next";

interface Props {
  params: { photoId: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `Result — Photo ${params.photoId}`,
  };
}

export default function BoothResultPage({ params }: Props) {
  return (
    <div
      className="booth-screen flex items-center justify-center"
      style={{ background: "var(--bg)" }}
    >
      <div className="card text-center" style={{ maxWidth: "480px", color: "var(--text-muted)" }}>
        <h2 className="mb-2">Result Screen</h2>
        <p style={{ fontSize: "14px" }}>
          Before/after view, QR code, Retake / New Photo buttons — implemented in T11.
        </p>
        <p className="mt-4 text-xs">Photo ID: {params.photoId}</p>
      </div>
    </div>
  );
}
