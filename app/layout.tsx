import type { Metadata } from "next";
import { Fraunces, Inter, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";
import Nav from "./components/Nav";
import { LanguageProvider } from "./components/LanguageProvider";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const splineMono = Spline_Sans_Mono({
  variable: "--font-spline-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Possyrabat — our shared home",
  description:
    "One place where members see everything — their parcels, the fund, the court case, and each other.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${splineMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#16291F] text-[#F3ECDD]">
        <LanguageProvider>
          <Nav />
          <div className="flex-1">{children}</div>
        </LanguageProvider>
      </body>
    </html>
  );
}
