import { useState } from "react";
import Icon from "@/components/ui/icon";
import MasterMessages from "@/components/master/MasterMessages";
import EventQuestionsSection from "@/components/organizer/EventQuestionsSection";

interface Props {
  isMaster: boolean;
  isOrganizer: boolean;
  masterId: number;
  unreadMessages?: number;
  unreadQuestions?: number;
}

export default function MessagesHub({ isMaster, isOrganizer, masterId, unreadMessages = 0, unreadQuestions = 0 }: Props) {
  const [tab, setTab] = useState<"messages" | "questions">(isMaster ? "messages" : "questions");

  const tabs = [
    isMaster && { id: "messages" as const, label: "Сообщения", icon: "MessageCircle", badge: unreadMessages },
    isOrganizer && { id: "questions" as const, label: "Вопросы", icon: "MessageCircleQuestion", badge: unreadQuestions },
  ].filter(Boolean) as { id: "messages" | "questions"; label: string; icon: string; badge: number }[];

  if (tabs.length === 0) return null;

  return (
    <div className="space-y-4">
      {tabs.length > 1 && (
        <div className="flex gap-1 p-1 rounded-xl bg-muted w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon name={t.icon as "MessageCircle"} size={15} />
              {t.label}
              {t.badge > 0 && (
                <span className="ml-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {tab === "messages" && isMaster && <MasterMessages masterId={masterId} />}
      {tab === "questions" && isOrganizer && <EventQuestionsSection />}
    </div>
  );
}
