import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.fairwayforecast.app"),
  title: "FairwayForecast — Golf Weather Forecasts for Any Course",
  description:
    "Local golf weather forecasts for any course. Search your course, pick your tee time, and see wind, rain, and temperature for your full round.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "FairwayForecast — Golf Weather Forecasts for Any Course",
    description:
      "Local golf weather forecasts for any course. Search your course, pick your tee time, and see wind, rain, and temperature for your full round.",
    type: "website",
    siteName: "FairwayForecast",
  },
  twitter: {
    card: "summary_large_image",
    title: "FairwayForecast — Golf Weather Forecasts for Any Course",
    description:
      "Local golf weather forecasts for any course. Search your course, pick your tee time, and see wind, rain, and temperature for your full round.",
  },
  alternates: {
    canonical: "/",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "FairwayForecast",
  alternateName: "Fairway Forecast",
  url: "https://www.fairwayforecast.app",
  description:
    "Local golf weather forecasts for any course. Search your course, pick your tee time, and see wind, rain, and temperature for your full round.",
  applicationCategory: "SportsApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers>{children}</Providers>
        <Analytics />
      </body>
      {process.env.NEXT_PUBLIC_GA_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      )}
    </html>
  );
}
