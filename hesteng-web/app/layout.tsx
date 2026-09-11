import type { Metadata } from "next";
import "./globals.css";
import { KlubaftenProvider } from "@/context/KlubaftenContext";
import { ClubProvider } from "@/context/ClubContext";
import { CurrentUserProvider } from "@/context/CurrentUserContext";
import AdminGuestPreviewControl from "@/components/AdminGuestPreviewControl";
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
        <CurrentUserProvider>
          <ClubProvider>
            <KlubaftenProvider>
              <ClubNightServerBootstrap />
              <AdminGuestPreviewControl />
              {children}
            </KlubaftenProvider>
          </ClubProvider>
        </CurrentUserProvider>
      </body>
    </html>
  );
}
