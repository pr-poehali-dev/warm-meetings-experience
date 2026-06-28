import { RefObject } from "react";
import FullCalendar from "@fullcalendar/react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Icon from "@/components/ui/icon";
import { tzLabel } from "./calendarHelpers";

interface CalendarToolbarProps {
  agendaMode: boolean;
  setAgendaMode: (v: boolean) => void;
  currentView: string;
  viewStart: Date;
  timezone: string;
  loading: boolean;
  calRef: RefObject<FullCalendar | null>;
  updateTitle: () => void;
  changeCalView: (view: string) => void;
}

export default function CalendarToolbar({
  agendaMode,
  setAgendaMode,
  currentView,
  viewStart,
  timezone,
  loading,
  calRef,
  updateTitle,
  changeCalView,
}: CalendarToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
      {/* Переключатель Список/Календарь */}
      <div className="flex sm:inline-flex border border-border rounded-lg overflow-hidden shrink-0">
        <button
          onClick={() => setAgendaMode(true)}
          title="Список — все записи и слоты в виде ленты"
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${agendaMode ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
        >
          <Icon name="ListChecks" size={13} />
          <span>Список</span>
        </button>
        <button
          onClick={() => setAgendaMode(false)}
          title="Календарь — сетка по дням недели с перетаскиванием"
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-l border-border transition-colors ${!agendaMode ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
        >
          <Icon name="CalendarDays" size={13} />
          <span>Календарь</span>
        </button>
      </div>

      {/* Навигация — скрыта в режиме списка */}
      {!agendaMode && (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {/* Сегодня */}
          <Button size="sm" variant="outline" className="px-2.5 shrink-0 text-xs font-semibold border-primary/40 text-primary hover:bg-primary/10" onClick={() => { calRef.current?.getApi().today(); updateTitle(); }}>
            Сегодня
          </Button>

          <Button size="sm" variant="outline" className="px-1.5 shrink-0" onClick={() => { calRef.current?.getApi().prev(); updateTitle(); }}>
            <Icon name="ChevronLeft" size={15} />
          </Button>

          {/* Дата + вид */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="flex-1 min-w-0 justify-between gap-1.5 font-medium px-2.5">
                <span className="truncate text-left text-xs">
                  {currentView === "timeGridDay"
                    ? viewStart.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short", timeZone: timezone })
                    : currentView === "timeGridWeek"
                    ? viewStart.toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: timezone })
                    : viewStart.toLocaleDateString("ru-RU", { month: "long", year: "numeric", timeZone: timezone })
                  }
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Icon name={currentView === "timeGridDay" ? "CalendarClock" : currentView === "timeGridWeek" ? "CalendarDays" : "CalendarRange"} size={12} />
                  <span className="hidden sm:inline">
                    {currentView === "timeGridDay" ? "День" : currentView === "timeGridWeek" ? "Неделя" : "Месяц"}
                  </span>
                  <Icon name="ChevronsUpDown" size={10} className="opacity-50" />
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[160px]">
              <DropdownMenuItem onClick={() => changeCalView("timeGridDay")} className={currentView === "timeGridDay" ? "bg-accent font-semibold" : ""}>
                <Icon name="CalendarClock" size={14} className="mr-2 text-muted-foreground" />День
                {currentView === "timeGridDay" && <Icon name="Check" size={13} className="ml-auto text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeCalView("timeGridWeek")} className={currentView === "timeGridWeek" ? "bg-accent font-semibold" : ""}>
                <Icon name="CalendarDays" size={14} className="mr-2 text-muted-foreground" />Неделя
                {currentView === "timeGridWeek" && <Icon name="Check" size={13} className="ml-auto text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeCalView("dayGridMonth")} className={currentView === "dayGridMonth" ? "bg-accent font-semibold" : ""}>
                <Icon name="CalendarRange" size={14} className="mr-2 text-muted-foreground" />Месяц
                {currentView === "dayGridMonth" && <Icon name="Check" size={13} className="ml-auto text-primary" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" variant="outline" className="px-1.5 shrink-0" onClick={() => { calRef.current?.getApi().next(); updateTitle(); }}>
            <Icon name="ChevronRight" size={15} />
          </Button>

          {/* Часовой пояс — только десктоп, справа в той же строке */}
          <span className="hidden sm:flex items-center gap-1 ml-auto text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
            <Icon name="Globe" size={11} />
            {tzLabel(timezone)}
          </span>
        </div>
      )}

      {loading && <Icon name="Loader2" size={16} className="animate-spin text-muted-foreground shrink-0" />}
    </div>
  );
}
