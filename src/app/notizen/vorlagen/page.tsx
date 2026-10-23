import { NotebookRoute } from "@/components/notebook-host";

export const metadata = { title: "Vorlagen" };

export default function TemplatesPage() {
  return <NotebookRoute view="templates" />;
}
