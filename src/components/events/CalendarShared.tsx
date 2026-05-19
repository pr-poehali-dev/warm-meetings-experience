import { useRef, useEffect, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { Link } from "react-router-dom";
import { EventItem } from "@/data/events";
import { parseISO, isBefore, startOfDay } from "date-fns";
import { getTypeMeta } from "./calendarUtils";

// ── индикатор мест ─────────────────────────────────────────────────────────────
export function SpotDot({ event }: { event: EventItem }) {
  const past = isBefore(parseISO(event.date), startOfDay(new Date()));
  if (past) return <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" title="Прошло" />;
  if (event.totalSpots === 0) return null;
  const pct = event.spotsLeft / event.totalSpots;
  const cls = pct === 0 ? "bg-red-500" : pct <= 0.3 ? "bg-yellow-400" : "bg-green-500";
  const label = pct === 0 ? "Мест нет" : pct <= 0.3 ? "Мало мест" : "Есть места";
  return <span className={`w-2 h-2 rounded-full ${cls} shrink-0`} title={label} />;
}

// ── мини-тултип (popup) при клике/hover ────────────────────────────────────────
export function EventTooltip({ event, onClose }: { event: EventItem; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const parent = ref.current.parentElement;
    if (!parent) return;
    const trigger = parent.getBoundingClientRect();
    const tip = ref.current.getBoundingClientRect();
    const margin = 8;
    const width = tip.width || 256;
    const height = tip.height || 200;

    let left = trigger.left;
    if (left + width > window.innerWidth - margin) {
      left = window.innerWidth - margin - width;
    }
    if (left < margin) left = margin;

    let top = trigger.bottom + 4;
    if (top + height > window.innerHeight - margin) {
      const above = trigger.top - 4 - height;
      if (above >= margin) top = above;
      else top = Math.max(margin, window.innerHeight - margin - height);
    }
    setPos({ top, left });
  }, []);

  const meta = getTypeMeta(event.type);
  const pct = event.totalSpots > 0 ? event.spotsLeft / event.totalSpots : 1;
  const spotsText =
    event.totalSpots === 0 ? "" :
    event.spotsLeft === 0 ? "Мест нет" :
    `${event.spotsLeft} ${event.spotsLeft === 1 ? "место" : event.spotsLeft < 5 ? "места" : "мест"}`;
  const spotsColor = pct === 0 ? "text-red-600" : pct <= 0.3 ? "text-yellow-600" : "text-green-600";

  const node = (
    <div
      ref={ref}
      className="z-[100] w-64 max-w-[calc(100vw-16px)] bg-card border border-border rounded-xl shadow-xl p-4 text-sm"
      style={{
        position: "fixed",
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        visibility: pos ? "visible" : "hidden",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2.5 h-2.5 rounded-full ${meta.dot} shrink-0`} />
        <span className="font-semibold text-foreground line-clamp-2">{event.title}</span>
      </div>
      <div className="space-y-1 text-muted-foreground text-xs">
        <div className="flex items-center gap-1.5">
          <Icon name="Clock" size={12} />
          {event.timeStart} — {event.timeEnd}
        </div>
        {event.bathName && (
          <div className="flex items-center gap-1.5">
            <Icon name="MapPin" size={12} />
            {event.bathName}
          </div>
        )}
        {event.priceLabel && (
          <div className="flex items-center gap-1.5">
            <Icon name="Banknote" size={12} />
            {event.priceLabel}
          </div>
        )}
        {spotsText && (
          <div className={`flex items-center gap-1.5 font-medium ${spotsColor}`}>
            <Icon name="Users" size={12} />
            {spotsText}
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-3">
        <Button asChild size="sm" className="flex-1 h-7 text-xs rounded-full">
          <Link to={`/events/${event.slug}`} onClick={onClose}>
            {event.spotsLeft === 0 ? "Подробнее" : "Записаться"}
          </Link>
        </Button>
      </div>
    </div>
  );

  if (typeof document === "undefined") return node;
  return createPortal(node, document.body);
}