import { SettingsShell } from "./settings-shell";

export default function ProfileLayout({ children }: LayoutProps<"/profile">) {
  return <SettingsShell>{children}</SettingsShell>;
}
