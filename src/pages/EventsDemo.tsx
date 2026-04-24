import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

// ─── Mock данные ──────────────────────────────────────────────────────────────

const EVENTS = [
  {
    id: 1,
    title: "Баня «У Лешего» — Мужской пар",
    type: "парение",
    typeIcon: "Flame",
    date: "Сб, 26 апр",
    time: "18:00",
    timeEnd: "23:00",
    place: "Баня «У Лешего»",
    city: "Москва",
    price: 2500,
    priceLabel: "2 500 ₽",
    spots: 10,
    spotsLeft: 3,
    featured: true,
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80",
    tags: ["Хамам", "Веники", "Чай"],
    rating: 4.9,
    reviews: 42,
    organizer: "Алексей П.",
    color: "from-orange-500 to-amber-400",
    typeColor: "bg-orange-100 text-orange-700",
  },
  {
    id: 2,
    title: "Баня + знакомства — Субботний вечер",
    type: "знакомство",
    typeIcon: "Users",
    date: "Сб, 3 мая",
    time: "19:00",
    timeEnd: "23:00",
    place: "Сандуны",
    city: "Москва",
    price: 3200,
    priceLabel: "3 200 ₽",
    spots: 12,
    spotsLeft: 7,
    featured: false,
    image: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800&q=80",
    tags: ["Нетворкинг", "Банкет", "18+"],
    rating: 4.7,
    reviews: 28,
    organizer: "Мария С.",
    color: "from-blue-500 to-indigo-400",
    typeColor: "bg-blue-100 text-blue-700",
  },
  {
    id: 3,
    title: "Мастер-класс: веничный массаж",
    type: "мастер-класс",
    typeIcon: "GraduationCap",
    date: "Вс, 4 мая",
    time: "11:00",
    timeEnd: "14:00",
    place: "Баня на Пресне",
    city: "Москва",
    price: 4500,
    priceLabel: "4 500 ₽",
    spots: 6,
    spotsLeft: 1,
    featured: true,
    image: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800&q=80",
    tags: ["Практика", "Сертификат"],
    rating: 5.0,
    reviews: 15,
    organizer: "Иван Т.",
    color: "from-violet-500 to-purple-400",
    typeColor: "bg-violet-100 text-violet-700",
  },
  {
    id: 4,
    title: "Женский ретрит — пар + медитация",
    type: "практика",
    typeIcon: "Sparkles",
    date: "Пт, 9 мая",
    time: "16:00",
    timeEnd: "21:00",
    place: "Варшавские бани",
    city: "Москва",
    price: 3800,
    priceLabel: "3 800 ₽",
    spots: 8,
    spotsLeft: 5,
    featured: false,
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80",
    tags: ["Женский", "Йога", "Дыхание"],
    rating: 4.8,
    reviews: 31,
    organizer: "Ольга В.",
    color: "from-pink-500 to-rose-400",
    typeColor: "bg-pink-100 text-pink-700",
  },
  {
    id: 5,
    title: "Зимняя баня + прорубь",
    type: "практика",
    typeIcon: "Snowflake",
    date: "Сб, 10 мая",
    time: "09:00",
    timeEnd: "13:00",
    place: "Высота 30",
    city: "Подмосковье",
    price: 2000,
    priceLabel: "2 000 ₽",
    spots: 15,
    spotsLeft: 0,
    featured: false,
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80",
    tags: ["Экстрим", "Природа"],
    rating: 4.6,
    reviews: 19,
    organizer: "Дмитрий К.",
    color: "from-cyan-500 to-sky-400",
    typeColor: "bg-cyan-100 text-cyan-700",
  },
  {
    id: 6,
    title: "Пятничный пар — свидания в бане",
    type: "свидание",
    typeIcon: "Heart",
    date: "Пт, 16 мая",
    time: "19:00",
    timeEnd: "23:00",
    place: "Сандуны",
    city: "Москва",
    price: 5500,
    priceLabel: "5 500 ₽",
    spots: 10,
    spotsLeft: 4,
    featured: true,
    image: "https://images.unsplash.com/photo-1609183480405-cc2750872f09?w=800&q=80",
    tags: ["Пары", "Романтика", "Ужин"],
    rating: 4.9,
    reviews: 23,
    organizer: "Алексей П.",
    color: "from-rose-500 to-pink-400",
    typeColor: "bg-rose-100 text-rose-700",
  },
];

const TYPES = ["Все", "парение", "знакомство", "мастер-класс", "практика", "свидание"];

// ─── Утилиты ─────────────────────────────────────────────────────────────────

