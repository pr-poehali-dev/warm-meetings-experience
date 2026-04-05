import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Icon from "@/components/ui/icon";
import ImageUpload from "./ImageUpload";
import PricingTiersEditor from "./PricingTiersEditor";
import { PricingTier } from "@/lib/organizer-api";

interface Event {
  occupancy: string;
  price: string;
  pricing_type?: 'fixed' | 'dynamic';
  pricing_lines?: string[];
  pricing_tiers?: PricingTier[];
  price_amount?: number;
  price_label?: string;
  total_spots?: number;
  spots_left?: number;
  featured?: boolean;
  program?: string[];
  rules?: string[];
  bath_name?: string;
  bath_address?: string;
  image_url: string;
  is_visible: boolean;
  [key: string]: unknown;
}

interface Props {
  formData: Event;
  onFormChange: (data: Event) => void;
}

export default function EventFormPricingSection({ formData, onFormChange }: Props) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="occupancy">Загруженность</Label>
          <Select
            value={formData.occupancy}
            onValueChange={(value) => onFormChange({ ...formData, occupancy: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Низкая</SelectItem>
              <SelectItem value="medium">Средняя</SelectItem>
              <SelectItem value="high">Высокая</SelectItem>
              <SelectItem value="full">Полная</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="price">Стоимость (краткая)</Label>
          <Input
            id="price"
            placeholder="Например: от 500₽, Бесплатно"
            value={formData.price}
            onChange={(e) => onFormChange({ ...formData, price: e.target.value })}
            maxLength={100}
          />
        </div>
      </div>

      <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
        <div>
          <Label className="text-sm font-semibold">Тип ценообразования</Label>
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={() => onFormChange({ ...formData, pricing_type: 'fixed' })}
              className={`flex-1 py-2.5 px-4 rounded-md border text-sm font-medium transition-colors ${(formData.pricing_type || 'fixed') === 'fixed' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-foreground hover:bg-muted'}`}
            >
              <Icon name="DollarSign" size={14} className="inline mr-1.5" />
              Фиксированная
            </button>
            <button
              type="button"
              onClick={() => onFormChange({ ...formData, pricing_type: 'dynamic' })}
              className={`flex-1 py-2.5 px-4 rounded-md border text-sm font-medium transition-colors ${formData.pricing_type === 'dynamic' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-foreground hover:bg-muted'}`}
            >
              <Icon name="TrendingUp" size={14} className="inline mr-1.5" />
              Динамическая
            </button>
          </div>
        </div>

        {(formData.pricing_type || 'fixed') === 'fixed' ? (
          <div className="space-y-3">
            <div>
              <Label htmlFor="pricing_lines">Описание стоимости</Label>
              <Textarea
                id="pricing_lines"
                placeholder={"10 738 ₽ — раннее бронирование (до 31 марта)\n12 738 ₽ — плановое бронирование (с 1 по 7 апреля)\nДетям до 16 лет — скидка 50%"}
                value={(formData.pricing_lines || []).join('\n')}
                onChange={(e) => onFormChange({ ...formData, pricing_lines: e.target.value.split('\n') })}
                rows={5}
              />
              <p className="text-xs text-muted-foreground mt-1">Каждый пункт с новой строки — будет показан со значком 🔹 на сайте</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="price_amount">Цена, ₽ (число)</Label>
                <Input
                  id="price_amount"
                  type="number"
                  value={formData.price_amount || 0}
                  onChange={(e) => onFormChange({ ...formData, price_amount: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="price_label">Цена (отображение)</Label>
                <Input
                  id="price_label"
                  placeholder="от 5 000 ₽"
                  value={formData.price_label || ''}
                  onChange={(e) => onFormChange({ ...formData, price_label: e.target.value })}
                  maxLength={100}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Ступени цен</Label>
            <PricingTiersEditor
              tiers={formData.pricing_tiers || []}
              onChange={(tiers) => onFormChange({ ...formData, pricing_tiers: tiers })}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="total_spots">Кол-во мест</Label>
          <Input
            id="total_spots"
            type="number"
            value={formData.total_spots || 0}
            onChange={(e) => {
              const total = parseInt(e.target.value) || 0;
              onFormChange({ ...formData, total_spots: total, spots_left: Math.min(formData.spots_left || total, total) });
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="spots_left">Свободных мест</Label>
          <Input
            id="spots_left"
            type="number"
            value={formData.spots_left || 0}
            onChange={(e) => onFormChange({ ...formData, spots_left: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="flex items-end gap-4 pb-1">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="featured"
              checked={formData.featured || false}
              onChange={(e) => onFormChange({ ...formData, featured: e.target.checked })}
              className="w-4 h-4"
            />
            <Label htmlFor="featured" className="cursor-pointer">Избранное</Label>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="program">Программа (каждый пункт с новой строки)</Label>
        <Textarea
          id="program"
          placeholder={"19:00 — Сбор, знакомство\n19:30 — Первый заход\n20:00 — Чайная церемония"}
          value={(formData.program || []).join('\n')}
          onChange={(e) => onFormChange({ ...formData, program: e.target.value.split('\n').filter(Boolean) })}
          rows={5}
        />
      </div>

      <div>
        <Label htmlFor="rules">Правила (каждое с новой строки)</Label>
        <Textarea
          id="rules"
          placeholder={"Без алкоголя\nУважаем личное пространство\nОпоздание до 15 минут"}
          value={(formData.rules || []).join('\n')}
          onChange={(e) => onFormChange({ ...formData, rules: e.target.value.split('\n').filter(Boolean) })}
          rows={4}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="bath_name">Название бани</Label>
          <Input
            id="bath_name"
            placeholder="Например: Высота 30"
            value={formData.bath_name || ''}
            onChange={(e) => onFormChange({ ...formData, bath_name: e.target.value })}
            maxLength={255}
          />
        </div>
        <div>
          <Label htmlFor="bath_address">Адрес</Label>
          <Input
            id="bath_address"
            placeholder="Москва, ул. ..."
            value={formData.bath_address || ''}
            onChange={(e) => onFormChange({ ...formData, bath_address: e.target.value })}
            maxLength={500}
          />
        </div>
      </div>

      <ImageUpload
        currentImageUrl={formData.image_url}
        onImageUploaded={(url) => onFormChange({ ...formData, image_url: url })}
      />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_visible"
          checked={formData.is_visible}
          onChange={(e) => onFormChange({ ...formData, is_visible: e.target.checked })}
          className="w-4 h-4"
        />
        <Label htmlFor="is_visible" className="cursor-pointer">
          Опубликовать мероприятие
        </Label>
      </div>
    </>
  );
}
