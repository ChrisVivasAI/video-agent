import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chris Vivas AI Content Creation Suite",
  description:
    "Professional AI-powered content creation suite for video generation, editing, and multimedia production. Create stunning videos with advanced AI models and intuitive tools.",
  keywords: [
    "AI video",
    "content creation",
    "video editing",
    "Chris Vivas",
    "AI tools",
    "video generation",
  ],
  authors: [{ name: "Chris Vivas" }],
  creator: "Chris Vivas",
  publisher: "Chris Vivas Studio",
  openGraph: {
    title: "Chris Vivas AI Content Creation Suite",
    description:
      "Professional AI-powered content creation suite for video generation, editing, and multimedia production. Create stunning videos with advanced AI models and intuitive tools.",
    url: "https://chrisvivas.ai",
    siteName: "Chris Vivas Studio",
    images: [
      {
        url: "/hero pic.png",
        width: 1200,
        height: 630,
        alt: "Chris Vivas AI Content Creation Suite",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chris Vivas AI Content Creation Suite",
    description:
      "Professional AI-powered content creation suite for video generation, editing, and multimedia production.",
    creator: "@chrisvivas",
    images: ["/hero pic.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased dark">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
