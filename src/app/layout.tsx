import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { Navigation } from "@/components/navigation";
import { NotificationProviderWrapper } from "@/components/notification-provider-wrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FarmyFishFry",
  description: "BitCraft Trading Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <NotificationProviderWrapper>
            <div className="min-h-screen bg-background font-sans antialiased">
              <Navigation />
              <div id="main-content">{children}</div>
            </div>
          </NotificationProviderWrapper>
        </Providers>
      </body>
    </html>
  );
}
