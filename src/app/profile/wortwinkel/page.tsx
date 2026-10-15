import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAppAdmin } from "@/lib/account-marks";
import { getAltAccountLabel } from "@/lib/account-switch";
import { SwitchAccountButton } from "@/components/switch-account-button";
import { LinkOfficialAccountForm } from "./link-form";
import { unlinkAccount } from "./actions";

export const metadata = { title: "Konto wechseln" };

// Zwischen deinem Konto und dem Wortwinkel-Konto wechseln (in beide Richtungen), ohne dich abzumelden (nur für App-Admins).
export default async function OfficialAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const altLabel = await getAltAccountLabel();
  if (!(await isAppAdmin()) && !altLabel) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-serif text-2xl text-fg">Konto wechseln</h2>
      {altLabel ? (
        <div className="flex flex-col gap-4">
          <SwitchAccountButton
            label={altLabel}
            iconClassName="h-4 w-4 shrink-0"
            className="flex w-fit items-center gap-2 rounded-md bg-accent-strong px-5 py-2.5 font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
          />
          <form action={unlinkAccount}>
            <button type="submit" className="text-sm text-muted underline-offset-2 hover:text-fg hover:underline">
              Verknüpfung lösen
            </button>
          </form>
        </div>
      ) : (
        <LinkOfficialAccountForm />
      )}
    </div>
  );
}
