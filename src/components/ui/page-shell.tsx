import { useState, useEffect, ReactNode } from "react";
import { useTheme } from "next-themes";

const SHELL_THEME_STYLES = `
  [data-shell-theme="dark"] {
    --shell-bg: linear-gradient(160deg, #1a1410 0%, #1c2018 35%, #14201c 65%, #101818 100%);
  }
  [data-shell-theme="light"] {
    --shell-bg: linear-gradient(160deg, #fdf7f0 0%, #f4f8f5 35%, #eef6f4 65%, #eaf4f2 100%);
  }
`;

interface PageShellProps {
  children: ReactNode;
  className?: string;
}

/**
 * Универсальная обёртка для страниц с единым стилем:
 * градиентный фон (тёмный/светлый) + ambient orbs.
 * Контент рендерится поверх через relative z-10.
 */
export default function PageShell({ children, className = "" }: PageShellProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <div
      data-shell-theme={isDark ? "dark" : "light"}
      className={`min-h-screen relative overflow-x-hidden transition-colors duration-500 ${className}`}
      style={{ background: "var(--shell-bg)" }}
    >
      <style dangerouslySetInnerHTML={{ __html: SHELL_THEME_STYLES }} />

      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute top-[-15%] left-[-10%] w-[55vw] h-[55vw] rounded-full blur-[120px]"
          style={{
            background: "radial-gradient(circle, rgba(200,131,74,0.08) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-[10%] right-[-10%] w-[45vw] h-[45vw] rounded-full blur-[100px]"
          style={{
            background: "radial-gradient(circle, rgba(143,168,154,0.07) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  );
}
