import { useState } from "react";
import Icon from "@/components/ui/icon";
import HubStats from "./notification-hub/HubStats";
import HubTemplates from "./notification-hub/HubTemplates";
import HubLogs from "./notification-hub/HubLogs";

type Tab = "stats" | "templates" | "logs";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "stats", label: "Статистика", icon: "BarChart3" },
  { id: "templates", label: "Шаблоны", icon: "FileText" },
  { id: "logs", label: "Журнал доставки", icon: "ScrollText" },
];

export default function AdminNotificationHub() {
  const [tab, setTab] = useState<Tab>("stats");

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Icon name="BellRing" size={24} className="text-primary" />
          Центр уведомлений
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Единая система: шаблоны сообщений, каналы доставки и журнал отправок
        </p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon name={t.icon} size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "stats" && <HubStats />}
      {tab === "templates" && <HubTemplates />}
      {tab === "logs" && <HubLogs />}
    </div>
  );
}
