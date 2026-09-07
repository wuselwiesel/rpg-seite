import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { MobileMain } from "@/components/mobile-main";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const serif = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Wortwinkel",
  description: "Ein textbasiertes Rollenspiel für Freunde",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Wortwinkel",
  },
};

export const viewport: Viewport = {
  themeColor: "#a6646b",
};

const themeInitScript = `
try {
  var stored = localStorage.getItem('theme');
  var dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', dark);
} catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full bg-app text-fg" suppressHydrationWarning>
        <ServiceWorkerRegister />
        <div className="mx-auto flex min-h-full max-w-6xl flex-col lg:flex-row">
          <Sidebar />
          <MobileMain>{children}</MobileMain>
        </div>
      </body>
    </html>
  );
}
