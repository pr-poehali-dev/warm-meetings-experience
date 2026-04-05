import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Event {
  id?: number;
  title: string;
  short_description: string;
  full_description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  [key: string]: unknown;
}

interface Props {
  formData: Event;
  onFormChange: (data: Event) => void;
}

export default function EventFormBasicFields({ formData, onFormChange }: Props) {
  return (
    <>
      <div>
        <Label htmlFor="title">Название мероприятия *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => onFormChange({ ...formData, title: e.target.value })}
          maxLength={255}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">{(formData.title || '').length}/255</p>
      </div>

      <div>
        <Label htmlFor="short_description">Краткое описание (до 200 символов)</Label>
        <Input
          id="short_description"
          value={formData.short_description}
          onChange={(e) => onFormChange({ ...formData, short_description: e.target.value })}
          maxLength={200}
        />
      </div>

      <div>
        <Label htmlFor="full_description">Полное описание</Label>
        <Textarea
          id="full_description"
          value={formData.full_description}
          onChange={(e) => onFormChange({ ...formData, full_description: e.target.value })}
          rows={6}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="event_date">Дата мероприятия *</Label>
          <Input
            id="event_date"
            type="date"
            value={formData.event_date}
            onChange={(e) => onFormChange({ ...formData, event_date: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="start_time">Время начала</Label>
          <Input
            id="start_time"
            type="time"
            value={formData.start_time}
            onChange={(e) => onFormChange({ ...formData, start_time: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="end_time">Время окончания</Label>
          <Input
            id="end_time"
            type="time"
            value={formData.end_time}
            onChange={(e) => onFormChange({ ...formData, end_time: e.target.value })}
          />
        </div>
      </div>
    </>
  );
}