function spotsText(left: number, total: number) {
  if (left === 0) return { text: "Мест нет", cls: "text-red-600" };
  if (left <= 2) return { text: `Осталось ${left}`, cls: "text-orange-500" };
  return { text: `${left} из ${total}`, cls: "text-emerald-600" };
}

function SpotsBar({ left, total }: { left: number; total: number }) {
  const pct = total > 0 ? Math.round(((total - left) / total) * 100) : 0;
  const color = left === 0 ? "bg-red-400" : left <= 2 ? "bg-orange-400" : "bg-emerald-400";
  return (
    <div className="h-1 rounded-full bg-black/10 overflow-hidden w-full">
      <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Вариант A: «Netflix-маркетплейс» ────────────────────────────────────────

function VariantA({ filter, setFilter }: { filter: string; setFilter: (v: string) => void }) {
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

// ─── Вариант B: «Airbnb-маркетплейс» ─────────────────────────────────────────

function VariantB({ filter, setFilter }: { filter: string; setFilter: (v: string) => void }) {
  const filtered = filter === "Все" ? EVENTS : EVENTS.filter(e => e.type === filter);
  const [listView, setListView] = useState(false);

  return (
    <div className="bg-[#FAF9F7] min-h-screen">
      {/* Sticky header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
            <Icon name="Search" size={16} className="text-gray-400" />
            <span className="text-sm text-gray-400">Поиск событий, мест, типов...</span>
          </div>
          <button className="p-2 rounded-full border hover:border-gray-400 transition-colors">
            <Icon name="SlidersHorizontal" size={16} />
          </button>
          <div className="hidden sm:flex border rounded-full overflow-hidden">
            <button onClick={() => setListView(false)} className={`px-3 py-1.5 text-sm transition-colors ${!listView ? "bg-gray-900 text-white" : "hover:bg-gray-50"}`}>
              <Icon name="LayoutGrid" size={15} />
            </button>
            <button onClick={() => setListView(true)} className={`px-3 py-1.5 text-sm transition-colors ${listView ? "bg-gray-900 text-white" : "hover:bg-gray-50"}`}>
              <Icon name="List" size={15} />
            </button>
          </div>
        </div>

        {/* Category pills */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
          {TYPES.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-sm font-medium transition-all ${
                filter === t
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white border-gray-200 text-gray-700 hover:border-gray-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <p className="text-sm text-gray-500 mb-5">{filtered.length} событий найдено</p>

        {listView ? (
          <div className="flex flex-col gap-4">
            {filtered.map(ev => {
              const sp = spotsText(ev.spotsLeft, ev.spots);
              return (
                <div key={ev.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex gap-0">
                  <div className="relative w-48 sm:w-64 shrink-0">
                    <img src={ev.image} alt={ev.title} className="w-full h-full object-cover" />
                    <div className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-1 rounded-full ${ev.typeColor}`}>{ev.type}</div>
                  </div>
                  <div className="flex-1 p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 leading-snug">{ev.title}</h3>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-gray-900">{ev.priceLabel}</div>
                          <div className="text-xs text-gray-400">/ человек</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-yellow-500 mb-2">
                        <Icon name="Star" size={13} className="fill-yellow-400" />
                        <span className="font-semibold text-gray-800">{ev.rating}</span>
                        <span className="text-gray-400">({ev.reviews} отзывов)</span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-3">
                        <span className="flex items-center gap-1"><Icon name="Calendar" size={13} />{ev.date}</span>
                        <span className="flex items-center gap-1"><Icon name="Clock" size={13} />{ev.time}–{ev.timeEnd}</span>
                        <span className="flex items-center gap-1"><Icon name="MapPin" size={13} />{ev.place}</span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {ev.tags.map(tag => (
                          <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                      <div>
                        <span className={`text-xs font-medium ${sp.cls}`}>{sp.text}</span>
                        {ev.spots > 0 && <SpotsBar left={ev.spotsLeft} total={ev.spots} />}
                      </div>
                      <Button size="sm" disabled={ev.spotsLeft === 0} className="rounded-full ml-3">
                        {ev.spotsLeft === 0 ? "Нет мест" : "Записаться"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(ev => {
              const sp = spotsText(ev.spotsLeft, ev.spots);
              return (
                <div key={ev.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer">
                  <div className="relative h-52 overflow-hidden">
                    <img src={ev.image} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className={`absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-full ${ev.typeColor}`}>{ev.type}</div>
                    <button className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform">
                      <Icon name="Heart" size={15} className="text-gray-400" />
                    </button>
                    {ev.featured && (
                      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1">
                        <Icon name="Award" size={10} /> Топ событие
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 flex-1">{ev.title}</h3>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-sm">{ev.priceLabel}</div>
                        <div className="text-[10px] text-gray-400">/ чел</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-yellow-500 mb-2.5">
                      <Icon name="Star" size={12} className="fill-yellow-400" />
                      <span className="font-semibold text-gray-700">{ev.rating}</span>
                      <span className="text-gray-400">· {ev.reviews} отзывов</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1"><Icon name="Calendar" size={11} />{ev.date}</span>
                      <span className="flex items-center gap-1"><Icon name="Clock" size={11} />{ev.time}</span>
                      <span className="flex items-center gap-1 truncate"><Icon name="MapPin" size={11} />{ev.place}</span>
                    </div>
                    <div className="flex gap-1 flex-wrap mb-3">
                      {ev.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{tag}</span>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Места</span>
                        <span className={`font-medium ${sp.cls}`}>{sp.text}</span>
                      </div>
                      <SpotsBar left={ev.spotsLeft} total={ev.spots} />
                    </div>
                    <Button size="sm" disabled={ev.spotsLeft === 0} className="w-full mt-3 rounded-xl">
                      {ev.spotsLeft === 0 ? "Мест нет" : "Записаться"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Вариант C: «Glassmorphism / Gradient» ───────────────────────────────────

function VariantC({ filter, setFilter }: { filter: string; setFilter: (v: string) => void }) {
  const filtered = filter === "Все" ? EVENTS : EVENTS.filter(e => e.type === filter);

  const TYPE_ICONS: Record<string, string> = {
    "Все": "LayoutGrid",
    "парение": "Flame",
    "знакомство": "Users",
    "мастер-класс": "GraduationCap",
    "практика": "Sparkles",
    "свидание": "Heart",
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)" }}>

      {/* Hero с анимированным текстом */}
      <div className="relative overflow-hidden px-4 pt-14 pb-10 text-center">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, #e94560 0%, transparent 50%), radial-gradient(circle at 80% 50%, #0f3460 0%, transparent 50%)"
        }} />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-1.5 text-white/80 text-xs font-medium mb-6">
            <Icon name="Sparkles" size={13} />
            Банный клуб СПАРКОМ
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3 leading-tight">
            Найди своё<br />
            <span className="bg-gradient-to-r from-orange-400 via-rose-400 to-pink-500 bg-clip-text text-transparent">банное событие</span>
          </h1>
          <p className="text-white/60 text-sm sm:text-base max-w-md mx-auto">
            Парение, мастер-классы, знакомства и ретриты — всё в одном месте
          </p>
        </div>
      </div>

      {/* Поиск */}
      <div className="max-w-2xl mx-auto px-4 mb-8">
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-2xl px-5 py-3">
          <Icon name="Search" size={18} className="text-white/40" />
          <span className="text-white/40 text-sm">Найти событие, место...</span>
          <div className="ml-auto flex gap-2">
            <button className="bg-white/10 hover:bg-white/20 transition rounded-xl px-3 py-1 text-white/60 text-xs flex items-center gap-1">
              <Icon name="Calendar" size={12} /> Дата
            </button>
            <button className="bg-white/10 hover:bg-white/20 transition rounded-xl px-3 py-1 text-white/60 text-xs flex items-center gap-1">
              <Icon name="MapPin" size={12} /> Место
            </button>
          </div>
        </div>
      </div>

      {/* Категории */}
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {TYPES.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                filter === t
                  ? "bg-white text-gray-900 border-white shadow-lg shadow-white/20"
                  : "bg-white/10 border-white/20 text-white/70 hover:bg-white/20 backdrop-blur"
              }`}
            >
              <Icon name={TYPE_ICONS[t] || "Tag"} size={14} />
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Featured большая карточка */}
      {filter === "Все" && (() => {
        const feat = EVENTS.find(e => e.featured) || EVENTS[0];
        return (
          <div className="max-w-7xl mx-auto px-4 mb-6">
            <div className="relative rounded-3xl overflow-hidden h-64 sm:h-80 group cursor-pointer">
              <img src={feat.image} alt={feat.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
              <div className="absolute inset-0 flex items-end sm:items-center p-6 sm:p-10">
                <div className="max-w-md">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Топ</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${feat.typeColor}`}>{feat.type}</span>
                  </div>
                  <h2 className="text-xl sm:text-3xl font-bold text-white mb-2 leading-tight">{feat.title}</h2>
                  <div className="flex flex-wrap gap-3 text-white/70 text-xs sm:text-sm mb-4">
                    <span className="flex items-center gap-1"><Icon name="Calendar" size={13} />{feat.date}</span>
                    <span className="flex items-center gap-1"><Icon name="MapPin" size={13} />{feat.place}</span>
                    <span className="flex items-center gap-1"><Icon name="Star" size={13} className="text-yellow-400" />{feat.rating}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button className="bg-white text-gray-900 hover:bg-white/90 font-bold rounded-full">
                      {feat.priceLabel} — Записаться
                    </Button>
                    <span className={`text-sm font-semibold ${spotsText(feat.spotsLeft, feat.spots).cls}`}>
                      {spotsText(feat.spotsLeft, feat.spots).text}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Карточки */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(ev => {
            const sp = spotsText(ev.spotsLeft, ev.spots);
            return (
              <div key={ev.id} className="group relative bg-white/8 backdrop-blur border border-white/10 rounded-2xl overflow-hidden hover:border-white/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                <div className="relative h-44 overflow-hidden">
                  <img src={ev.image} alt={ev.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-1 rounded-full ${ev.typeColor}`}>{ev.type}</div>
                  <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur rounded-full px-2 py-0.5 text-white text-xs font-bold">
                    {ev.priceLabel}
                  </div>
                  {ev.featured && (
                    <div className="absolute top-3 right-3 bg-yellow-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                      ТОП
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-1 text-xs text-yellow-400 mb-1.5">
                    <Icon name="Star" size={12} className="fill-yellow-400" />
                    <span className="font-semibold text-white">{ev.rating}</span>
                    <span className="text-white/40">· {ev.reviews} отзывов</span>
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2 leading-snug">{ev.title}</h3>
                  <div className="flex flex-wrap gap-2 text-white/50 text-xs mb-3">
                    <span className="flex items-center gap-1"><Icon name="Calendar" size={11} />{ev.date}</span>
                    <span className="flex items-center gap-1"><Icon name="Clock" size={11} />{ev.time}</span>
                    <span className="flex items-center gap-1 truncate max-w-[120px]"><Icon name="MapPin" size={11} />{ev.place}</span>
                  </div>
                  <div className="flex gap-1 mb-3 flex-wrap">
                    {ev.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 bg-white/10 text-white/60 rounded-full border border-white/10">{tag}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${sp.cls}`}>{sp.text}</span>
                    <Button size="sm" disabled={ev.spotsLeft === 0} className="rounded-full h-7 text-xs px-3 bg-white text-gray-900 hover:bg-white/90">
                      {ev.spotsLeft === 0 ? "Занято" : "Записаться"}
                    </Button>
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

// ─── Основная страница ────────────────────────────────────────────────────────

const VARIANTS = [
  { id: "A", label: "Netflix-стиль", icon: "Monitor", desc: "Тёмный фон, hover-оверлеи, кинематографичный" },
  { id: "B", label: "Airbnb-стиль", icon: "Home", desc: "Светлый, карточки + список, инпут поиска" },
  { id: "C", label: "Glassmorphism", icon: "Sparkles", desc: "Градиентный фон, стёкла, неон-акценты" },
] as const;

type VariantId = "A" | "B" | "C";

export default function EventsDemo() {
  const [variant, setVariant] = useState<VariantId>("A");
  const [filterA, setFilterA] = useState("Все");
  const [filterB, setFilterB] = useState("Все");
  const [filterC, setFilterC] = useState("Все");

  return (
    <div>
      {/* Шапка переключателя */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-bold text-base">Маркетплейс событий — СПАРКОМ</h1>
            <p className="text-xs text-muted-foreground">Демо концепций интерфейса</p>
          </div>
          <div className="flex gap-2">
            {VARIANTS.map(v => (
              <button
                key={v.id}
                onClick={() => setVariant(v.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all ${
                  variant === v.id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
                }`}
              >
                <Icon name={v.icon} size={14} />
                <span className="hidden sm:inline">{v.label}</span>
                <span className="sm:hidden">{v.id}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Описание активного варианта */}
        <div className="max-w-7xl mx-auto px-4 pb-2">
          {VARIANTS.map(v => v.id === variant && (
            <div key={v.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-[10px]">Вариант {v.id}</Badge>
              <span className="font-medium text-foreground">{v.label}</span>
              <span>·</span>
              <span>{v.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Рендер варианта */}
      <div>
        {variant === "A" && <VariantA filter={filterA} setFilter={setFilterA} />}
        {variant === "B" && <VariantB filter={filterB} setFilter={setFilterB} />}
        {variant === "C" && <VariantC filter={filterC} setFilter={setFilterC} />}
      </div>

      {/* Плашка навигации между вариантами снизу (мобильно) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 sm:hidden">
        <div className="flex gap-1 bg-black/80 backdrop-blur border border-white/20 rounded-2xl p-1 shadow-xl">
          {VARIANTS.map(v => (
            <button
              key={v.id}
              onClick={() => setVariant(v.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                variant === v.id ? "bg-white text-black" : "text-white/60 hover:text-white"
              }`}
            >
              {v.id}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
