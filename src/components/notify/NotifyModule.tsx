/**
 * NotifyModule — модуль персонализированных уведомлений.
 * Подключается к любому кабинету:
 *
 *   <NotifyModule role="organizer" eventId={selectedEvent?.id} />
 *   <NotifyModule role="master" />
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  notifyApi, NotifyScenario, NotifyLogEntry, SendResult,
} from "@/lib/notify-api";
import ScenarioList from "./ScenarioList";
import ScenarioEditor from "./ScenarioEditor";
import SendPanel from "./SendPanel";
import NotifyHistory from "./NotifyHistory";

type Tab = "scenarios" | "send" | "history";
type SubView = "list" | "editor" | "send";

interface Props {
  role?: "organizer" | "master";
  eventId?: number | null;
}

export default function NotifyModule({ role = "organizer", eventId = null }: Props) {
  const [tab, setTab] = useState<Tab>("scenarios");
  const [subView, setSubView] = useState<SubView>("list");

  const [scenarios, setScenarios] = useState<NotifyScenario[]>([]);
  const [loadingScenarios, setLoadingScenarios] = useState(true);

  const [log, setLog] = useState<NotifyLogEntry[]>([]);
  const [loadingLog, setLoadingLog] = useState(false);

  const [editingScenario, setEditingScenario] = useState<Partial<NotifyScenario> | null>(null);
  const [sendScenario, setSendScenario] = useState<NotifyScenario | null>(null);

  const loadScenarios = useCallback(() => {
    setLoadingScenarios(true);
    notifyApi.getScenarios()
      .then(({ scenarios: s }) => setScenarios(s))
      .catch(() => toast.error("Не удалось загрузить сценарии"))
      .finally(() => setLoadingScenarios(false));
  }, []);

  const loadLog = useCallback(() => {
    setLoadingLog(true);
    notifyApi.getLog(eventId ?? undefined)
      .then(({ log: l }) => setLog(l))
      .catch(() => {})
      .finally(() => setLoadingLog(false));
  }, [eventId]);

  useEffect(() => { loadScenarios(); }, [loadScenarios]);
  useEffect(() => { if (tab === "history") loadLog(); }, [tab, loadLog]);

  const handleSaveScenario = async (data: Partial<NotifyScenario>) => {
    if (data.id) {
      await notifyApi.updateScenario(data as NotifyScenario & { id: number });
      toast.success("Сценарий обновлён");
    } else {
      await notifyApi.createScenario(data);
      toast.success("Сценарий создан");
    }
    loadScenarios();
    setSubView("list");
    setEditingScenario(null);
  };

  const handleDeleteScenario = async (id: number) => {
    if (!confirm("Деактивировать сценарий?")) return;
    await notifyApi.deleteScenario(id);
    toast.success("Сценарий деактивирован");
    loadScenarios();
  };

  const handleSent = (result: SendResult) => {
    toast.success(`Отправлено: ${result.sent}${result.failed > 0 ? `, не доставлено: ${result.failed}` : ""}`);
    setSubView("list");
    setSendScenario(null);
    if (tab === "history") loadLog();
  };

  const goEdit = (s: NotifyScenario) => { setEditingScenario(s); setSubView("editor"); };
  const goNew = () => { setEditingScenario(null); setSubView("editor"); };
  const goSend = (s: NotifyScenario) => { setSendScenario(s); setSubView("send"); setTab("send"); };
  const goBack = () => { setSubView("list"); setEditingScenario(null); setSendScenario(null); };

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "scenarios", label: "Сценарии", icon: "Zap" },
    { id: "send", label: "Отправить", icon: "Send" },
    { id: "history", label: "История", icon: "History" },
  ];

  return (
    <div className="space-y-4">
      {/* Шапка */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Icon name="Bell" size={20} className="text-primary" />
            Уведомления
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Персонализированные письма и сообщения участникам
          </p>
        </div>
        {subView !== "list" && (
          <Button variant="ghost" size="sm" onClick={goBack} className="gap-1.5">
            <Icon name="ChevronLeft" size={15} />
            Назад
          </Button>
        )}
      </div>

      {/* Информационный блок */}
      {subView === "list" && tab === "scenarios" && scenarios.length === 0 && !loadingScenarios && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex gap-3">
            <Icon name="Info" size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 space-y-1">
              <p className="font-medium">Как работают сценарии</p>
              <ul className="text-xs space-y-0.5 list-disc pl-4 text-blue-700">
                <li>Создайте шаблон письма с переменными вроде <code className="font-mono">{"{{name}}"}</code></li>
                <li>Выберите триггер: вручную, за N часов до события или при новом участнике</li>
                <li>Отправляйте одним кликом — письма уйдут всем выбранным участникам</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Вкладки — только когда список */}
      {subView === "list" && (
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === t.id ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon name={t.icon as "Zap"} size={13} />
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Контент */}
      {subView === "editor" ? (
        <ScenarioEditor
          scenario={editingScenario}
          onSave={handleSaveScenario}
          onCancel={goBack}
        />
      ) : subView === "send" ? (
        <SendPanel
          scenario={sendScenario}
          eventId={eventId}
          onClose={goBack}
          onSent={handleSent}
        />
      ) : (
        <>
          {tab === "scenarios" && (
            <ScenarioList
              scenarios={scenarios}
              loading={loadingScenarios}
              onEdit={goEdit}
              onDelete={handleDeleteScenario}
              onSend={goSend}
              onNew={goNew}
            />
          )}
          {tab === "send" && (
            <SendPanel
              scenario={null}
              eventId={eventId}
              onClose={() => setTab("scenarios")}
              onSent={handleSent}
            />
          )}
          {tab === "history" && (
            <NotifyHistory log={log} loading={loadingLog} />
          )}
        </>
      )}
    </div>
  );
}
