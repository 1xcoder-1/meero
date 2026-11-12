import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "ai",
    "cli",
    "shell",
    "terminal",
    "natural-language",
    "command-generation",
    "devtools",
  ],
  authors: [{ name: "1xcoder", url: "https://github.com/1xcoder-1" }],
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: `${SITE_NAME} ${SITE_TAGLINE}`,
    description:
      "Describe the task in plain English. meero inspects your system, generates the commands, guards the dangerous ones and fixes itself when something fails.",
    url: SITE_URL,
    siteName: SITE_NAME,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "meero" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} ${SITE_TAGLINE}`,
    description:
      "Describe the task in plain English. meero generates, guards, runs and repairs the shell commands.",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
