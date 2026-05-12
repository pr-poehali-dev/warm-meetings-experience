import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Icon from "@/components/ui/icon";
import { SignupFromAPI } from "@/lib/api";
import { STATUS_LABELS, STATUS_COLORS } from "./signupTypes";

interface SignupCardProps {
  signup: SignupFromAPI;
  onOpen: (signup: SignupFromAPI) => void;
  onStatusChange: (id: number, status: string) => void;
}

export default function SignupCard({ signup, onOpen, onStatusChange }: SignupCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onOpen(signup)}
    >
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="font-medium">{signup.name}</div>
          <div className="text-sm text-gray-500">
            {signup.phone}
            {signup.telegram && ` · ${signup.telegram}`}
          </div>
          {signup.event_title && (
            <div className="text-xs text-gray-400 mt-1">
              {signup.event_title} · {signup.event_date}
            </div>
          )}
          {signup.comment && (
            <div className="text-xs text-amber-700 mt-1 flex items-center gap-1">
              <Icon name="MessageSquare" size={12} />
              {signup.comment}
            </div>
          )}
        </div>

        <div
          className="flex items-center gap-2 flex-wrap"
          onClick={(e) => e.stopPropagation()}
        >
          <span
            className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[signup.status] || "bg-gray-100 text-gray-800"}`}
          >
            {STATUS_LABELS[signup.status] || signup.status}
          </span>

          {signup.status === "new" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-green-700 border-green-300 hover:bg-green-50"
                onClick={() => onStatusChange(signup.id, "confirmed")}
                title="Подтвердить"
              >
                <Icon name="Check" size={14} className="mr-1" />
                Подтвердить
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-red-700 border-red-300 hover:bg-red-50"
                onClick={() => onStatusChange(signup.id, "cancelled")}
                title="Отменить"
              >
                <Icon name="X" size={14} />
              </Button>
            </>
          )}

          {signup.phone && (
            <a
              href={`tel:${signup.phone}`}
              className="inline-flex items-center justify-center h-8 px-2 rounded-md border border-input bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Позвонить"
              onClick={(e) => e.stopPropagation()}
            >
              <Icon name="Phone" size={14} />
            </a>
          )}

          {signup.telegram && (
            <a
              href={`https://t.me/${signup.telegram.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-8 px-2 rounded-md border border-input bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Telegram"
              onClick={(e) => e.stopPropagation()}
            >
              <Icon name="Send" size={14} />
            </a>
          )}

          <Select
            value={signup.status}
            onValueChange={(v) => onStatusChange(signup.id, v)}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">Новая</SelectItem>
              <SelectItem value="confirmed">Подтверждена</SelectItem>
              <SelectItem value="cancelled">Отменена</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
