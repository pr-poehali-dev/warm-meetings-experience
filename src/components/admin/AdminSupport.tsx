import { useState } from "react";
import Icon from "@/components/ui/icon";
import TicketsView from "@/components/support/TicketsView";
import TemplatesView from "@/components/support/TemplatesView";

export default function AdminSupport() {
  const [view, setView] = useState<"tickets" | "templates">("tickets");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Icon name="LifeBuoy" size={22} />
          Служба поддержки
        </h1>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setView("tickets")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === "tickets" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            Обращения
          </button>
          <button
            onClick={() => setView("templates")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === "templates" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            Шаблоны
          </button>
        </div>
      </div>

      {view === "tickets" ? <TicketsView /> : <TemplatesView />}
    </div>
  );
}
