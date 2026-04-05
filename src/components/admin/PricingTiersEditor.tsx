import { PricingTier } from "@/lib/organizer-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";

interface Props {
  tiers: PricingTier[];
  onChange: (tiers: PricingTier[]) => void;
}

const emptyTier = (): PricingTier => ({
  label: "",
  price_amount: 0,
  valid_until: null,
});

export default function PricingTiersEditor({ tiers, onChange }: Props) {
  const add = () => onChange([...tiers, emptyTier()]);

  const update = (i: number, patch: Partial<PricingTier>) => {
    const next = tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t));
    onChange(next);
  };

  const remove = (i: number) => onChange(tiers.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {tiers.length === 0 && (
        <p className="text-sm text-muted-foreground">Добавьте хотя бы одну ступень цены</p>
      )}
      {tiers.map((tier, i) => (
        <div key={i} className="border rounded-md p-3 space-y-2 bg-background">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">Ступень {i + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => remove(i)}
            >
              <Icon name="Trash2" size={15} />
            </Button>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Название ступени</Label>
            <Input
              placeholder="Раннее бронирование"
              value={tier.label}
              onChange={(e) => update(i, { label: e.target.value })}
              maxLength={200}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs mb-1 block">Цена, ₽</Label>
              <Input
                type="number"
                placeholder="10000"
                value={tier.price_amount || ""}
                onChange={(e) => update(i, { price_amount: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Действует до</Label>
              <Input
                type="date"
                value={tier.valid_until || ""}
                onChange={(e) => update(i, { valid_until: e.target.value || null })}
              />
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="mt-1">
        <Icon name="Plus" size={14} className="mr-1" />
        Добавить ступень
      </Button>
      <p className="text-xs text-muted-foreground">
        Оставьте «Действует до» пустым для последней (финальной) цены. Система автоматически покажет актуальную цену и таймер.
      </p>
    </div>
  );
}