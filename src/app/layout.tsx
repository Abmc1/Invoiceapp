import type { Metadata } from "next";
import { Montserrat, Bree_Serif } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const breeSerif = Bree_Serif({
  variable: "--font-bree-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "MotivAction Invoicing",
  description: "Private invoicing and client billing system for MotivAction.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${montserrat.variable} ${breeSerif.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
