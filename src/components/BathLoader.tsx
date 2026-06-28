interface BathLoaderProps {
  label?: string;
  fullscreen?: boolean;
}

export default function BathLoader({ label = "Поддаём парку…", fullscreen = true }: BathLoaderProps) {
  const wrapper = fullscreen
    ? "min-h-screen bg-background flex items-center justify-center"
    : "w-full py-16 flex items-center justify-center";

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

            {/* ── Каменка с камнями ── */}
            <g>
              <rect x="44" y="92" width="62" height="30" rx="5" fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary))" strokeWidth="2.5" />
              {/* Камни */}
              <circle cx="58" cy="94" r="6" style={{ animation: "stones-glow 2.6s ease-in-out infinite" }} />
              <circle cx="72" cy="92" r="7" style={{ animation: "stones-glow 2.6s ease-in-out 0.2s infinite" }} />
              <circle cx="87" cy="94" r="6" style={{ animation: "stones-glow 2.6s ease-in-out 0.35s infinite" }} />
              <circle cx="98" cy="93" r="5" style={{ animation: "stones-glow 2.6s ease-in-out 0.1s infinite" }} />
              <circle cx="65" cy="90" r="4" style={{ animation: "stones-glow 2.6s ease-in-out 0.5s infinite" }} />
              <circle cx="80" cy="89" r="4" style={{ animation: "stones-glow 2.6s ease-in-out 0.28s infinite" }} />
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
