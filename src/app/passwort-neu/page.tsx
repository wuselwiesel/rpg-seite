import { cleanTokenHash } from "@/lib/recovery-token";
import { NewPasswordForm } from "./new-password-form";

export default async function NewPasswordPage({ searchParams }: { searchParams: Promise<{ token_hash?: string }> }) {
  const { token_hash } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 font-serif text-3xl text-fg">Neues Passwort</h1>
      <NewPasswordForm token={cleanTokenHash(token_hash)} />
    </div>
  );
}
