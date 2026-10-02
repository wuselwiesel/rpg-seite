import { WikiForm } from "../wiki-form";

export default function NewWikiPagePage() {
  return (
    <div className="mx-auto max-w-2xl xl:max-w-3xl 2xl:max-w-4xl px-4 py-10">
      <h1 className="mb-6 font-serif text-3xl text-fg">Neuer Wiki-Eintrag</h1>
      <WikiForm />
    </div>
  );
}
