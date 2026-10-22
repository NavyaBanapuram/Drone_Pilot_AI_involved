import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { AuthProvider } from "@/context/auth-context";
import { OrientationGate } from "@/components/ui/orientation-gate";

export const metadata: Metadata = {
  title: "DRONE PILOT | Flight Telemetry & Simulation",
  description: "Next-generation interactive drone simulation, digital twin telemetry, and flight training platform.",
  icons: {
    icon: "/drone-icon.png",
    apple: "/drone-icon.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#FF5500",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="font-sans min-h-dvh bg-white text-neutral-900 antialiased selection:bg-[#FF5500] selection:text-white flex flex-col"
      >
        <AuthProvider>
          <OrientationGate />
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
