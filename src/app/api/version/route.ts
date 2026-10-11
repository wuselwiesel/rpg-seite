// Kennung der laufenden Version (Commit bei Vercel). Die Oberfläche fragt sie ab, um nach einem Update zum Neuladen aufzufordern.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ id: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" }, { headers: { "Cache-Control": "no-store" } });
}
