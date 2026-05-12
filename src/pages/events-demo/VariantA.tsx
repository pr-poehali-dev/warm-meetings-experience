import { useState } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { EVENTS, TYPES, spotsText, SpotsBar } from "./eventsData";

export default function VariantA({ filter, setFilter }: { filter: string; setFilter: (v: string) => void }) {
  const filtered = filter === "Все" ? EVENTS : EVENTS.filter(e => e.type === filter);
  const hero = EVENTS.find(e => e.featured) || EVENTS[0];
  const [hoverId, setHoverId] = useState<number | null>(null);

  return (
    <div className="bg-[#0f0f0f] min-h-screen text-white">
      {/* Hero */}
      <div className="relative h-[380px] sm:h-[500px] overflow-hidden">
        <img src={hero.image} alt={hero.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
          <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${hero.typeColor} mb-3 inline-block`}>
            {hero.type}
          </span>
          <h1 className="text-2xl sm:text-4xl font-bold mb-2 max-w-xl leading-tight">{hero.title}</h1>
          <div className="flex items-center gap-4 text-white/70 text-sm mb-4 flex-wrap">
            <span className="flex items-center gap-1"><Icon name="Calendar" size={14} />{hero.date}</span>
            <span className="flex items-center gap-1"><Icon name="Clock" size={14} />{hero.time}</span>
            <span className="flex items-center gap-1"><Icon name="MapPin" size={14} />{hero.place}</span>
            <span className="flex items-center gap-1 text-yellow-400 font-semibold">
              <Icon name="Star" size={13} />{hero.rating}
              <span className="text-white/50 font-normal">({hero.reviews})</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button className="bg-white text-black hover:bg-white/90 font-bold rounded-full px-6">
              {hero.priceLabel} — Записаться
            </Button>
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-full">
              <Icon name="Share2" size={15} />
            </Button>
          </div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="px-6 sm:px-10 pt-8">
        <div className="flex gap-2 flex-wrap">
          {TYPES.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === t ? "bg-white text-black" : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Сетка */}
      <div className="px-6 sm:px-10 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(ev => {
            const sp = spotsText(ev.spotsLeft, ev.spots);
            return (
              <div
                key={ev.id}
                className="group relative rounded-2xl overflow-hidden cursor-pointer"
                onMouseEnter={() => setHoverId(ev.id)}
                onMouseLeave={() => setHoverId(null)}
              >
                <div className="relative h-48 sm:h-56">
                  <img src={ev.image} alt={ev.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  {ev.featured && (
                    <div className="absolute top-3 left-3 bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                      Топ
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ev.typeColor}`}>{ev.type}</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                      <span>{ev.date}, {ev.time}</span>
                      <span className={`font-semibold ${sp.cls.replace("text-", "text-")}`}>{sp.text}</span>
                    </div>
                    <p className="font-semibold text-sm leading-snug mb-1 line-clamp-2">{ev.title}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-white/50 text-xs flex items-center gap-1"><Icon name="MapPin" size={11} />{ev.place}</span>
                      <span className="text-amber-400 font-bold text-sm">{ev.priceLabel}</span>
                    </div>
                  </div>
                </div>
                {/* Hover-оверлей */}
                <div className={`absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 transition-opacity duration-200 ${hoverId === ev.id ? "opacity-100" : "opacity-0"}`}>
                  <Button className="bg-white text-black hover:bg-white/90 rounded-full px-6 font-bold">
                    Записаться
                  </Button>
                  <div className="flex gap-2 text-white/60 text-xs">
                    <span className="flex items-center gap-1"><Icon name="Star" size={12} className="text-yellow-400" />{ev.rating}</span>
                    <span>·</span>
                    <span>{ev.reviews} отзывов</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
