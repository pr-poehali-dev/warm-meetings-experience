/**
 * BathCaptcha — «тёплая» капча в стиле бани.
 * Защищает публичные формы от ботов через простую арифметику с банными вопросами.
 *
 * Использование:
 *   const captcha = useBathCaptcha();
 *   <BathCaptcha {...captcha} />
 *   // Блокируй submit если !captcha.isValid
 */

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";

// ─── Данные ──────────────────────────────────────────────────────────────────

type CaptchaTask = { question: string; image: string; hint: string; answer: number };

const TASKS: CaptchaTask[] = [
  {
    image: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/9ac0077d-d0f8-4685-80b9-51206fb1bb77.jpg",
    question: "На каменку положили 8 камней, 3 убрали. Сколько камней осталось?",
    hint: "Камни любят тепло и простую математику",
    answer: 5,
  },
  {
    image: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/1189d6ed-62ab-4c3a-a345-76800b353855.jpg",
    question: "Берёзовый веник распаривается 10 минут. Дубовый — 5. Сколько минут разница?",
    hint: "Каждый веник требует своего времени",
    answer: 5,
  },
  {
    image: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/93080a27-b774-4cad-9e55-94892cc26723.jpg",
    question: "На полке 6 флаконов с маслом. Использовали 2. Сколько осталось?",
    hint: "Ароматы бани — дело тонкое",
    answer: 4,
  },
  {
    image: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/c729a9df-7ef4-4777-adca-705efa0f03fb.jpg",
    question: "В парилку зашли 4 человека, вышли 2. Сколько ещё парятся?",
    hint: "Кто-то любит погорячее",
    answer: 2,
  },
  {
    image: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/46ca1671-bb35-4ef9-8870-a1b9df2ce2ab.jpg",
    question: "Печь топили 3 часа утром и 2 часа вечером. Сколько часов всего?",
    hint: "Хорошая баня требует времени",
    answer: 5,
  },
  {
    image: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/e5c25c16-b943-408b-9156-84876d5cb54b.jpg",
    question: "В поленнице было 12 дров, подкинули ещё 4. Сколько стало?",
    hint: "Дрова — основа тепла",
    answer: 16,
  },
  {
    image: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/6766bfb6-bf3b-4fe3-91d5-c03c14173bcd.jpg",
    question: "Сколько поленьев нужно подкинуть в печку, если уже горит 2, а нужно 5?",
    hint: "Считайте, как в бане — спокойно и без спешки",
    answer: 3,
  },
  {
    image: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/5c6fbf75-7a77-4b79-9b0b-c106b1c8892d.jpg",
    question: "В чайник входит 4 чашки чая. Сколько чашек ещё помещается, если налили 1?",
    hint: "Тёплая математика для тёплой компании",
    answer: 3,
  },
  {
    image: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/9b2d4339-3be7-43ca-b23e-83a718b169f5.jpg",
    question: "В парилке +60°C, а нужно +90°C. На сколько градусов поднять температуру?",
    hint: "Аккуратно — пар любит точность",
    answer: 30,
  },
  {
    image: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/f7176144-3455-4fa5-8db7-bcaeb192fe08.jpg",
    question: "В шайке 3 ковша воды. Сколько ковшей долить, чтобы стало 7?",
    hint: "Не больше, не меньше",
    answer: 4,
  },
];

function randomTask(): CaptchaTask {
  return TASKS[Math.floor(Math.random() * TASKS.length)];
}

// ─── Хук ─────────────────────────────────────────────────────────────────────

export interface BathCaptchaState {
  task: CaptchaTask;
  value: string;
  isValid: boolean;
  onChange: (v: string) => void;
  reset: () => void;
}

export function useBathCaptcha(): BathCaptchaState {
  const [task, setTask] = useState<CaptchaTask>(randomTask);
  const [value, setValue] = useState("");

  const isValid = value.trim() !== "" && parseInt(value, 10) === task.answer;

  const reset = useCallback(() => {
    setTask(randomTask());
    setValue("");
  }, []);

  const onChange = useCallback((v: string) => setValue(v), []);

  return { task, value, isValid, onChange, reset };
}

// ─── Компонент ───────────────────────────────────────────────────────────────

interface BathCaptchaProps extends BathCaptchaState {
  className?: string;
}

export default function BathCaptcha({ task, value, isValid, onChange, reset, className }: BathCaptchaProps) {
  return (
    <div className={`rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 p-3 ${className ?? ""}`}>
      <div className="flex items-start gap-2 mb-2">
        <img
          src={task.image}
          alt=""
          className="w-10 h-10 rounded-lg object-cover shrink-0"
          style={{ mixBlendMode: "multiply" }}
        />
        <div className="flex-1">
          <div className="text-sm font-medium">{task.question}</div>
          <div className="text-[11px] text-muted-foreground">{task.hint}</div>
        </div>
        <button
          type="button"
          onClick={reset}
          className="text-muted-foreground hover:text-foreground p-1 transition-colors"
          title="Другой вопрос"
        >
          <Icon name="RefreshCw" size={14} />
        </button>
      </div>

      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ответ числом"
        className={
          value && !isValid
            ? "border-rose-400 focus-visible:ring-rose-300"
            : isValid
              ? "border-green-500 focus-visible:ring-green-300"
              : ""
        }
      />

      {isValid && (
        <div className="text-[11px] text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
          <Icon name="Flame" size={11} />
          Верно — печка горит!
        </div>
      )}
    </div>
  );
}
