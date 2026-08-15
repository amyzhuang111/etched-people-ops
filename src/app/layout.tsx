import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { FiltersProvider } from "@/lib/filters";
import { AppDataProvider } from "@/lib/app-data";
import { AppDataGate } from "@/components/app-data-gate";

// Etched's site uses Söhne / Söhne Mono, which are commercially licensed
// (Klim Type Foundry) and can't be redistributed here. Inter + JetBrains
// Mono are free, freely-embeddable substitutes chosen for a similar
// grotesque/technical character.
const fontSans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fontMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Talent Command Center · Etched",
  description: "Talent Command Center dashboard mockup for Etched — illustrative data only.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fontSans.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <TooltipProvider delayDuration={150}>
          <AppDataProvider>
            <FiltersProvider>
              <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                  <AppDataGate>{children}</AppDataGate>
                </SidebarInset>
              </SidebarProvider>
            </FiltersProvider>
          </AppDataProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
