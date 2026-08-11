import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "LensLink — AI Photo Gallery for Event Photographers",
  description: "AI Photo Gallery for Event Photographers. Share event photos via AI face recognition, get branded galleries, WhatsApp delivery and photo selling — built for events.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  );
}