import type { Metadata } from "next";
import { Outfit, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AWIEF Digital Learning Academy | Advancing Women. Growing Economies.",
  description: "Pan-African women's economic empowerment academy equipping female founders and SME leaders with investment readiness, export mastery, and financial growth frameworks.",
  icons: {
    icon: "/images/awief-logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} ${playfair.variable} antialiased min-h-screen bg-awief-warm text-awief-berry flex flex-col font-sans`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
