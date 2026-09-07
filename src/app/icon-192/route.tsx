import { ImageResponse } from "next/og";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#a6646b",
          color: "#fdfbf9",
          fontFamily: "serif",
          fontSize: 128,
        }}
      >
        C
      </div>
    ),
    { width: 192, height: 192 },
  );
}
