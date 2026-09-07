import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chronik",
    short_name: "Chronik",
    description: "Ein textbasiertes Rollenspiel für Freunde",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf5f0",
    theme_color: "#a6646b",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}
