import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import FormSection from "./FormSection";
import ImageUpload from "./ImageUpload";

interface Event {
  event_date: string;
  start_time: string;
  end_time: string;
  bath_name?: string;
  bath_address?: string;
  image_url: string;
  program?: string[];
  rules?: string[];
  [key: string]: unknown;
}

interface Props {
  formData: Event;
  onFormChange: (data: Event) => void;
  openSections: Record<string, boolean>;
  onToggleSection: (key: string) => void;
  sectionComplete: Record<string, boolean>;
}

export default function EventFormScheduleLocation({
  formData,
  onFormChange,
  openSections,
  onToggleSection,
  sectionComplete,
}: Props) {
  return (
    <>
      <FormSection
        id="datetime"
        icon="Calendar"
        title="Дата и время"
        isOpen={openSections.datetime}
        onToggle={() => onToggleSection("datetime")}
        completed={sectionComplete.datetime}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="event_date">Дата мероприятия *</Label>
            <Input
              id="event_date"
              type="date"
              value={formData.event_date}
              onChange={(e) =>
                onFormChange({ ...formData, event_date: e.target.value })
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="start_time">Время начала</Label>
            <Input
              id="start_time"
              type="time"
              value={formData.start_time}
              onChange={(e) =>
                onFormChange({ ...formData, start_time: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="end_time">Время окончания</Label>
            <Input
              id="end_time"
              type="time"
              value={formData.end_time}
              onChange={(e) =>
                onFormChange({ ...formData, end_time: e.target.value })
              }
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        id="location"
        icon="MapPin"
        title="Место проведения"
        isOpen={openSections.location}
        onToggle={() => onToggleSection("location")}
        completed={sectionComplete.location}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bath_name">Название бани</Label>
            <Input
              id="bath_name"
              placeholder="Например: Высота 30"
              value={formData.bath_name || ""}
              onChange={(e) =>
                onFormChange({ ...formData, bath_name: e.target.value })
              }
              maxLength={255}
            />
          </div>
          <div>
            <Label htmlFor="bath_address">Адрес</Label>
            <Input
              id="bath_address"
              placeholder="Москва, ул. ..."
              value={formData.bath_address || ""}
              onChange={(e) =>
                onFormChange({ ...formData, bath_address: e.target.value })
              }
              maxLength={500}
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        id="cover"
        icon="Image"
        title="Обложка"
        isOpen={openSections.cover}
        onToggle={() => onToggleSection("cover")}
        completed={sectionComplete.cover}
      >
        <ImageUpload
          currentImageUrl={formData.image_url}
          onImageUploaded={(url) =>
            onFormChange({ ...formData, image_url: url })
          }
        />
      </FormSection>

      <FormSection
        id="program"
        icon="ListChecks"
        title="Программа и правила"
        isOpen={openSections.program}
        onToggle={() => onToggleSection("program")}
        completed={sectionComplete.program}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="program">
              Программа (каждый пункт с новой строки)
            </Label>
            <Textarea
              id="program"
              placeholder={
                "19:00 \u2014 \u0421\u0431\u043E\u0440, \u0437\u043D\u0430\u043A\u043E\u043C\u0441\u0442\u0432\u043E\n19:30 \u2014 \u041F\u0435\u0440\u0432\u044B\u0439 \u0437\u0430\u0445\u043E\u0434\n20:00 \u2014 \u0427\u0430\u0439\u043D\u0430\u044F \u0446\u0435\u0440\u0435\u043C\u043E\u043D\u0438\u044F"
              }
              value={(formData.program || []).join("\n")}
              onChange={(e) =>
                onFormChange({
                  ...formData,
                  program: e.target.value.split("\n").filter(Boolean),
                })
              }
              rows={5}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Опишите расписание мероприятия по пунктам
            </p>
          </div>

          <div>
            <Label htmlFor="rules">
              Правила (каждое с новой строки)
            </Label>
            <Textarea
              id="rules"
              placeholder={
                "\u0411\u0435\u0437 \u0430\u043B\u043A\u043E\u0433\u043E\u043B\u044F\n\u0423\u0432\u0430\u0436\u0430\u0435\u043C \u043B\u0438\u0447\u043D\u043E\u0435 \u043F\u0440\u043E\u0441\u0442\u0440\u0430\u043D\u0441\u0442\u0432\u043E\n\u041E\u043F\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0434\u043E 15 \u043C\u0438\u043D\u0443\u0442"
              }
              value={(formData.rules || []).join("\n")}
              onChange={(e) =>
                onFormChange({
                  ...formData,
                  rules: e.target.value.split("\n").filter(Boolean),
                })
              }
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Укажите важные правила для участников
            </p>
          </div>
        </div>
      </FormSection>
    </>
  );
}
