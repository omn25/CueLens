import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import FontLoader from "./components/FontLoader";
import { CaretakerModeProvider } from "./contexts/CaretakerModeContext";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CueLens Live Vision HUD",
  description: "Assistive Vision HUD",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${plusJakartaSans.variable} font-display antialiased bg-background-dark text-white`}
      >
        <FontLoader />
        <CaretakerModeProvider>
          {children}
        </CaretakerModeProvider>
      </body>
    </html>
  );
}
