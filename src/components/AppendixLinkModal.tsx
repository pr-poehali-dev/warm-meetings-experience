import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { appendices } from "@/pages/terms/termsAppendices";

interface Props {
  appendixId: number;
  label?: string;
}

export default function AppendixLinkModal({ appendixId, label }: Props) {
  const [open, setOpen] = useState(false);
  const appendix = appendices.find((a) => a.id === appendixId);

  if (!appendix) return null;

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        className="text-primary hover:text-primary/80 underline underline-offset-2 cursor-pointer"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {label ?? appendix.title}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="text-base leading-snug">{appendix.title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="px-6 pb-6 max-h-[65vh]">
            <div className="pr-4 pt-4">{appendix.content}</div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
