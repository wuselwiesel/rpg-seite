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
  Kalam,
  Shadows_Into_Light,
  Indie_Flower,
  Gloria_Hallelujah,
  Patrick_Hand,
  Reenie_Beanie,
  Just_Another_Hand,
  Handlee,
  Amatic_SC,
  Covered_By_Your_Grace,
  Architects_Daughter,
  Nothing_You_Could_Do,
  Zeyada,
  La_Belle_Aurore,
  Kristi,
  Permanent_Marker,
  Rock_Salt,
  Homemade_Apple,
  Cedarville_Cursive,
  Sacramento,
  Parisienne,
  Alex_Brush,
  Courgette,
  Satisfy,
  Pacifico,
  Yellowtail,
  Merriweather,
  Libre_Baskerville,
  Old_Standard_TT,
  Philosopher,
  Almendra,
  Uncial_Antiqua,
  Macondo,
  Grenze_Gotisch,
  Rye,
  Courier_Prime,
  Orbitron,
  Press_Start_2P,
} from "next/font/google";
import "./globals.css";
import { OnlineProvider } from "@/components/online-status";
import { getOwnPresence } from "@/lib/online-status-server";
import { Sidebar } from "@/components/sidebar";
import { ModeTheme } from "@/components/mode-theme";
import { ModeProvider } from "@/components/mode-context";
import { MODE_COOKIE, parseRememberedMode } from "@/lib/app-mode";
import { cookies } from "next/headers";
import { ChatBubbleLoader } from "@/components/chat-bubble-loader";
import { SpoilerReveal } from "@/components/spoiler-reveal";
import { MentionLinks } from "@/components/mention-links";
import { AppLogoSync } from "@/components/app-logo-sync";
import { UpdateNotice } from "@/components/update-notice";
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

const kalam = Kalam({ variable: "--font-kalam", subsets: ["latin"], weight: ["400"], preload: false });
const shadowsIntoLight = Shadows_Into_Light({ variable: "--font-shadows-into-light", subsets: ["latin"], weight: ["400"], preload: false });
const indieFlower = Indie_Flower({ variable: "--font-indie-flower", subsets: ["latin"], weight: ["400"], preload: false });
const gloriaHallelujah = Gloria_Hallelujah({ variable: "--font-gloria-hallelujah", subsets: ["latin"], weight: ["400"], preload: false });
const patrickHand = Patrick_Hand({ variable: "--font-patrick-hand", subsets: ["latin"], weight: ["400"], preload: false });
const reenieBeanie = Reenie_Beanie({ variable: "--font-reenie-beanie", subsets: ["latin"], weight: ["400"], preload: false });
const justAnotherHand = Just_Another_Hand({ variable: "--font-just-another-hand", subsets: ["latin"], weight: ["400"], preload: false });
const handlee = Handlee({ variable: "--font-handlee", subsets: ["latin"], weight: ["400"], preload: false });
const amaticSc = Amatic_SC({ variable: "--font-amatic-sc", subsets: ["latin"], weight: ["400"], preload: false });
const coveredByYourGrace = Covered_By_Your_Grace({ variable: "--font-covered-by-your-grace", subsets: ["latin"], weight: ["400"], preload: false });
const architectsDaughter = Architects_Daughter({ variable: "--font-architects-daughter", subsets: ["latin"], weight: ["400"], preload: false });
const nothingYouCouldDo = Nothing_You_Could_Do({ variable: "--font-nothing-you-could-do", subsets: ["latin"], weight: ["400"], preload: false });
const zeyada = Zeyada({ variable: "--font-zeyada", subsets: ["latin"], weight: ["400"], preload: false });
const laBelleAurore = La_Belle_Aurore({ variable: "--font-la-belle-aurore", subsets: ["latin"], weight: ["400"], preload: false });
const kristi = Kristi({ variable: "--font-kristi", subsets: ["latin"], weight: ["400"], preload: false });
const permanentMarker = Permanent_Marker({ variable: "--font-permanent-marker", subsets: ["latin"], weight: ["400"], preload: false });
const rockSalt = Rock_Salt({ variable: "--font-rock-salt", subsets: ["latin"], weight: ["400"], preload: false });
const homemadeApple = Homemade_Apple({ variable: "--font-homemade-apple", subsets: ["latin"], weight: ["400"], preload: false });
const cedarvilleCursive = Cedarville_Cursive({ variable: "--font-cedarville-cursive", subsets: ["latin"], weight: ["400"], preload: false });
const sacramento = Sacramento({ variable: "--font-sacramento", subsets: ["latin"], weight: ["400"], preload: false });
const parisienne = Parisienne({ variable: "--font-parisienne", subsets: ["latin"], weight: ["400"], preload: false });
const alexBrush = Alex_Brush({ variable: "--font-alex-brush", subsets: ["latin"], weight: ["400"], preload: false });
const courgette = Courgette({ variable: "--font-courgette", subsets: ["latin"], weight: ["400"], preload: false });
const satisfy = Satisfy({ variable: "--font-satisfy", subsets: ["latin"], weight: ["400"], preload: false });
const pacifico = Pacifico({ variable: "--font-pacifico", subsets: ["latin"], weight: ["400"], preload: false });
const yellowtail = Yellowtail({ variable: "--font-yellowtail", subsets: ["latin"], weight: ["400"], preload: false });
const merriweather = Merriweather({ variable: "--font-merriweather", subsets: ["latin"], weight: ["400"], preload: false });
const libreBaskerville = Libre_Baskerville({ variable: "--font-libre-baskerville", subsets: ["latin"], weight: ["400"], preload: false });
const oldStandardTt = Old_Standard_TT({ variable: "--font-old-standard-tt", subsets: ["latin"], weight: ["400"], preload: false });
const philosopher = Philosopher({ variable: "--font-philosopher", subsets: ["latin"], weight: ["400"], preload: false });
const almendra = Almendra({ variable: "--font-almendra", subsets: ["latin"], weight: ["400"], preload: false });
const uncialAntiqua = Uncial_Antiqua({ variable: "--font-uncial-antiqua", subsets: ["latin"], weight: ["400"], preload: false });
const macondo = Macondo({ variable: "--font-macondo", subsets: ["latin"], weight: ["400"], preload: false });
const grenzeGotisch = Grenze_Gotisch({ variable: "--font-grenze-gotisch", subsets: ["latin"], weight: ["400"], preload: false });
const rye = Rye({ variable: "--font-rye", subsets: ["latin"], weight: ["400"], preload: false });
const courierPrime = Courier_Prime({ variable: "--font-courier-prime", subsets: ["latin"], weight: ["400"], preload: false });
const orbitron = Orbitron({ variable: "--font-orbitron", subsets: ["latin"], weight: ["400"], preload: false });
const pressStart = Press_Start_2P({ variable: "--font-press-start", subsets: ["latin"], weight: ["400"], preload: false });

