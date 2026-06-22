import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

export interface TourStep {
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
  bottom: number;
  right: number;
}

const PADDING = 10;
const CARD_W = 340;
const CARD_H = 170;
const GAP = 16;
const SAFE = 16;
const RADIUS = 12;

export default function OnboardingTour({ steps, open, onClose, onFinish }: OnboardingTourProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [vw, setVw] = useState(window.innerWidth);
  const [vh, setVh] = useState(window.innerHeight);

  const step = steps[index];
  const isLast = index === steps.length - 1;

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const readRect = useCallback(() => {
    setVw(window.innerWidth);
    setVh(window.innerHeight);
    if (!step?.target) { setRect(null); return; }
    const el = document.querySelector(step.target) as HTMLElement | null;
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right });
  }, [step]);

  // Прокрутка к элементу (с учётом вложенных скролл-контейнеров),
  // затем измерение реальных координат после завершения прокрутки.
  const scrollAndMeasure = useCallback(() => {
    if (!step?.target) { readRect(); return; }
    const el = document.querySelector(step.target) as HTMLElement | null;
    if (!el) { setRect(null); return; }

    const r = el.getBoundingClientRect();
    const margin = PADDING + GAP;
    const fullyVisible =
      r.top >= margin &&
      r.bottom <= window.innerHeight - margin &&
      r.left >= 0 &&
      r.right <= window.innerWidth;

    if (!fullyVisible) {
      // "auto" = мгновенно: координаты сразу корректны, без рассинхрона с подсветкой
      el.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
    }
    requestAnimationFrame(readRect);
  }, [step, readRect]);

  useLayoutEffect(() => {
    if (!open) return;
    scrollAndMeasure();
    const t = setTimeout(scrollAndMeasure, 60);
    window.addEventListener("resize", readRect);
    window.addEventListener("scroll", readRect, true);
    return () => { clearTimeout(t); window.removeEventListener("resize", readRect); window.removeEventListener("scroll", readRect, true); };
  }, [open, scrollAndMeasure, readRect]);

  if (!open || !step) return null;

  const next = () => (isLast ? onFinish() : setIndex((i) => i + 1));
  const prev = () => setIndex((i) => Math.max(0, i - 1));

  const isMobile = vw < 640;

  // Highlight area (с паддингом вокруг элемента)
  const hl = rect ? {
    x: rect.left - PADDING,
    y: rect.top - PADDING,
    w: rect.width + PADDING * 2,
    h: rect.height + PADDING * 2,
  } : null;

  // SVG overlay с вырезанным окном
  const svgOverlay = (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    >
      <defs>
        <mask id="tour-mask">
          <rect width={vw} height={vh} fill="white" />
          {hl && (
            <rect
              x={hl.x} y={hl.y} width={hl.w} height={hl.h}
              rx={RADIUS} ry={RADIUS}
              fill="black"
            />
          )}
        </mask>
      </defs>
      <rect
        width={vw} height={vh}
        fill="rgba(0,0,0,0.65)"
        mask="url(#tour-mask)"
      />
      {hl && (
        <rect
          x={hl.x} y={hl.y} width={hl.w} height={hl.h}
          rx={RADIUS} ry={RADIUS}
          fill="none"
          stroke="var(--color-primary, #c2622a)"
          strokeWidth="2"
        />
      )}
    </svg>
  );

  // Позиция карточки
  const cardStyle: React.CSSProperties = (() => {
    if (isMobile) {
      return {
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        width: `calc(100vw - 32px)`,
        maxWidth: 400,
      };
    }
    if (!hl) {
      return { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: CARD_W };
    }

    const spaceBelow = vh - (hl.y + hl.h);
    const spaceAbove = hl.y;
    const spaceRight = vw - (hl.x + hl.w);
    const spaceLeft = hl.x;

    let top: number, left: number;

    if (spaceBelow >= CARD_H + GAP + SAFE) {
      top = hl.y + hl.h + GAP;
      left = hl.x + hl.w / 2 - CARD_W / 2;
    } else if (spaceAbove >= CARD_H + GAP + SAFE) {
      top = hl.y - GAP - CARD_H;
      left = hl.x + hl.w / 2 - CARD_W / 2;
    } else if (spaceRight >= CARD_W + GAP + SAFE) {
      left = hl.x + hl.w + GAP;
      top = hl.y + hl.h / 2 - CARD_H / 2;
    } else if (spaceLeft >= CARD_W + GAP + SAFE) {
      left = hl.x - GAP - CARD_W;
      top = hl.y + hl.h / 2 - CARD_H / 2;
    } else {
      top = spaceBelow >= spaceAbove ? hl.y + hl.h + GAP : hl.y - GAP - CARD_H;
      left = hl.x + hl.w / 2 - CARD_W / 2;
    }

    left = Math.min(Math.max(left, SAFE), vw - CARD_W - SAFE);
    top = Math.min(Math.max(top, SAFE), vh - CARD_H - SAFE);

    return { position: "absolute", top, left, width: CARD_W };
  })();

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* Клик по затемнению закрывает тур */}
      <div className="absolute inset-0" onClick={onClose} />

      {svgOverlay}

      {/* Карточка с подсказкой */}
      <div
        className="bg-card text-card-foreground rounded-2xl shadow-2xl border p-4 transition-all duration-300"
        style={{ ...cardStyle, zIndex: 10 }}
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