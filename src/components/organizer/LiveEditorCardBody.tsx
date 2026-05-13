import { useState } from "react";
import { OrgEvent, PricingTier } from "@/lib/organizer-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Icon from "@/components/ui/icon";
import { format, parseISO, isValid } from "date-fns";
import { ru } from "date-fns/locale";
import PricingTiersEditor from "@/components/admin/PricingTiersEditor";
import CoOrganizersPanel from "./CoOrganizersPanel";
import CrowdfundEditor from "./CrowdfundEditor";
import {
  InlineText,
  InlineList,
  InlinePricingLines,
  spotsColor,
} from "./LiveEditorInlineFields";

interface Props {
  fd: OrgEvent;
  set: (patch: Partial<OrgEvent>) => void;
}

export default function LiveEditorCardBody({ fd, set }: Props) {
  const [showPricingPanel, setShowPricingPanel] = useState(false);

  const hasDate = fd.event_date && fd.event_date.length >= 10;
  let dateObj: Date | null = null;
  if (hasDate) {
    try {
      const d = parseISO(fd.event_date);
      if (isValid(d)) dateObj = d;
    } catch (_) {
      /* ignore */
    }
  }

  const spotsLeft = fd.spots_left ?? 0;
  const totalSpots = fd.total_spots ?? 0;
  const priceDisplay =
    fd.price_label ||
    (fd.price_amount ? `${fd.price_amount.toLocaleString("ru-RU")} ₽` : "");

  return (
    <div className="border border-t-0 rounded-b-2xl bg-card px-5 pt-4 pb-5 space-y-4 mb-4">
      {/* Date & time row */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Дата начала</div>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Icon name="Calendar" size={14} className="text-muted-foreground flex-shrink-0" />
            <input
              type="date"
              value={fd.event_date || ""}
              onChange={(e) => set({ event_date: e.target.value })}
              className="bg-transparent border-0 outline-none cursor-pointer text-sm text-foreground hover:text-primary transition-colors focus:text-primary [color-scheme:light]"
            />
          </label>
          {dateObj && (
            <div className="text-xs text-muted-foreground/60 mt-0.5 pl-5">
              {format(dateObj, "EEEE", { locale: ru })}
            </div>
          )}
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Дата окончания <span className="text-muted-foreground/50">(если несколько дней)</span></div>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Icon name="CalendarCheck" size={14} className="text-muted-foreground flex-shrink-0" />
            <input
              type="date"
              value={fd.end_date || ""}
              min={fd.event_date || ""}
              onChange={(e) => set({ end_date: e.target.value || null })}
              className="bg-transparent border-0 outline-none cursor-pointer text-sm text-foreground hover:text-primary transition-colors focus:text-primary [color-scheme:light]"
            />
            {fd.end_date && (
              <button
                type="button"
                onClick={() => set({ end_date: null })}
                className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                title="Убрать дату окончания"
              >
                <Icon name="X" size={12} />
              </button>
            )}
          </label>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Время начала</div>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Icon name="Clock" size={14} className="text-muted-foreground flex-shrink-0" />
            <input
              type="time"
              value={fd.start_time || ""}
              onChange={(e) => set({ start_time: e.target.value })}
              className="bg-transparent border-0 outline-none cursor-pointer text-sm text-foreground hover:text-primary transition-colors w-24"
            />
          </label>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Время окончания</div>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Icon name="Clock" size={14} className="text-muted-foreground flex-shrink-0" />
            <input
              type="time"
              value={fd.end_time || ""}
              onChange={(e) => set({ end_time: e.target.value })}
              className="bg-transparent border-0 outline-none cursor-pointer text-sm text-foreground hover:text-primary transition-colors w-24"
            />
          </label>
        </div>
      </div>

      {/* Title */}
      <InlineText
        value={fd.title}
        onChange={(v) => set({ title: v })}
        placeholder="Название события"
        className="text-xl font-bold leading-snug"
        maxLength={255}
      />

      {/* Short description */}
      <InlineText
        value={fd.short_description}
        onChange={(v) => set({ short_description: v })}
        placeholder="Краткое описание — его увидят в карточке каталога"
        className="text-sm text-muted-foreground leading-relaxed"
        multiline
        maxLength={200}
        hint="Привлеките внимание кратким описанием"
      />

      {/* Location */}
      <div className="flex items-start gap-2">
        <Icon
          name="MapPin"
          size={14}
          className="text-muted-foreground mt-0.5 flex-shrink-0"
        />
        <div className="flex-1 space-y-1">
          <InlineText
            value={fd.bath_name || ""}
            onChange={(v) => set({ bath_name: v })}
            placeholder="Название места"
            className="text-sm font-medium"
            maxLength={255}
          />
          <InlineText
            value={fd.bath_address || ""}
            onChange={(v) => set({ bath_address: v })}
            placeholder="Адрес"
            className="text-xs text-muted-foreground"
            maxLength={500}
          />
        </div>
      </div>

      {/* Spots */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Icon name="Users" size={14} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Мест:</span>
          <input
            type="number"
            value={totalSpots || ""}
            onChange={(e) => {
              const v = parseInt(e.target.value) || 0;
              set({
                total_spots: v,
                spots_left: Math.min(fd.spots_left || v, v),
              });
            }}
            className="w-14 text-sm font-medium bg-transparent border-b border-dashed border-muted-foreground/30 outline-none text-center hover:border-primary focus:border-primary transition-colors"
            placeholder="∞"
          />
        </div>
        {totalSpots > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Свободно:</span>
            <input
              type="number"
              value={spotsLeft || ""}
              min={0}
              max={totalSpots}
              onChange={(e) => {
                const v = Math.min(parseInt(e.target.value) || 0, totalSpots);
                set({ spots_left: v });
              }}
              className="w-14 text-sm font-medium bg-transparent border-b border-dashed border-muted-foreground/30 outline-none text-center hover:border-primary focus:border-primary transition-colors"
              placeholder="0"
            />
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${spotsColor(spotsLeft)}`}
            >
              {spotsLeft === 0
                ? "Мест нет"
                : spotsLeft <= 2
                  ? `Последние ${spotsLeft}`
                  : `Осталось ${spotsLeft}`}
            </span>
          </div>
        )}
      </div>

      <div className="border-t" />

      {/* Full description */}
      <div>
        <h3 className="font-semibold text-sm mb-2">О встрече</h3>
        <InlineText
          value={fd.full_description || ""}
          onChange={(v) => set({ full_description: v })}
          placeholder="Полное описание — расскажите, что ждёт участников, какая атмосфера…"
          className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line"
          multiline
          inputClassName="text-sm leading-relaxed"
        />
      </div>

      {/* Program */}
      <div>
        <h3 className="font-semibold text-sm mb-2">Программа</h3>
        <InlineList
          items={fd.program || []}
          onChange={(v) => set({ program: v })}
          placeholder="Добавить программу (расписание по пунктам)"
          icon="num"
        />
      </div>

      {/* Rules */}
      <div>
        <h3 className="font-semibold text-sm mb-2">Правила</h3>
        <InlineList
          items={fd.rules || []}
          onChange={(v) => set({ rules: v })}
          placeholder="Добавить правила участия"
          icon="Shield"
        />
      </div>

      <div className="border-t" />

      {/* ── PRICING BLOCK ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Стоимость</h3>
          <button
            type="button"
            onClick={() => setShowPricingPanel(!showPricingPanel)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Icon name="Settings" size={12} />
            Настроить
          </button>
        </div>

        {showPricingPanel && (
          <div className="border rounded-lg p-4 bg-muted/30 mb-3 space-y-3">
            {/* Переключатель режима: обычное ценообразование vs вскладчину */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: "fixed", label: "Обычная цена", icon: "DollarSign" },
                { v: "crowdfund", label: "В складчину", icon: "Users" },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => set({ pricing_mode: opt.v as "fixed" | "crowdfund" })}
                  className={`py-2 px-3 rounded border text-xs font-medium transition-colors ${
                    (fd.pricing_mode || "fixed") === opt.v
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:bg-muted"
                  }`}
                >
                  <Icon name={opt.icon} size={12} className="inline mr-1" />
                  {opt.label}
                </button>
              ))}
            </div>

            {(fd.pricing_mode || "fixed") === "crowdfund" ? (
              <CrowdfundEditor fd={fd} set={set} />
            ) : (
              <>
                <div className="flex gap-2">
                  {["fixed", "dynamic"].map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() =>
                        set({ pricing_type: pt as "fixed" | "dynamic" })
                      }
                      className={`flex-1 py-2 px-3 rounded border text-xs font-medium transition-colors ${
                        (fd.pricing_type || "fixed") === pt
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:bg-muted"
                      }`}
                    >
                      <Icon
                        name={pt === "fixed" ? "DollarSign" : "TrendingUp"}
                        size={12}
                        className="inline mr-1"
                      />
                      {pt === "fixed" ? "Фиксированная" : "Динамическая"}
                    </button>
                  ))}
                </div>

                {(fd.pricing_type || "fixed") === "fixed" ? (
                  <div className="space-y-3">
                    <InlinePricingLines
                      lines={fd.pricing_lines || []}
                      onChange={(v) => set({ pricing_lines: v })}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">
                          Цена, ₽ (число)
                        </label>
                        <Input
                          type="number"
                          value={fd.price_amount || ""}
                          onChange={(e) =>
                            set({ price_amount: parseInt(e.target.value) || 0 })
                          }
                          className="h-8 text-sm"
                          placeholder="5000"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">
                          Отображение цены
                        </label>
                        <Input
                          value={fd.price_label || ""}
                          onChange={(e) => set({ price_label: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="от 5 000 ₽"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <PricingTiersEditor
                    tiers={fd.pricing_tiers || []}
                    onChange={(tiers: PricingTier[]) =>
                      set({ pricing_tiers: tiers })
                    }
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* price display */}
        {fd.pricing_mode === "crowdfund" ? (
          <div className="rounded-lg border border-orange-200 bg-orange-50/60 p-3 text-sm space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-orange-900">
              <Icon name="Users" size={14} />
              Сбор в складчину
            </div>
            <div className="text-xs text-orange-900/80">
              Цель: <b>{Number(fd.cf_target_amount || 0).toLocaleString("ru-RU")} ₽</b> ·{" "}
              мин. <b>{fd.cf_min_participants || "?"}</b> / макс.{" "}
              <b>{fd.cf_max_participants || "?"}</b> чел.
            </div>
            <div className="text-xs text-orange-900/80">
              Клубный взнос:{" "}
              <b>
                {fd.cf_fee_mode === "percent"
                  ? `${fd.cf_fee_percent || 0}% от макс. цены`
                  : `${(fd.cf_club_fee || 0).toLocaleString("ru-RU")} ₽`}
              </b>{" "}
              · Стоп-сбор за <b>{fd.cf_freeze_hours || 48}ч</b>
            </div>
          </div>
        ) : fd.pricing_type === "dynamic" && fd.pricing_tiers?.length ? (
          <div className="space-y-1">
            {fd.pricing_tiers.map((tier, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">{tier.label}</span>
                <span className="font-semibold text-accent">
                  {tier.price_amount.toLocaleString("ru-RU")} ₽
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {priceDisplay ? (
              <div className="text-2xl font-bold text-accent">
                {priceDisplay}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowPricingPanel(true)}
                className="text-sm text-muted-foreground/60 italic hover:text-primary transition-colors"
              >
                Нажмите «Настроить», чтобы указать стоимость
              </button>
            )}
            {(fd.pricing_lines || []).filter(Boolean).length > 0 && (
              <InlinePricingLines
                lines={fd.pricing_lines || []}
                onChange={(v) => set({ pricing_lines: v })}
              />
            )}
          </div>
        )}
      </div>

      <div className="border-t" />

      {/* ── PUBLISH SETTINGS ── */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Публикация</h3>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => set({ is_private: false })}
            className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
              !fd.is_private
                ? "border-green-400 bg-green-50"
                : "border-border bg-muted/20 hover:bg-muted/40"
            }`}
          >
            <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${!fd.is_private ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"}`}>
              <Icon name="Globe" size={14} />
            </div>
            <div>
              <p className="font-medium text-sm">Публичное</p>
              <p className="text-xs text-muted-foreground">Видно всем в каталоге</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => set({ is_private: true })}
            className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
              fd.is_private
                ? "border-purple-400 bg-purple-50"
                : "border-border bg-muted/20 hover:bg-muted/40"
            }`}
          >
            <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${fd.is_private ? "bg-purple-100 text-purple-600" : "bg-muted text-muted-foreground"}`}>
              <Icon name="Lock" size={14} />
            </div>
            <div>
              <p className="font-medium text-sm">Приватное</p>
              <p className="text-xs text-muted-foreground">Только по прямой ссылке</p>
            </div>
          </button>
        </div>


      </div>

      <div className="border-t" />

      {/* ── CO-ORGANIZERS ── */}
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-sm">Соорганизаторы</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Другие организаторы, которые управляют этой встречей вместе с вами
          </p>
        </div>
        <CoOrganizersPanel eventId={fd.id || 0} />
      </div>
    </div>
  );
}