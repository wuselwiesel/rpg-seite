// Redaktions-Abzeichen: Gestaltungsformular (Account-Ebene) und Verleihen an Freund:innen.
import { createRoot } from "react-dom/client";
import { AccountAwardControls, CreateBadgeForm } from "@/app/badges/badge-controls";

createRoot(document.getElementById("root")!).render(
  <div className="mx-auto flex max-w-xl flex-col gap-6 p-4">
    <CreateBadgeForm scope="account" />
    <div id="award">
      <AccountAwardControls defId="def1" friends={[{ id: "f1", name: "Finn" }, { id: "f2", name: "Aoife" }]} />
    </div>
    <div id="none">
      <AccountAwardControls defId="def2" friends={[]} />
    </div>
  </div>,
);
