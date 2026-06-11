import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import SessionProvider from "@/components/providers/SessionProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0B0B14",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "BoothMagic — AI Photobooth for Indian Events",
    template: "%s | BoothMagic",
  },
  description:
    "Studio-quality AI portraits at weddings, sangeets, and corporate events. Themed for India, billed in rupees. Start with 9 free credits.",
  keywords: ["AI photobooth", "wedding photobooth", "India", "Bollywood", "event photography"],
  authors: [{ name: "BoothMagic" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BoothMagic",
  },
  openGraph: {
    type: "website",
    siteName: "BoothMagic",
    title: "BoothMagic — AI Photobooth for Indian Events",
    description:
      "Studio-quality AI portraits in 30 seconds. Royal Rajasthan, Bollywood Retro, Sangeet Glam & more.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
