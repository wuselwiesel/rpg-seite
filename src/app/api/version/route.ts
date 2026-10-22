// Kennung der laufenden Version (Commit bei Vercel, Railway bzw. Coolify). Die Oberfläche fragt sie ab, um nach einem Update zum Neuladen aufzufordern.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ id: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.SOURCE_COMMIT ?? "dev" }, { headers: { "Cache-Control": "no-store" } });
}
