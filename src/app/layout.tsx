import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Golf Weather — Course Forecast Lookup",
  description:
    "Search any golf course, pick your tee time, and see the full weather forecast for your round.",
  openGraph: {
    title: "Golf Weather",
    description:
      "Search any golf course, pick your tee time, and see the full weather forecast for your round.",
    type: "website",
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
