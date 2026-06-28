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
        @keyframes bath-steam {
          0%   { transform: translateY(0) scaleX(1);   opacity: 0; }
          15%  { opacity: 0.7; }
          50%  { transform: translateY(-22px) scaleX(1.4); opacity: 0.5; }
          100% { transform: translateY(-46px) scaleX(1.9); opacity: 0; }
        }
        @keyframes bath-sway {
          0%, 100% { transform: rotate(-7deg); }
          50%      { transform: rotate(7deg); }
        }
        @keyframes bath-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }
      `}</style>

      <div className="flex flex-col items-center gap-5 select-none">
        <div className="relative" style={{ width: 96, height: 104 }}>
          {/* Пар */}
          <div className="absolute inset-x-0 top-0 flex justify-center gap-3" style={{ height: 50 }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block rounded-full"
                style={{
                  width: 9,
                  height: 9,
                  background: "hsl(var(--primary) / 0.5)",
                  filter: "blur(2px)",
                  transformOrigin: "center bottom",
                  animation: `bath-steam 2.4s ease-in-out ${i * 0.5}s infinite`,
                }}
              />
            ))}
          </div>

          {/* Шайка с веничком */}
          <div
            className="absolute inset-x-0 bottom-0 flex justify-center"
            style={{ animation: "bath-bob 2.4s ease-in-out infinite" }}
          >
            <svg width="96" height="64" viewBox="0 0 96 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Веник */}
              <g style={{ transformOrigin: "48px 18px", animation: "bath-sway 2s ease-in-out infinite" }}>
                <rect x="45" y="4" width="6" height="20" rx="3" fill="hsl(var(--primary))" />
                <path
                  d="M48 2 C36 2 30 10 30 18 C42 18 54 18 66 18 C66 10 60 2 48 2 Z"
                  fill="hsl(var(--primary) / 0.85)"
                />
                <path d="M40 8 L40 17 M48 5 L48 17 M56 8 L56 17" stroke="hsl(var(--background))" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
              </g>

              {/* Деревянная шайка */}
              <path
                d="M20 30 H76 L70 58 C69.5 61 67 63 64 63 H32 C29 63 26.5 61 26 58 L20 30 Z"
                fill="hsl(var(--primary) / 0.18)"
                stroke="hsl(var(--primary))"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <ellipse cx="48" cy="30" rx="28" ry="6" fill="hsl(var(--primary) / 0.25)" stroke="hsl(var(--primary))" strokeWidth="2.5" />
              <path d="M33 40 H63 M31 50 H65" stroke="hsl(var(--primary) / 0.45)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
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
