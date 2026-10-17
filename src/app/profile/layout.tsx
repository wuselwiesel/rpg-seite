import { SettingsShell } from "./settings-shell";
import { isAppAdmin } from "@/lib/account-marks";
import { getAltAccountLabel } from "@/lib/account-switch";
import { createClient } from "@/lib/supabase/server";

export default async function ProfileLayout({ children }: LayoutProps<"/profile">) {
  // Der Eintrag „Wortwinkel-Konto“ erscheint nur für App-Admins (und solange ein zweites Konto verknüpft ist)
  const admin = await isAppAdmin();
  const showOfficial = admin || Boolean(await getAltAccountLabel());
  // Offene Meldungen der Mitglieder (nur für App-Admins)
  let openTickets: number | null = null;
  if (admin) {
    const supabase = await createClient();
    const { count } = await supabase.from("tickets").select("id", { count: "exact", head: true }).eq("status", "open");
    openTickets = count ?? 0;
  }
  return (
    <SettingsShell showOfficialAccount={showOfficial} showInviteCodes={admin} openTickets={openTickets}>
      {children}
    </SettingsShell>
  );
}
