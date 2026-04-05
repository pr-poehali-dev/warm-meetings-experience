import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";
import PricingTiersEditor from "./PricingTiersEditor";
import { PricingTier } from "@/lib/organizer-api";

interface Event {
  price: string;
  pricing_type?: "fixed" | "dynamic";
  pricing_lines?: string[];
  pricing_tiers?: PricingTier[];
  price_amount?: number;
  price_label?: string;
  total_spots?: number;
  spots_left?: number;
  [key: string]: unknown;
}

interface Props {
  formData: Event;
  onFormChange: (data: Event) => void;
}

export default function EventFormPricingSection({
  formData,
  onFormChange,
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-semibold">Тип ценообразования</Label>
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={() => onFormChange({ ...formData, pricing_type: "fixed" })}
            className={`flex-1 py-2.5 px-4 rounded-md border text-sm font-medium transition-colors ${
              (formData.pricing_type || "fixed") === "fixed"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-foreground hover:bg-muted"
            }`}
          >
            <Icon name="DollarSign" size={14} className="inline mr-1.5" />
            Фиксированная
          </button>
          <button
            type="button"
            onClick={() =>
              onFormChange({ ...formData, pricing_type: "dynamic" })
            }
            className={`flex-1 py-2.5 px-4 rounded-md border text-sm font-medium transition-colors ${
              formData.pricing_type === "dynamic"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-foreground hover:bg-muted"
            }`}
          >
            <Icon name="TrendingUp" size={14} className="inline mr-1.5" />
            Динамическая
          </button>
        </div>
      </div>

      {(formData.pricing_type || "fixed") === "fixed" ? (
        <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
          <div>
            <Label htmlFor="pricing_lines">Описание стоимости</Label>
            <Textarea
              id="pricing_lines"
              placeholder={
                "10 738 \u20BD \u2014 \u0440\u0430\u043D\u043D\u0435\u0435 \u0431\u0440\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 (\u0434\u043E 31 \u043C\u0430\u0440\u0442\u0430)\n12 738 \u20BD \u2014 \u043F\u043B\u0430\u043D\u043E\u0432\u043E\u0435 \u0431\u0440\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 (\u0441 1 \u043F\u043E 7 \u0430\u043F\u0440\u0435\u043B\u044F)\n\u0414\u0435\u0442\u044F\u043C \u0434\u043E 16 \u043B\u0435\u0442 \u2014 \u0441\u043A\u0438\u0434\u043A\u0430 50%"
              }
              value={(formData.pricing_lines || []).join("\n")}
              onChange={(e) =>
                onFormChange({
                  ...formData,
                  pricing_lines: e.target.value.split("\n"),
                })
              }
              rows={5}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Каждый пункт с новой строки
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="price_amount">Цена, &#8381; (число)</Label>
              <Input
                id="price_amount"
                type="number"
                value={formData.price_amount || 0}
                onChange={(e) =>
                  onFormChange({
                    ...formData,
                    price_amount: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="price_label">Цена (отображение)</Label>
              <Input
                id="price_label"
                placeholder="от 5 000 ₽"
                value={formData.price_label || ""}
                onChange={(e) =>
                  onFormChange({ ...formData, price_label: e.target.value })
                }
                maxLength={100}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
          <Label>Ступени цен</Label>
          <PricingTiersEditor
            tiers={formData.pricing_tiers || []}
            onChange={(tiers) =>
              onFormChange({ ...formData, pricing_tiers: tiers })
            }
          />
        </div>
      )}

      <div>
        <Label htmlFor="price">Стоимость (краткая)</Label>
        <Input
          id="price"
          placeholder="Например: от 500₽, Бесплатно"
          value={formData.price}
          onChange={(e) => onFormChange({ ...formData, price: e.target.value })}
          maxLength={100}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Короткий текст стоимости для карточки мероприятия
        </p>
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
              onFormChange({
                ...formData,
                total_spots: total,
                spots_left: Math.min(formData.spots_left || total, total),
              });
            }}
          />
        </div>
        <div>
          <Label htmlFor="spots_left">Свободных мест</Label>
          <Input
            id="spots_left"
            type="number"
            value={formData.spots_left || 0}
            onChange={(e) =>
              onFormChange({
                ...formData,
                spots_left: parseInt(e.target.value) || 0,
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
