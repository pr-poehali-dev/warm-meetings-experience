import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { landingApi, LandingPage } from "@/lib/landing-api";

interface Props {
  landing: LandingPage | null;
  onSaved: (l: LandingPage) => void;
}

export default function LandingSlugTab({ landing, onSaved }: Props) {
  const [slug, setSlug] = useState(landing?.slug || "");
  const [enabled, setEnabled] = useState(landing?.enabled ?? true);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSlug(landing?.slug || "");
    setEnabled(landing?.enabled ?? true);
  }, [landing]);

  useEffect(() => {
    if (!slug || slug === landing?.slug) {
      setAvailable(null); setErrorText(null);
      return;
    }
    setChecking(true);
    const t = setTimeout(async () => {
      try {
        const r = await landingApi.checkSlug(slug);
        setAvailable(r.available);
        setErrorText(r.error || null);
      } finally {
        setChecking(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [slug, landing?.slug]);

  const save = async () => {
    if (!slug.trim()) {
      toast.error("Введите адрес");
      return;
    }
    if (available === false) {
      toast.error(errorText || "Адрес недоступен");
      return;
    }
    setSaving(true);
    try {
      const { landing: saved } = await landingApi.save({ slug, enabled });
      onSaved(saved);
      toast.success("Адрес сохранён");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Не удалось сохранить";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (v: boolean) => {
    setEnabled(v);
    if (!landing) return;
    try {
      const { landing: saved } = await landingApi.save({ enabled: v });
      onSaved(saved);
      toast.success(v ? "Визитка опубликована" : "Визитка скрыта");
    } catch {
      toast.error("Не удалось сохранить");
      setEnabled(!v);
    }
  };

  const fullUrl = `${window.location.origin}/${slug || "ваш_адрес"}`;
  const valid = slug && available !== false && !errorText;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <h3 className="font-semibold mb-1">Адрес визитки</h3>
            <p className="text-sm text-muted-foreground">Латиница, цифры, _ и -. От 3 до 30 символов.</p>
          </div>
          <div>
            <Label className="text-sm">Ваш адрес</Label>
            <div className="flex items-stretch gap-0 mt-1.5 rounded-lg border bg-muted/30 overflow-hidden focus-within:ring-2 focus-within:ring-orange-200">
              <span className="px-3 py-2.5 text-sm text-muted-foreground bg-muted/40 border-r whitespace-nowrap">sparcom.ru&nbsp;/</span>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                placeholder="ivan_petrov"
                className="border-0 bg-transparent focus-visible:ring-0"
                maxLength={30}
              />
            </div>
            <div className="mt-2 min-h-[20px] text-xs">
              {checking && <span className="text-muted-foreground inline-flex items-center gap-1.5"><Icon name="Loader2" size={12} className="animate-spin" /> Проверяем…</span>}
              {!checking && slug && slug === landing?.slug && <span className="text-muted-foreground">Текущий адрес</span>}
              {!checking && available === true && <span className="text-green-600 inline-flex items-center gap-1"><Icon name="Check" size={12} /> Адрес свободен</span>}
              {!checking && (available === false || errorText) && <span className="text-red-600 inline-flex items-center gap-1"><Icon name="X" size={12} /> {errorText || "Адрес занят"}</span>}
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 p-3 text-sm">
            <div className="text-xs text-muted-foreground mb-1">Ссылка на визитку</div>
            <div className="font-mono text-foreground break-all">{fullUrl}</div>
          </div>

          {landing?.slug && slug !== landing.slug && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex gap-2">
              <Icon name="AlertTriangle" size={14} className="shrink-0 mt-0.5" />
              <span>Старый адрес <b>{landing.slug}</b> перестанет работать после смены.</span>
            </div>
          )}

          <Button onClick={save} disabled={saving || !valid || slug === landing?.slug} className="w-full sm:w-auto">
            {saving ? <Icon name="Loader2" size={16} className="animate-spin mr-2" /> : <Icon name="Save" size={16} className="mr-2" />}
            Сохранить адрес
          </Button>
        </CardContent>
      </Card>

      {landing && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold mb-1">Публикация</h3>
                <p className="text-sm text-muted-foreground">Когда выключено — по адресу будет 404.</p>
              </div>
              <Switch checked={enabled} onCheckedChange={toggleEnabled} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
