import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

// Öffentlich sichtbarer Web-API-Key von charakterbogen (kein Geheimnis - die
// eigentliche Absicherung passiert über die Firestore-Regeln, nicht den Key).
const firebaseConfig = {
  apiKey: "AIzaSyCpFJds2P6ikAeQhxdteimP0LdbX0-lG8E",
  authDomain: "charakterbogen-b1c31.firebaseapp.com",
  projectId: "charakterbogen-b1c31",
  storageBucket: "charakterbogen-b1c31.firebasestorage.app",
  messagingSenderId: "620409152480",
  appId: "1:620409152480:web:a2033463a7a21558810185",
};

function getCharakterbogenApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export type CharakterbogenSheetRef = { uid: string; characterId: string };

export function parseSheetUrl(url: string): CharakterbogenSheetRef | null {
  try {
    const parsed = new URL(url);
    const raw = parsed.searchParams.get("public");
    if (!raw) return null;
    const [uid, characterId] = raw.split(".");
    if (!uid || !characterId) return null;
    return { uid, characterId };
  } catch {
    return null;
  }
}

export type CharakterbogenAttr = { basis: string; bonus: string };

export type CharakterbogenData = {
  universe?: string;
  race?: string;
  luckPointsUsed?: number;
  personalFields?: { label: string; value: string }[];
  attrBasis?: Record<string, string>;
  attrBonus?: Record<string, string>;
  talentBasis?: Record<string, string>;
  talentBonus?: Record<string, string>;
  notesBlocks?: { label: string; html: string }[];
};

export type CharakterbogenCharacter = {
  name: string;
  public: boolean;
  data: CharakterbogenData;
};

export async function fetchPublicSheet(
  ref: CharakterbogenSheetRef,
): Promise<CharakterbogenCharacter | null> {
  const db = getFirestore(getCharakterbogenApp());
  const snap = await getDoc(doc(db, "users", ref.uid, "characters", ref.characterId));
  if (!snap.exists()) return null;

  const data = snap.data();
  if (!data.public) return null;

  return {
    name: typeof data.name === "string" ? data.name : "Unbenannt",
    public: true,
    data: data.data ?? {},
  };
}
