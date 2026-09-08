import type { Metadata } from "next";
import { Cinzel, Source_Sans_3, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const heading = Cinzel({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Onderwereld",
    template: "%s · Onderwereld",
  },
  description:
    "Tekst-MMORPG in de Nederlandse onderwereld. Misdaden, auto's, families en kogels.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="nl"
      suppressHydrationWarning
      className={`dark ${heading.variable} ${sans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
