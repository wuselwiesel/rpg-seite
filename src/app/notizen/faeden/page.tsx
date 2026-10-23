import { NotebookRoute } from "@/components/notebook-host";

export const metadata = { title: "Offene Fäden" };

export default function OpenThreadsPage() {
  return <NotebookRoute view="threads" />;
}
