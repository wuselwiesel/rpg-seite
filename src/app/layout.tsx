import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Cormorant_Garamond,
  Playfair_Display,
  Lora,
  Caveat,
  Cinzel,
  Cinzel_Decorative,
  MedievalSharp,
  Metamorphous,
  Pirata_One,
  UnifrakturMaguntia,
  Nosifer,
  Eagle_Lake,
  Great_Vibes,
  Dancing_Script,
  EB_Garamond,
  Crimson_Pro,
  Spectral,
  Special_Elite,
  Josefin_Sans,
  Quicksand,
  Bebas_Neue,
  Abril_Fatface,
  IM_Fell_English,
} from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { ModeTheme } from "@/components/mode-theme";
import { ChatBubbleLoader } from "@/components/chat-bubble-loader";
import { AppLogoSync } from "@/components/app-logo-sync";
import { SelectionCookieKeeper } from "@/components/selection-cookie-keeper";
import { ThemeColorSync } from "@/components/theme-color-sync";
import { CustomEmojiProvider } from "@/components/custom-emoji-provider";
import { getEmojiMap } from "@/lib/custom-emoji-server";
import { getAccountDefaultFont } from "@/lib/default-font-server";
import { AppFrame } from "@/components/app-frame";
import { DefaultFontSync } from "@/components/default-font-sync";
import { MobileMain } from "@/components/mobile-main";
import { OfflineBanner } from "@/components/offline-banner";
import { KeyboardFix } from "@/components/keyboard-fix";
import { WikiPreviewLayer } from "@/components/wiki-preview-layer";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { PushSync } from "@/components/push-sync";
import { AppTour } from "@/components/app-tour";

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

// Große Font-Auswahl für die Profil-/Post-Personalisierung (Charakterprofile + Inline-Schrift
// in Beiträgen) - bewusst mit preload:false, da pro Nutzung meist nur wenige dieser Schriften
// tatsächlich gerendert werden und die Datei dann erst nachgeladen wird.
const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["400"], preload: false });
const cinzelDecorative = Cinzel_Decorative({ variable: "--font-cinzel-decorative", subsets: ["latin"], weight: ["400"], preload: false });
const medievalSharp = MedievalSharp({ variable: "--font-medieval-sharp", subsets: ["latin"], weight: ["400"], preload: false });
const metamorphous = Metamorphous({ variable: "--font-metamorphous", subsets: ["latin"], weight: ["400"], preload: false });
const pirataOne = Pirata_One({ variable: "--font-pirata-one", subsets: ["latin"], weight: ["400"], preload: false });
const unifraktur = UnifrakturMaguntia({ variable: "--font-unifraktur", subsets: ["latin"], weight: ["400"], preload: false });
const nosifer = Nosifer({ variable: "--font-nosifer", subsets: ["latin"], weight: ["400"], preload: false });
const eagleLake = Eagle_Lake({ variable: "--font-eagle-lake", subsets: ["latin"], weight: ["400"], preload: false });
const greatVibes = Great_Vibes({ variable: "--font-great-vibes", subsets: ["latin"], weight: ["400"], preload: false });
const dancingScript = Dancing_Script({ variable: "--font-dancing-script", subsets: ["latin"], weight: ["400"], preload: false });
const ebGaramond = EB_Garamond({ variable: "--font-eb-garamond", subsets: ["latin"], weight: ["400"], preload: false });
const crimsonPro = Crimson_Pro({ variable: "--font-crimson-pro", subsets: ["latin"], weight: ["400"], preload: false });
const spectral = Spectral({ variable: "--font-spectral", subsets: ["latin"], weight: ["400"], preload: false });
const specialElite = Special_Elite({ variable: "--font-special-elite", subsets: ["latin"], weight: ["400"], preload: false });
const josefinSans = Josefin_Sans({ variable: "--font-josefin-sans", subsets: ["latin"], weight: ["400"], preload: false });
const quicksand = Quicksand({ variable: "--font-quicksand", subsets: ["latin"], weight: ["400"], preload: false });
const bebasNeue = Bebas_Neue({ variable: "--font-bebas-neue", subsets: ["latin"], weight: ["400"], preload: false });
const abrilFatface = Abril_Fatface({ variable: "--font-abril-fatface", subsets: ["latin"], weight: ["400"], preload: false });
const imFellEnglish = IM_Fell_English({ variable: "--font-im-fell-english", subsets: ["latin"], weight: ["400"], preload: false });

const personalizationFontVariables = [
  cinzel,
  cinzelDecorative,
  medievalSharp,
  metamorphous,
  pirataOne,
  unifraktur,
  nosifer,
  eagleLake,
  greatVibes,
  dancingScript,
  ebGaramond,
  crimsonPro,
  spectral,
  specialElite,
  josefinSans,
  quicksand,
  bebasNeue,
  abrilFatface,
  imFellEnglish,
]
  .map((f) => f.variable)
  .join(" ");

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
  themeColor: "#fbf5f0",
  // Ohne "cover" bleibt env(safe-area-inset-bottom) wirkungslos (0) und die untere Leiste
  // sitzt beim Scrollen nicht bündig am echten Bildschirmrand, sondern wirkt "hochgerutscht".
  viewportFit: "cover",
};

const themeInitScript = `
try {
  var stored = localStorage.getItem('theme');
  var dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', dark);
  var favicon = document.getElementById('favicon');
  var logo = localStorage.getItem('wortwinkel:app-logo');
  if (logo && /^[a-z]+$/.test(logo) && logo !== 'tinte') {
    if (favicon) favicon.href = '/icons/logos/' + logo + '-64.png?v=3';
    var apple = document.querySelector('link[rel="apple-touch-icon"]');
    if (apple) apple.href = '/icons/logos/' + logo + '-apple.png?v=3';
  } else if (favicon) favicon.href = dark ? '/icons/icon-dark-32.png?v=3' : '/icon.png?v=3';
  var palette = localStorage.getItem('palette');
  if (palette) document.documentElement.setAttribute('data-palette', palette);
} catch (e) {}
if (location.pathname.indexOf('/redaktion') === 0) document.documentElement.setAttribute('data-mode', 'redaktion');
`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [emojiMap, accountFont] = await Promise.all([getEmojiMap(), getAccountDefaultFont()]);
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} ${playfair.variable} ${lora.variable} ${caveat.variable} ${personalizationFontVariables} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link id="favicon" rel="icon" href="/icon.png?v=3" />
        {process.env.NEXT_PUBLIC_SUPABASE_URL && <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} crossOrigin="" />}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full bg-app text-fg" suppressHydrationWarning>
        <ModeTheme />
        <AppLogoSync />
        <SelectionCookieKeeper />
        <ThemeColorSync />
        <DefaultFontSync loggedIn={accountFont.loggedIn} accountFontId={accountFont.fontId} />
        <ServiceWorkerRegister />
        <PushSync />
        <WikiPreviewLayer />
        <KeyboardFix />
        <OfflineBanner />
        <AppTour />
        <CustomEmojiProvider map={emojiMap}>
          <AppFrame sidebar={<Sidebar />}>
            <MobileMain>{children}</MobileMain>
          </AppFrame>
          <ChatBubbleLoader />
        </CustomEmojiProvider>
      </body>
    </html>
  );
}
