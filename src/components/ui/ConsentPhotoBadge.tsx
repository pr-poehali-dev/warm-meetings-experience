import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ConsentPhotoBadgeProps {
  consent: "yes" | "no" | null | undefined;
  showLabel?: boolean;
}

export default function ConsentPhotoBadge({ consent, showLabel = false }: ConsentPhotoBadgeProps) {
  if (consent === "yes") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center gap-1 text-green-600 dark:text-green-400 ${showLabel ? "text-xs font-medium" : ""}`}>
              <span>📸</span>
              {showLabel && <span>Фото — да</span>}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Согласен(на) на фото в рекламе</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (consent === "no") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center gap-1 text-red-500 dark:text-red-400 ${showLabel ? "text-xs font-medium" : ""}`}>
              <span>🚫</span>
              {showLabel && <span>Фото — нет</span>}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Запрещает использование фото в рекламе</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return null;
}
