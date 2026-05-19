import { useEffect } from "react";

/**
 * Глобально следит за фокусом полей ввода (input/textarea/contenteditable)
 * и прокручивает их в видимую область над мобильной клавиатурой.
 *
 * Используется на корневом уровне приложения (один раз).
 */
export function useKeyboardAwareInputs() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|Mobile|Opera Mini/i.test(
        navigator.userAgent,
      ) || window.innerWidth < 900;
    if (!isMobile) return;

    const root = document.documentElement;

    const updateKeyboardVar = () => {
      const vv = window.visualViewport;
      if (!vv) {
        root.style.setProperty("--kb-offset", "0px");
        return;
      }
      const offset = Math.max(
        0,
        window.innerHeight - vv.height - vv.offsetTop,
      );
      root.style.setProperty("--kb-offset", `${offset}px`);
    };

    const isEditable = (el: EventTarget | null): el is HTMLElement => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === "INPUT") {
        const type = (el as HTMLInputElement).type;
        return ![
          "button",
          "submit",
          "reset",
          "checkbox",
          "radio",
          "file",
          "range",
          "color",
        ].includes(type);
      }
      return (
        tag === "TEXTAREA" ||
        el.isContentEditable ||
        el.getAttribute("role") === "textbox"
      );
    };

    const scrollIntoView = (el: HTMLElement) => {
      // Небольшая задержка чтобы клавиатура успела появиться
      window.setTimeout(() => {
        try {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        } catch {
          el.scrollIntoView();
        }
      }, 250);
    };

    const onFocusIn = (e: FocusEvent) => {
      if (isEditable(e.target)) {
        scrollIntoView(e.target);
      }
    };

    const onViewportResize = () => {
      updateKeyboardVar();
      const active = document.activeElement;
      if (isEditable(active)) {
        scrollIntoView(active);
      }
    };

    updateKeyboardVar();
    document.addEventListener("focusin", onFocusIn);
    window.visualViewport?.addEventListener("resize", onViewportResize);
    window.visualViewport?.addEventListener("scroll", updateKeyboardVar);

    return () => {
      document.removeEventListener("focusin", onFocusIn);
      window.visualViewport?.removeEventListener("resize", onViewportResize);
      window.visualViewport?.removeEventListener("scroll", updateKeyboardVar);
      root.style.removeProperty("--kb-offset");
    };
  }, []);
}
