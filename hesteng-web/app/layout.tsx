import type { Metadata } from "next";
import "./globals.css";
import { KlubaftenProvider } from "@/context/KlubaftenContext";
import { ClubProvider } from "@/context/ClubContext";
import { CurrentUserProvider } from "@/context/CurrentUserContext";
import ClubNightServerBootstrap from "@/components/ClubNightServerBootstrap";

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
        <ClubProvider>
          <CurrentUserProvider>
            <KlubaftenProvider>
              <ClubNightServerBootstrap />
              {children}
            </KlubaftenProvider>
          </CurrentUserProvider>
        </ClubProvider>
      </body>
    </html>
  );
}
