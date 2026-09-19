import { overlayColor, overlaysOf, storyBackground } from "@/lib/stories";
import type { Story } from "@/lib/types";

export const OVERLAY_TEXT_STYLE = {
  textShadow: "0 1px 6px rgba(0,0,0,0.45)",
  lineHeight: 1.15,
} as const;

// 9:16-Bühne, die in ihrem Container so groß wie möglich ist. Alle Positionen und Schriftgrößen
// sind relativ zur Bühne, damit Editor und Viewer identisch aussehen.
export function StoryStage({
  story,
  children,
  videoProps,
}: {
  story: Pick<Story, "overlays" | "text_content" | "image_url" | "bg"> & { video_url?: string | null };
  children?: React.ReactNode;
  // Nur der Viewer spielt Videos ab (Editor zeigt ein stilles Vorschaubild).
  videoProps?: React.VideoHTMLAttributes<HTMLVideoElement> & { ref?: React.Ref<HTMLVideoElement> };
}) {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: "min(100cqw, 100cqh * 9 / 16)",
        height: "min(100cqh, 100cqw * 16 / 9)",
        containerType: "inline-size",
        background: story.image_url || story.video_url ? "#000" : storyBackground(story.bg),
      }}
    >
      {story.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={story.image_url} alt="" className="absolute inset-0 h-full w-full object-contain" draggable={false} />
      )}
      {story.video_url && (
        <video
          key={story.video_url}
          src={story.video_url}
          playsInline
          className="absolute inset-0 h-full w-full object-contain"
          {...videoProps}
        />
      )}
      {overlaysOf(story).map((o) => (
        <p
          key={o.id}
          className="absolute max-w-[92%] whitespace-pre-line break-words text-center font-serif"
          style={{
            left: `${o.x}%`,
            top: `${o.y}%`,
            transform: "translate(-50%, -50%)",
            fontSize: `${o.size}cqw`,
            color: overlayColor(o.color),
            ...OVERLAY_TEXT_STYLE,
          }}
        >
          {o.t}
        </p>
      ))}
      {children}
    </div>
  );
}
