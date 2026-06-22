import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

export interface TourStep {
  /** CSS-селектор целевого элемента (обычно [data-tour="..."]). Пусто = шаг по центру экрана. */
  target?: string;
  title: string;
  description: string;
  icon?: string;
}

interface OnboardingTourProps {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
  onFinish: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;

export default function OnboardingTour({ steps, open, onClose, onFinish }: OnboardingTourProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = steps[index];
  const isLast = index === steps.length - 1;

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const measure = useCallback(() => {
    if (!step?.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.target) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    const t = setTimeout(measure, 320);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, measure]);

  if (!open || !step) return null;

  const next = () => (isLast ? onFinish() : setIndex((i) => i + 1));
  const prev = () => setIndex((i) => Math.max(0, i - 1));

  // Позиция карточки: под выделенным элементом, либо по центру
  const CARD_W = 320;
  const cardStyle: React.CSSProperties = (() => {
    if (!rect) {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceBelow = vh - (rect.top + rect.height);
    const placeBelow = spaceBelow > 220;
    const top = placeBelow ? rect.top + rect.height + PADDING + 6 : rect.top - PADDING - 6;

    // Если элемент в левой части экрана — карточка правее него,
    // если в правой — левее. Всегда остаётся в пределах экрана.
    let idealLeft: number;
    if (rect.left + rect.width / 2 < vw / 2) {
      // элемент слева — карточка от правого края элемента или от отступа
      idealLeft = Math.max(rect.right + 8, 12);
      // если не помещается справа — кладём просто с отступом 12px от края
      if (idealLeft + CARD_W > vw - 12) idealLeft = 12;
    } else {
      // элемент справа — карточка левее него
      idealLeft = rect.left - CARD_W - 8;
      if (idealLeft < 12) idealLeft = 12;
    }
    const left = Math.min(Math.max(idealLeft, 12), vw - CARD_W - 12);

    return {
      top,
      left,
      transform: placeBelow ? "none" : "translateY(-100%)",
    };
  })();

  const highlightStyle: React.CSSProperties | undefined = rect
    ? {
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      }
    : undefined;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* Затемнение с «дыркой» через box-shadow подсветки */}
      <div className="absolute inset-0 bg-black/60 transition-opacity" onClick={onClose} />

      {highlightStyle && (
        <div
          className="absolute rounded-xl ring-2 ring-primary pointer-events-none transition-all duration-300"
          style={{
            ...highlightStyle,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
          }}
        />
      )}

      {/* Карточка с подсказкой */}
      <div
        className="absolute w-[320px] max-w-[calc(100vw-24px)] bg-card text-card-foreground rounded-2xl shadow-2xl border p-4 transition-all duration-300"
        style={cardStyle}
      >
        <div className="flex items-start gap-3">
          {step.icon && (
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon name={step.icon} size={18} className="text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-sm leading-tight">{step.title}</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-snug">{step.description}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <Button size="sm" variant="ghost" onClick={prev} className="h-8 px-2">
                Назад
              </Button>
            )}
            <Button size="sm" onClick={next} className="h-8 gap-1">
              {isLast ? "Готово" : "Далее"}
              {!isLast && <Icon name="ArrowRight" size={14} />}
            </Button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-card border shadow flex items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label="Пропустить обучение"
        >
          <Icon name="X" size={14} />
        </button>
      </div>
    </div>,
    document.body
  );
}