const personalizationFontVariables = [
  cinzel,
  cinzelDecorative,
  medievalSharp,
  metamorphous,
  pirataOne,
  unifraktur,
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
  kalam,
  shadowsIntoLight,
  indieFlower,
  gloriaHallelujah,
  patrickHand,
  reenieBeanie,
  justAnotherHand,
  handlee,
  amaticSc,
  coveredByYourGrace,
  architectsDaughter,
  nothingYouCouldDo,
  zeyada,
  laBelleAurore,
  kristi,
  permanentMarker,
  rockSalt,
  homemadeApple,
  cedarvilleCursive,
  sacramento,
  parisienne,
  alexBrush,
  courgette,
  satisfy,
  pacifico,
  yellowtail,
  merriweather,
  libreBaskerville,
  oldStandardTt,
  philosopher,
  almendra,
  uncialAntiqua,
  macondo,
  grenzeGotisch,
  rye,
  courierPrime,
  orbitron,
  pressStart,
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
  // Fühlt sich wie eine App an: kein Hineinzoomen, und die Seite schrumpft nicht von selbst, wenn etwas breiter als der Bildschirm ist.
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
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
// iPhone-Safari ignoriert user-scalable=no: Zwei-Finger-Zoom der Seite hier abfangen (Karten und Bildausschnitt haben eigene Gesten).
document.addEventListener('gesturestart', function (e) {
  if (!e.target.closest || !e.target.closest('[data-allow-zoom]')) e.preventDefault();
}, { passive: false });
`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [emojiMap, accountFont, ownPresence, cookieStore] = await Promise.all([getEmojiMap(), getAccountDefaultFont(), getOwnPresence(), cookies()]);
  const rememberedMode = parseRememberedMode(cookieStore.get(MODE_COOKIE)?.value);
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
        <ModeProvider initial={rememberedMode}>
        <ModeTheme />
        <AppLogoSync />
        <UpdateNotice />
        <SelectionCookieKeeper />
        <ThemeColorSync />
        <DefaultFontSync loggedIn={accountFont.loggedIn} accountFontId={accountFont.fontId} />
        <ServiceWorkerRegister />
        <PushSync />
        <WikiPreviewLayer />
        <KeyboardFix />
        <OfflineBanner />
        <AppTour />
        <OnlineProvider userId={ownPresence?.userId ?? null} initialMode={ownPresence?.mode ?? "online"} initialEmoji={ownPresence?.emoji ?? null} initialText={ownPresence?.text ?? null}>
          <CustomEmojiProvider map={emojiMap}>
            <AppFrame sidebar={<Sidebar />}>
              <MobileMain>{children}</MobileMain>
            </AppFrame>
            <ChatBubbleLoader />
            <SpoilerReveal />
            <MentionLinks />
          </CustomEmojiProvider>
        </OnlineProvider>
        </ModeProvider>
      </body>
    </html>
  );
}
