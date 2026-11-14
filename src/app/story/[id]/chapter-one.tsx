"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CHAPTER_ONE_ANCHOR, chapterLabelText, chapterOneTitle } from "@/lib/chapters";
import type { WikiCalendar } from "@/lib/wiki-calendar";
import { ChapterForm } from "./chapter-form";
import { setChapterOne } from "../actions";

// Kapitel 1 = der Szenenanfang. Steht erst da, wenn die Szene mindestens ein weiteres Kapitel hat; heißt „Anfang“, bis jemand es benennt.
export function ChapterOne({ storyPostId, title, label, calendar, canEdit }: { storyPostId: string; title: string | null; label: string | null; calendar: WikiCalendar; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div id={CHAPTER_ONE_ANCHOR} className="scroll-mt-20">
        <ChapterForm
          calendar={calendar}
          heading="Kapitel 1 benennen"
          submitLabel="Speichern"
          withDetails={false}
          titlePlaceholder="Anfang"
          initial={{ title, label }}
          onCancel={() => setEditing(false)}
          onSubmit={async (formData) => {
            const err = await setChapterOne(storyPostId, formData);
            if (!err) {
              setEditing(false);
              router.refresh();
            }
            return err;
          }}
        />
      </div>
    );
  }
  return (
    <div id={CHAPTER_ONE_ANCHOR} className="group my-4 scroll-mt-20 text-center">
      <div className="flex items-center gap-3 text-muted">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs">{chapterLabelText(label, 1)}</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <h3 className="mt-2 font-serif text-2xl text-fg">{chapterOneTitle({ title, label })}</h3>
      {canEdit && (
        <button type="button" onClick={() => setEditing(true)} className="mt-1 text-xs text-muted transition hover:text-fg md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100">
          Kapitel 1 benennen
        </button>
      )}
    </div>
  );
}
