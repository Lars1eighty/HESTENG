import type { Metadata } from "next";
import "./globals.css";
import { KlubaftenProvider } from "@/context/KlubaftenContext";

export const metadata: Metadata = {
  title: "HESTENG",
  description: "HESTENG Competition Engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da">
      <body>
        <KlubaftenProvider>
          {children}
        </KlubaftenProvider>
      </body>
    </html>
  );
}