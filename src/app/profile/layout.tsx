import { SettingsShell } from "./settings-shell";
import { isAppAdmin } from "@/lib/account-marks";
import { getAltAccountLabel } from "@/lib/account-switch";

export default async function ProfileLayout({ children }: LayoutProps<"/profile">) {
  // Der Eintrag „Wortwinkel-Konto“ erscheint nur für App-Admins (und solange ein zweites Konto verknüpft ist)
  const showOfficial = (await isAppAdmin()) || Boolean(await getAltAccountLabel());
  return <SettingsShell showOfficialAccount={showOfficial}>{children}</SettingsShell>;
}
