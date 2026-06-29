import { useEffect, useState } from "react";

interface BathLoaderProps {
  label?: string;
  fullscreen?: boolean;
}

export default function BathLoader({ label = "Поддаём парку…", fullscreen = true }: BathLoaderProps) {
  const wrapper = fullscreen
    ? "min-h-screen bg-background flex items-center justify-center"
    : "w-full py-16 flex items-center justify-center";

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Быстро до ~70%, потом замедляется, ждёт реального завершения
    const steps = [
      { target: 30, duration: 400 },
      { target: 60, duration: 600 },
      { target: 75, duration: 800 },
      { target: 88, duration: 1200 },
      { target: 95, duration: 2000 },
    ];
    let current = 0;
    let raf: number;

    const animate = (from: number, to: number, duration: number, onDone: () => void) => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setProgress(from + (to - from) * eased);
        if (t < 1) raf = requestAnimationFrame(tick);
        else onDone();
      };
      raf = requestAnimationFrame(tick);
    };

    const runStep = () => {
      if (current >= steps.length) return;
      const { target, duration } = steps[current];
      const from = current === 0 ? 0 : steps[current - 1].target;
      animate(from, target, duration, () => {
        current++;
        runStep();
      });
    };

    runStep();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={wrapper}>
      <style>{`
        @keyframes stones-glow {
          0%, 100% { fill: hsl(var(--primary) / 0.25); }
          50%      { fill: hsl(var(--primary) / 0.55); }
        }
        @keyframes loader-steam {
          0%   { opacity: 0; transform: translateY(8px) scaleX(0.8); }
          25%  { opacity: 0.7; }
          70%  { opacity: 0.4; }
          100% { opacity: 0; transform: translateY(-44px) scaleX(1.9); }
        }
        @keyframes progress-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      <div className="flex flex-col items-center gap-6 select-none">
        <div className="relative" style={{ width: 150, height: 130 }}>
          <svg width="150" height="130" viewBox="0 0 150 130" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* ── Пар над каменкой ── */}
            <g>
              {[0, 1, 2, 3].map((i) => (
                <ellipse
                  key={i}
                  cx={56 + i * 13}
                  cy={86}
                  rx={5}
                  ry={7}
                  fill="hsl(var(--primary) / 0.5)"
                  style={{
                    filter: "blur(2px)",
                    transformOrigin: `${56 + i * 13}px 86px`,
                    animation: `loader-steam 2.6s ease-in-out ${i * 0.45}s infinite`,
                  }}
                />
              ))}
            </g>

            {/* ── Камни ── */}
            <g>
              <rect x="44" y="92" width="62" height="30" rx="5" fill="none" stroke="none" />
              <circle cx="58" cy="94" r="6" style={{ animation: "stones-glow 2.6s ease-in-out infinite" }} />
              <circle cx="72" cy="92" r="7" style={{ animation: "stones-glow 2.6s ease-in-out 0.2s infinite" }} />
              <circle cx="87" cy="94" r="6" style={{ animation: "stones-glow 2.6s ease-in-out 0.35s infinite" }} />
              <circle cx="98" cy="93" r="5" style={{ animation: "stones-glow 2.6s ease-in-out 0.1s infinite" }} />
              <circle cx="65" cy="90" r="4" style={{ animation: "stones-glow 2.6s ease-in-out 0.5s infinite" }} />
              <circle cx="80" cy="89" r="4" style={{ animation: "stones-glow 2.6s ease-in-out 0.28s infinite" }} />
            </g>
          </svg>
        </div>

        {/* Полоса прогресса */}
        <div
          style={{ width: 150, height: 4, borderRadius: 9999, background: "rgba(180,80,50,0.15)" }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 9999,
              width: `${progress}%`,
              transition: "width 0.3s ease",
              background: "linear-gradient(90deg, #b45030 0%, #d4673a 50%, #b45030 100%)",
              backgroundSize: "200% 100%",
              animation: "progress-shimmer 1.8s linear infinite",
            }}
          />
        </div>

        {label && (
          <p className="text-sm font-medium tracking-wide" style={{ color: "hsl(var(--muted-foreground))" }}>
            {label}
          </p>
        )}
      </div>
    </div>
  );
}
