import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { IBM_Plex_Sans, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

// Type system: Space Grotesk is the display voice (headlines, big numbers),
// IBM Plex Sans carries prose, IBM Plex Mono is reserved for data — API
// paths, labels, status readouts.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});
const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Streamo — camera intelligence platform",
  description:
    "Streamo turns any camera on any network into something your software can watch, store, and understand — with one API key. No port forwarding: an agent on the LAN dials out, streams run only while watched, clips keep exactly as long as you decide.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} ${grotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
