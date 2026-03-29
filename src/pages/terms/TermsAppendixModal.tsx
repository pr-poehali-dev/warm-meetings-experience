import Icon from "@/components/ui/icon";
import { Appendix } from "./termsAppendices";

interface Props {
  appendix: Appendix;
  onClose: () => void;
}

export default function TermsAppendixModal({ appendix, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-background w-full sm:max-w-2xl max-h-[90dvh] sm:rounded-2xl rounded-t-2xl flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground leading-snug pr-2">
            {appendix.title}
          </h2>
          <button
            onClick={onClose}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
          >
            <Icon name="X" size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 text-foreground/90 leading-relaxed">
          {appendix.content}
        </div>
      </div>
    </div>
  );
}
