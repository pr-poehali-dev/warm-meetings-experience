import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";

interface FormSectionProps {
  id: string;
  icon: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  collapsible?: boolean;
  completed?: boolean;
  children: React.ReactNode;
}

export default function FormSection({
  icon,
  title,
  isOpen,
  onToggle,
  collapsible = true,
  completed = false,
  children,
}: FormSectionProps) {
  return (
    <Card className="overflow-hidden">
      {collapsible ? (
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/50 transition-colors"
        >
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-lg ${
              completed
                ? "bg-green-100 text-green-600"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {completed ? (
              <Icon name="Check" size={16} />
            ) : (
              <Icon name={icon} size={16} />
            )}
          </div>
          <span className="flex-1 font-medium text-sm">{title}</span>
          <Icon
            name="ChevronDown"
            size={18}
            className={`text-muted-foreground transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      ) : (
        <div className="flex items-center gap-3 px-5 py-4">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-lg ${
              completed
                ? "bg-green-100 text-green-600"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {completed ? (
              <Icon name="Check" size={16} />
            ) : (
              <Icon name={icon} size={16} />
            )}
          </div>
          <span className="flex-1 font-medium text-sm">{title}</span>
        </div>
      )}

      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <CardContent className="pt-0 pb-5 px-5">
            <div className="border-t pt-4">{children}</div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
