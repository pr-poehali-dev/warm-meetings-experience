import Icon from "@/components/ui/icon";
import { privacyAppendices } from "./privacyAppendices";

export function PrivacyAppendicesSection({
  onOpenAppendix,
}: {
  onOpenAppendix: (id: number) => void;
}) {
  return (
    <>
      {/* ── Приложения ──────────────────────────────────────────────────────── */}
      <section className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-5 pb-2 border-b border-border">
          Приложения к Политике
        </h2>
        <p className="text-sm text-muted-foreground mb-5">
          Следующие документы являются неотъемлемой частью настоящей Политики
          конфиденциальности:
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {privacyAppendices.map((a) => (
            <button
              key={a.id}
              onClick={() => onOpenAppendix(a.id)}
              className="flex items-start gap-3 text-left p-4 rounded-xl border border-border bg-card hover:bg-muted/60 hover:border-primary/30 transition-all group"
            >
              <div className="mt-0.5 p-1.5 rounded-lg bg-primary/10 shrink-0">
                <Icon name="FileText" size={14} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug">
                  {a.title}
                </p>
              </div>
              <Icon
                name="ChevronRight"
                size={14}
                className="text-muted-foreground shrink-0 mt-1 ml-auto"
              />
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
