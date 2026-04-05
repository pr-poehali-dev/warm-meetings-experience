import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Event {
  id?: number;
  title: string;
  short_description: string;
  full_description: string;
  [key: string]: unknown;
}

interface Props {
  formData: Event;
  onFormChange: (data: Event) => void;
}

export default function EventFormBasicFields({ formData, onFormChange }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">Название мероприятия *</Label>
        <Input
          id="title"
          placeholder="Например: Вечер знакомств в бане"
          value={formData.title}
          onChange={(e) => onFormChange({ ...formData, title: e.target.value })}
          maxLength={255}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          {(formData.title || "").length}/255
        </p>
      </div>

      <div>
        <Label htmlFor="short_description">Краткое описание</Label>
        <Input
          id="short_description"
          placeholder="Привлеките внимание одной фразой"
          value={formData.short_description}
          onChange={(e) =>
            onFormChange({ ...formData, short_description: e.target.value })
          }
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Привлеките внимание кратким описанием — его увидят в карточке.{" "}
          {(formData.short_description || "").length}/200
        </p>
      </div>

      <div>
        <Label htmlFor="full_description">Полное описание</Label>
        <Textarea
          id="full_description"
          placeholder="Расскажите, что ждёт участников, какая будет атмосфера..."
          value={formData.full_description}
          onChange={(e) =>
            onFormChange({ ...formData, full_description: e.target.value })
          }
          rows={5}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Расскажите подробнее — что ждёт участников, какая атмосфера
        </p>
      </div>
    </div>
  );
}
