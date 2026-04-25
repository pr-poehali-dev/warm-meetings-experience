import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

// ─── Фотобанк СПАРКОМ ────────────────────────────────────────────────────────

const RECENT_KEY = "sparkom_recent_photos";
const MAX_RECENT = 8;

export interface PhotoBankItem {
  url: string;
  label: string;
  category: string;
}

const PHOTO_BANK: PhotoBankItem[] = [
  // Парная / интерьер
  {
    url: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/49689671-79f1-4c14-aec5-9069a7c903dd.jpg",
    label: "Баня с вениками",
    category: "парная",
  },
  {
    url: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/41260f21-4121-4f0f-a6b1-1d30bc7ffbb9.jpg",
    label: "Пар и камни",
    category: "парная",
  },
  {
    url: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/1a534a4b-278b-43ad-8f21-deb2a8c22f8e.jpg",
    label: "Камни — крупный план",
    category: "парная",
  },
  {
    url: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/7a31aff3-332c-4fef-bab9-ea474fc54513.jpg",
    label: "Свет в парной",
    category: "парная",
  },
  {
    url: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/0f9b7b49-f089-4321-a306-0bab23fdac24.jpg",
    label: "Листья и пар",
    category: "парная",
  },
  {
    url: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/67c13712-23cc-4bf0-b4d8-de3866457bad.jpg",
    label: "Берёзовый веник",
    category: "парная",
  },
  // Хаммам
  {
    url: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/aa7cddfe-548f-4381-8faf-d03e0575b4d8.jpg",
    label: "Хаммам",
    category: "хаммам",
  },
  {
    url: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/e3148794-33d4-464e-af66-4e6dd0fd4902.jpg",
    label: "Бассейн спа",
    category: "хаммам",
  },
  // Природа / снаружи
  {
    url: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/f0dac725-6a04-47af-adb9-9731f36fb387.jpg",
    label: "Баня у озера",
    category: "природа",
  },
  {
    url: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/6107109e-56df-476b-a768-2dcc4b8c5488.jpg",
    label: "Купель зимой",
    category: "природа",
  },
  {
    url: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/8fe780e4-5d97-4565-a73c-b1bbd1e843d9.jpg",
    label: "Баня ночью",
    category: "природа",
  },
  {
    url: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/64ae15c1-7a9d-406f-b729-8189727752d0.jpg",
    label: "Костёр после бани",
    category: "природа",
  },
  // Мастер / обучение
  {
    url: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/e22a133f-04a1-4f59-af46-f7d41d45defa.jpg",
    label: "Парение вениками",
    category: "мастер-класс",
  },
  {
    url: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/d46686ea-bba3-4611-a6f5-b5762e35ca30.jpg",
    label: "Мастер-класс",
    category: "мастер-класс",
  },
  // Общение / встречи
  {
    url: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/1324ecea-e080-44ff-9e67-47bccd0fe10e.jpg",
    label: "Компания в бане",
    category: "встречи",
  },
  {
    url: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/cf7a9646-dacc-45c8-ab6e-366805773c84.jpg",
    label: "Чаепитие",
    category: "встречи",
  },
  {
    url: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/d59368ab-7e09-44e6-86fd-1abc8316cf91.jpg",
    label: "Самовар и чай",
    category: "встречи",
  },
  {
    url: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/ceefe742-173a-4899-94ba-bdcd6a60ba67.jpg",
    label: "Нетворкинг",
    category: "встречи",
  },
  {
    url: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/b3469077-fcdd-4362-bd39-079bde7f4e69.jpg",
    label: "Знакомства",
    category: "встречи",
  },
  // Практики / велнес
  {
    url: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/f977651f-d39e-4e9d-b833-2cd83291e95e.jpg",
    label: "Медитация",
    category: "практика",
  },
  {
    url: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/0cedfa9d-1749-4747-8683-b5f4dbf09490.jpg",
    label: "Дыхательные практики",
    category: "практика",
  },
  {
    url: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/8756ba43-b327-4d98-8915-d40ae9098f48.jpg",
    label: "Женский ретрит",
    category: "практика",
  },
  // Интерьеры / люкс
  {
    url: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/b47043ca-980f-4d5b-87f6-8655f162d1b2.jpg",
    label: "Панорамная баня",
    category: "интерьер",
  },
  {
    url: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/980028e3-8a34-4cf1-b920-1afebea85cff.jpg",
    label: "Зона отдыха",
    category: "интерьер",
  },
  {
    url: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/77097e1f-65b0-4330-bcc4-4f9d51569376.jpg",
    label: "Комната отдыха",
    category: "интерьер",
  },
];

const CATEGORIES = ["все", "парная", "хаммам", "природа", "мастер-класс", "встречи", "практика", "интерьер"];

// ─── Хук для недавно использованных ─────────────────────────────────────────
export function useRecentPhotos() {
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const addRecent = (url: string) => {
    setRecent((prev) => {
      const next = [url, ...prev.filter((u) => u !== url)].slice(0, MAX_RECENT);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch (_e) { /* ignore */ }
      return next;
    });
  };

  return { recent, addRecent };
}

// ─── Компонент PhotoBank ──────────────────────────────────────────────────────
interface PhotoBankProps {
  currentUrl: string;
  onSelect: (url: string) => void;
  onClose: () => void;
}

export default function PhotoBank({ currentUrl, onSelect, onClose }: PhotoBankProps) {
  const [category, setCategory] = useState("все");
  const [search, setSearch] = useState("");
  const { recent, addRecent } = useRecentPhotos();

  const filtered = PHOTO_BANK.filter((p) => {
    const matchCat = category === "все" || p.category === category;
    const matchSearch = !search || p.label.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const recentItems = recent
    .map((url) => PHOTO_BANK.find((p) => p.url === url))
    .filter(Boolean) as PhotoBankItem[];

  const handleSelect = (url: string) => {
    addRecent(url);
    onSelect(url);
    onClose();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Поиск */}
      <div className="relative">
        <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Поиск фото..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Недавние */}
      {recentItems.length > 0 && !search && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Icon name="Clock" size={12} />
            Недавно использованные
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {recentItems.map((item) => (
              <PhotoThumb
                key={item.url}
                item={item}
                isSelected={currentUrl === item.url}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Категории */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              category === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Сетка фото */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-80 overflow-y-auto pr-1">
        {filtered.map((item) => (
          <PhotoThumb
            key={item.url}
            item={item}
            isSelected={currentUrl === item.url}
            onSelect={handleSelect}
          />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-4 text-center py-8 text-sm text-muted-foreground">
            Ничего не найдено
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {PHOTO_BANK.length} фото в банке · бесплатно для мероприятий СПАРКОМ
      </p>
    </div>
  );
}

// ─── Миниатюра ────────────────────────────────────────────────────────────────
function PhotoThumb({ item, isSelected, onSelect }: {
  item: PhotoBankItem;
  isSelected: boolean;
  onSelect: (url: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.url)}
      className={`relative group rounded-lg overflow-hidden aspect-video focus:outline-none transition-all ${
        isSelected ? "ring-2 ring-primary ring-offset-1" : "hover:ring-2 hover:ring-primary/50 hover:ring-offset-1"
      }`}
    >
      <img
        src={item.url}
        alt={item.label}
        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
        loading="lazy"
      />
      {isSelected && (
        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
          <div className="bg-primary text-primary-foreground rounded-full p-0.5">
            <Icon name="Check" size={12} />
          </div>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white text-[9px] leading-tight truncate">{item.label}</p>
      </div>
    </button>
  );
}