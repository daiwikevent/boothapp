import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "BoothMagic — AI Photobooth for Indian Events | Weddings, Sangeets & Corporate",
  description:
    "Transform every guest into a studio-quality AI portrait in under 20 seconds. 15+ Indian-themed presets — Royal Rajasthan, Bollywood Retro, Sangeet Glam & more. Start free with 9 credits. No hardware needed.",
  keywords: "AI photobooth India, wedding photobooth, sangeet photobooth, corporate photobooth, AI portrait generator Indian events",
  openGraph: {
    title: "BoothMagic — AI Photobooth for Indian Events",
    description: "Studio-quality AI portraits at weddings, sangeets, and corporate events. 15+ Indian themes. Start free.",
    type: "website",
  },
};

export default function HomePage() {
  return <HomeClient />;
}
