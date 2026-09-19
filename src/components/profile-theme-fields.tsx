"use client";

import { useState } from "react";
import { PROFILE_FONTS, profileThemeStyle } from "@/lib/profile-theme";
import { CharacterAvatar } from "./character-avatar";

function ColorField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value || fallback}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="h-10 w-12 cursor-pointer rounded-md border border-line bg-surface p-1"
      />
      <span className="flex-1 text-sm text-fg-soft">{label}</span>
      {value && (
        <button type="button" onClick={() => onChange("")} className="text-xs text-muted hover:text-accent">
          Zurücksetzen
        </button>
      )}
    </div>
  );
}

export function ProfileThemeFields({
  name,
  avatarUrl,
  initialFont,
  initialAccent,
  initialBg,
}: {
  name: string;
  avatarUrl: string | null;
  initialFont: string | null | undefined;
  initialAccent: string | null | undefined;
  initialBg: string | null | undefined;
}) {
  const [font, setFont] = useState(initialFont ?? "");
  const [accent, setAccent] = useState(initialAccent ?? "");
  const [bg, setBg] = useState(initialBg ?? "");

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
      <p className="text-sm font-medium text-fg">Profil gestalten</p>

      <input type="hidden" name="theme_font" value={font} />
      <input type="hidden" name="theme_accent" value={accent} />
      <input type="hidden" name="theme_bg" value={bg} />

      <div className="flex flex-wrap gap-2">
        {PROFILE_FONTS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFont(font === f.id ? "" : f.id)}
            style={{ fontFamily: f.family }}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              font === f.id ? "border-accent bg-accent-strong text-on-accent-strong" : "border-line text-fg-soft hover:border-accent"
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>

      <ColorField label="Akzentfarbe" value={accent} fallback="#a6646b" onChange={setAccent} />
      <ColorField label="Hintergrund" value={bg} fallback="#fbf5f0" onChange={setBg} />

      <div
        style={profileThemeStyle({ font, accent, bg })}
        className="mt-1 rounded-xl border border-line bg-app p-4 text-fg"
      >
        <div className="flex items-center gap-3">
          <CharacterAvatar name={name || "?"} avatarUrl={avatarUrl} size={44} />
          <div>
            <p className="font-serif text-xl">{name || "Dein Charakter"}</p>
            <p className="text-sm text-muted">So sieht dein Profil aus.</p>
          </div>
        </div>
        <span className="mt-3 inline-block rounded-lg bg-accent-strong px-3 py-1.5 text-sm font-medium text-on-accent-strong">
          Folgen
        </span>
      </div>
    </div>
  );
}
