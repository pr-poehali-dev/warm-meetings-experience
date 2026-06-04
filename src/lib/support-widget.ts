type SupportTab = "faq" | "search" | "form";

/** Открыть плавающий виджет поддержки из любого места приложения. */
export function openSupportWidget(opts?: { tab?: SupportTab; role?: string }) {
  window.dispatchEvent(new CustomEvent("open-support", { detail: opts || {} }));
}
