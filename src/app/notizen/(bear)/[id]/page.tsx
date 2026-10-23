import { NotebookRoute } from "@/components/notebook-host";

export const metadata = { title: "Notiz" };

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NotebookRoute noteId={id} />;
}
