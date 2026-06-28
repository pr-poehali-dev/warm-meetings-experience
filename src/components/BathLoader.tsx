interface BathLoaderProps {
  label?: string;
  fullscreen?: boolean;
}

export default function BathLoader({ label = "Поддаём парку…", fullscreen = true }: BathLoaderProps) {
  const wrapper = fullscreen
    ? "min-h-screen bg-background flex items-center justify-center relative overflow-hidden"
    : "w-full py-16 flex items-center justify-center relative overflow-hidden";

  // Фоновые слои пара: крупные полупрозрачные облака, медленно плывут вверх
  const fogLayers = [
    { size: 380, left: "8%", dur: 16, delay: 0, opacity: 0.1 },
    { size: 300, left: "55%", dur: 22, delay: 4, opacity: 0.08 },
    { size: 440, left: "30%", dur: 19, delay: 9, opacity: 0.07 },
    { size: 260, left: "72%", dur: 14, delay: 2, opacity: 0.09 },
    { size: 340, left: "-5%", dur: 25, delay: 12, opacity: 0.06 },
  ];

  // Цикл 3с: ковш наклоняется → выплёскивает воду → пар поднимается → возврат
  return (
    <div className={wrapper}>
      <style>{`
        @keyframes loader-fog {
          0%   { transform: translateY(18vh) scale(0.85); opacity: 0; }
          18%  { opacity: var(--fog-op); }
          80%  { opacity: var(--fog-op); }
          100% { transform: translateY(-115vh) scale(1.6); opacity: 0; }
        }
        @keyframes ladle-pour {
          0%, 100% { transform: rotate(0deg); }
          25%      { transform: rotate(48deg); }
          55%      { transform: rotate(48deg); }
          75%      { transform: rotate(0deg); }
        }
        @keyframes water-splash {
          0%, 22%  { opacity: 0; transform: translate(0, 0) scaleY(0.4); }
          30%      { opacity: 1; transform: translate(2px, 6px) scaleY(1); }
          52%      { opacity: 1; transform: translate(4px, 26px) scaleY(1.15); }
          60%      { opacity: 0; transform: translate(5px, 34px) scaleY(0.6); }
          100%     { opacity: 0; }
        }
        @keyframes water-drop {
          0%, 26%  { opacity: 0; transform: translate(0, 0); }
          34%      { opacity: 1; }
          58%      { opacity: 1; transform: translate(3px, 30px); }
          64%      { opacity: 0; transform: translate(4px, 36px); }
          100%     { opacity: 0; }
        }
        @keyframes stones-glow {
          0%, 45%  { fill: hsl(var(--primary) / 0.25); }
          58%      { fill: hsl(var(--primary) / 0.55); }
          80%      { fill: hsl(var(--primary) / 0.25); }
        }
        @keyframes loader-steam {
          0%, 50%  { opacity: 0; transform: translateY(6px) scaleX(0.8); }
          62%      { opacity: 0.75; }
          85%      { transform: translateY(-26px) scaleX(1.5); opacity: 0.3; }
          100%     { opacity: 0; transform: translateY(-40px) scaleX(1.9); }
        }
      `}</style>

      {/* Фоновые слои пара, плывущие вверх */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {fogLayers.map((f, i) => (
          <div
            key={i}
            className="absolute bottom-0 rounded-full"
            style={{
              width: f.size,
              height: f.size,
              left: f.left,
              background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)",
              filter: "blur(28px)",
              ["--fog-op" as string]: f.opacity,
              animation: `loader-fog ${f.dur}s linear ${f.delay}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center gap-6 select-none">
        <div className="relative" style={{ width: 150, height: 130 }}>
          <svg width="150" height="130" viewBox="0 0 150 130" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* ── Пар над каменкой ── */}
            <g>
              {[0, 1, 2].map((i) => (
                <ellipse
                  key={i}
                  cx={60 + i * 14}
                  cy={86}
                  rx={5}
                  ry={7}
                  fill="hsl(var(--primary) / 0.5)"
                  style={{
                    filter: "blur(2px)",
                    transformOrigin: `${60 + i * 14}px 86px`,
                    animation: `loader-steam 3s ease-in-out ${i * 0.25}s infinite`,
                  }}
                />
              ))}
            </g>

            {/* ── Каменка с камнями ── */}
            <g>
              <rect x="44" y="92" width="62" height="30" rx="5" fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary))" strokeWidth="2.5" />
              {/* Камни */}
              <circle cx="58" cy="94" r="6" style={{ animation: "stones-glow 3s ease-in-out infinite" }} />
              <circle cx="72" cy="92" r="7" style={{ animation: "stones-glow 3s ease-in-out 0.1s infinite" }} />
              <circle cx="87" cy="94" r="6" style={{ animation: "stones-glow 3s ease-in-out 0.15s infinite" }} />
              <circle cx="98" cy="93" r="5" style={{ animation: "stones-glow 3s ease-in-out 0.05s infinite" }} />
              <circle cx="65" cy="90" r="4" style={{ animation: "stones-glow 3s ease-in-out 0.2s infinite" }} />
              <circle cx="80" cy="89" r="4" style={{ animation: "stones-glow 3s ease-in-out 0.12s infinite" }} />
            </g>

            {/* ── Струя воды и капли ── */}
            <g>
              <path
                d="M64 38 Q66 52 68 64"
                stroke="hsl(var(--primary) / 0.7)"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
                style={{ transformOrigin: "64px 38px", animation: "water-splash 3s ease-in-out infinite" }}
              />
              <circle cx="66" cy="46" r="2.5" fill="hsl(var(--primary) / 0.7)" style={{ animation: "water-drop 3s ease-in-out 0.05s infinite" }} />
              <circle cx="62" cy="42" r="2" fill="hsl(var(--primary) / 0.6)" style={{ animation: "water-drop 3s ease-in-out 0.18s infinite" }} />
            </g>

            {/* ── Ковш (наклоняется) ── */}
            <g style={{ transformOrigin: "58px 28px", animation: "ladle-pour 3s ease-in-out infinite" }}>
              {/* Длинная ручка */}
              <rect x="58" y="20" width="58" height="7" rx="3.5" fill="hsl(var(--primary))" />
              <rect x="108" y="14" width="9" height="19" rx="4" fill="hsl(var(--primary))" />
              {/* Чаша ковша */}
              <path
                d="M40 14 H66 L62 34 C61.4 37 58.8 39 55.6 39 H50.4 C47.2 39 44.6 37 44 34 L40 14 Z"
                fill="hsl(var(--primary) / 0.2)"
                stroke="hsl(var(--primary))"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <ellipse cx="53" cy="14" rx="13" ry="3.5" fill="hsl(var(--primary) / 0.45)" stroke="hsl(var(--primary))" strokeWidth="2.5" />
            </g>
          </svg>
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