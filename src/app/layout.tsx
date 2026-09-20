import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Cormorant_Garamond, Playfair_Display, Lora, Caveat } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { MobileMain } from "@/components/mobile-main";
import { WikiPreviewLayer } from "@/components/wiki-preview-layer";
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

const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], preload: false });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"], preload: false });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], preload: false });

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
  var favicon = document.getElementById('favicon');
  if (favicon) favicon.href = dark ? '/icons/icon-dark-32.png' : '/icon.png';
  var palette = localStorage.getItem('palette');
  if (palette) document.documentElement.setAttribute('data-palette', palette);
} catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} ${playfair.variable} ${lora.variable} ${caveat.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link id="favicon" rel="icon" href="/icon.png" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full bg-app text-fg" suppressHydrationWarning>
        <ServiceWorkerRegister />
        <WikiPreviewLayer />
        <div className="mx-auto flex min-h-full max-w-6xl flex-col lg:flex-row">
          <Sidebar />
          <MobileMain>{children}</MobileMain>
        </div>
      </body>
    </html>
  );
}
