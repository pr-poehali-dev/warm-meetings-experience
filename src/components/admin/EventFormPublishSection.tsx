import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import Icon from "@/components/ui/icon";
import FormSection from "./FormSection";

interface Event {
  is_visible: boolean;
  featured?: boolean;
  occupancy: string;
  consent_rules?: boolean;
  [key: string]: unknown;
}

interface Props {
  formData: Event;
  onFormChange: (data: Event) => void;
  sectionComplete: Record<string, boolean>;
}

export default function EventFormPublishSection({
  formData,
  onFormChange,
  sectionComplete,
}: Props) {
  return (
    <FormSection
      id="publish"
      icon="Globe"
      title="Публикация"
      isOpen={true}
      onToggle={() => {}}
      collapsible={false}
      completed={sectionComplete.publish}
    >
      <div className="space-y-5">
        <div
          className={`flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${
            formData.is_visible
              ? "border-green-200 bg-green-50"
              : "border-border bg-muted/30"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                formData.is_visible
                  ? "bg-green-100 text-green-600"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Icon
                name={formData.is_visible ? "Eye" : "EyeOff"}
                size={18}
              />
            </div>
            <div>
              <p className="font-medium text-sm">
                {formData.is_visible
                  ? "Мероприятие опубликовано"
                  : "Мероприятие скрыто (черновик)"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formData.is_visible
                  ? "Видно всем посетителям на сайте"
                  : "Только вы видите это мероприятие"}
              </p>
            </div>
          </div>
          <Switch
            checked={formData.is_visible}
            onCheckedChange={(checked) =>
              onFormChange({ ...formData, is_visible: checked })
            }
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="featured"
            checked={formData.featured || false}
            onChange={(e) =>
              onFormChange({ ...formData, featured: e.target.checked })
            }
            className="w-4 h-4 rounded"
          />
          <Label htmlFor="featured" className="cursor-pointer text-sm">
            <span className="font-medium">Избранное</span>
            <span className="text-muted-foreground ml-1.5">
              — выделить мероприятие на главной
            </span>
          </Label>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
          <div className="flex items-start gap-3">
            <Checkbox
              id="consentRules"
              checked={!!formData.consent_rules}
              onCheckedChange={(checked) =>
                onFormChange({ ...formData, consent_rules: checked === true })
              }
              className="mt-0.5"
            />
            <Label htmlFor="consentRules" className="text-sm leading-relaxed font-normal cursor-pointer text-amber-900">
              Я подтверждаю, что мероприятие не содержит запрещённых элементов (алкоголь, наркотики, оскорбительный контент и т.п.) и будет проведено в соответствии с Правилами сообщества
            </Label>
          </div>
        </div>

        <div className="max-w-xs">
          <Label htmlFor="occupancy">Загруженность</Label>
          <Select
            value={formData.occupancy}
            onValueChange={(value) =>
              onFormChange({ ...formData, occupancy: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Низкая</SelectItem>
              <SelectItem value="medium">Средняя</SelectItem>
              <SelectItem value="high">Высокая</SelectItem>
              <SelectItem value="full">Полная</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </FormSection>
  );
}