import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.fairwayforecast.app"),
  title: "Golf Weather — Course Forecast Lookup",
  description:
    "Search any golf course, pick your tee time, and see the full weather forecast for your round.",
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
    title: "Golf Weather",
    description:
      "Search any golf course, pick your tee time, and see the full weather forecast for your round.",
    type: "website",
    siteName: "Golf Weather",
    images: [{ url: "/image.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Golf Weather",
    description:
      "Search any golf course, pick your tee time, and see the full weather forecast for your round.",
    images: ["/image.png"],
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
