import { useState } from "react";
import Icon from "@/components/ui/icon";
import ClientsList from "./ClientsList";
import ClientCard from "./ClientCard";
import TagsManager from "./TagsManager";
import AddClientDialog from "./AddClientDialog";
import ImportCsvDialog from "./ImportCsvDialog";
import NotifyModule from "@/components/notify/NotifyModule";

interface CrmModuleProps {
  role: "organizer" | "master" | "partner" | "admin";
}

type Tab = "clients" | "tags" | "broadcasts";

export default function CrmModule({ role }: CrmModuleProps) {
  const [tab, setTab] = useState<Tab>("clients");
  const [openClientKey, setOpenClientKey] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const TabBtn = ({ id, icon, label }: { id: Tab; icon: string; label: string }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        tab === id
          ? "bg-background shadow text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon name={icon} size={13} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Icon name="Users" size={20} className="text-primary" />
          Гости
        </h2>
        <p className="text-sm text-muted-foreground">
          Единая база всех ваших гостей: история, заметки, теги и рассылки.
        </p>
      </div>

      <div className="flex gap-1 bg-muted rounded-xl p-1">
        <TabBtn id="clients" icon="Users" label="Гости" />
        <TabBtn id="tags" icon="Tags" label="Теги" />
        <TabBtn id="broadcasts" icon="Send" label="Рассылки" />
      </div>

      <div key={reloadKey}>
        {tab === "clients" && (
          <ClientsList
            onOpenClient={setOpenClientKey}
            onAddExternal={() => setAddOpen(true)}
            onImportCsv={() => setImportOpen(true)}
          />
        )}
        {tab === "tags" && <TagsManager />}
        {tab === "broadcasts" && (
          <NotifyModule role={role} eventId={null} />
        )}
      </div>

      <ClientCard
        clientKey={openClientKey}
        onClose={() => setOpenClientKey(null)}
        onChanged={() => setReloadKey((k) => k + 1)}
      />

      <AddClientDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => setReloadKey((k) => k + 1)}
      />

      <ImportCsvDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}