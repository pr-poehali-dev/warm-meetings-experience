import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import VkConnectBanner from "@/components/shared/VkConnectBanner";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { masterBookingsApi, masterCalendarApi, MasterReview } from "@/lib/master-calendar-api";
import { mastersApi, Master } from "@/lib/masters-api";
import MasterCalendar from "@/components/admin/calendar-dnd/MasterCalendarDnd";
import MasterBookingsList from "@/components/admin/MasterBookingsList";
import MasterServices from "@/components/admin/MasterServices";
import MasterTemplates from "@/components/admin/MasterTemplates";
import MasterCalendarSettings from "@/components/admin/MasterCalendarSettings";
import QuickScheduleSetup from "@/components/master/QuickScheduleSetup";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import func2url from "../../../backend/func2url.json";
import ExternalVideoBlock from "@/components/video/ExternalVideoBlock";
import NotifyChannels from "@/components/workspace/NotifyChannels";
import ImageCropDialog from "@/components/shared/ImageCropDialog";

const UPLOAD_URL = func2url["media-api"];

// ─── Загрузка файлов ──────────────────────────────────────────────────────────

export async function uploadFile(file: File) {
  return new Promise<{ url: string; type: "image" | "video" }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const isVideo = file.type.startsWith("video/");
      try {
        const res = await fetch(UPLOAD_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file: base64, filename: file.name, folder: "masters" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Ошибка загрузки");
        resolve({ url: data.url, type: isVideo ? "video" : "image" });
      } catch (err) { reject(err); }
    };
    reader.readAsDataURL(file);
  });
}

// ─── Мастер: статус верификации ───────────────────────────────────────────────

function VerificationStatus({ master }: { master: Master }) {
  const verified = !!master.is_verified;
  const hidden = master.is_active === false;
  const note = (master.verification_note || "").trim();

  if (hidden) {
    return (
      <div className="rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm flex gap-3">
        <Icon name="EyeOff" size={18} className="text-zinc-500 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-medium text-zinc-800">Профиль скрыт администратором</div>
          {note && <div className="text-xs text-zinc-600 mt-1">{note}</div>}
          <div className="text-xs text-zinc-500 mt-1">
            Свяжитесь с поддержкой, чтобы вернуть профиль в каталог.
          </div>
        </div>
      </div>
    );
  }

  if (verified) {
    const hiddenByOwner = !!master.hidden_by_owner;
    return (
      <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm flex gap-3">
        <Icon name="ShieldCheck" size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-medium text-green-900">
            {hiddenByOwner ? "Профиль одобрен, но временно скрыт вами" : "Профиль одобрен и опубликован"}
          </div>
          <div className="text-xs text-green-700 mt-0.5">
            {hiddenByOwner
              ? "Включите видимость ниже, чтобы клиенты снова могли найти вас в каталоге."
              : "Клиенты могут найти вас в каталоге мастеров."}
            {master.verified_at && (
              <> Одобрен {new Date(master.verified_at).toLocaleDateString("ru-RU")}.</>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Не верифицирован — либо новая заявка, либо снят с пометкой
  const wasRejected = !!note;
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm flex gap-3 ${
      wasRejected ? "border-amber-300 bg-amber-50" : "border-sky-200 bg-sky-50"
    }`}>
      <Icon
        name={wasRejected ? "AlertCircle" : "Clock"}
        size={18}
        className={`mt-0.5 flex-shrink-0 ${wasRejected ? "text-amber-600" : "text-sky-600"}`}
      />
      <div>
        <div className={`font-medium ${wasRejected ? "text-amber-900" : "text-sky-900"}`}>
          {wasRejected ? "Нужно исправить и отправить повторно" : "Профиль на проверке у администратора"}
        </div>
        {wasRejected ? (
          <div className="text-xs text-amber-800 mt-1">
            <span className="font-medium">Комментарий администратора:</span> {note}
          </div>
        ) : (
          <div className="text-xs text-sky-800 mt-0.5">
            Обычно проверка занимает 1–2 рабочих дня. После одобрения профиль
            появится в каталоге, мы пришлём уведомление в Telegram и на почту.
          </div>
        )}
        {wasRejected && (
          <div className="text-xs text-amber-700 mt-1">
            Внесите правки и сохраните профиль — он автоматически уйдёт на повторную проверку.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Мастер: видимость в каталоге ─────────────────────────────────────────────

function VisibilityToggle({
  master,
  onToggle,
}: {
  master: Master;
  onToggle: (hide: boolean) => void;
}) {
  // Если админ скрыл мастера через is_active=false — переключатель не показываем,
  // мастер всё равно не может вернуть себя в каталог сам.
  if (master.is_active === false) return null;

  const hidden = !!master.hidden_by_owner;

  return (
    <div className="rounded-xl border border-border bg-card/40 px-4 py-3 flex items-start gap-3">
      <Icon
        name={hidden ? "EyeOff" : "Eye"}
        size={18}
        className={`mt-0.5 flex-shrink-0 ${hidden ? "text-muted-foreground" : "text-primary"}`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <div className="font-medium text-sm">
            {hidden ? "Профиль скрыт из каталога" : "Профиль виден в каталоге"}
          </div>
          <Switch
            checked={!hidden}
            onCheckedChange={(checked) => onToggle(!checked)}
            aria-label="Показывать профиль в каталоге"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {hidden
            ? "Клиенты не найдут вас в списке мастеров. Уже назначенные записи и прямые ссылки продолжают работать."
            : "Клиенты могут найти вас в общем каталоге мастеров. В любой момент вы можете временно скрыть профиль."}
        </p>
      </div>
    </div>
  );
}

// ─── Мастер: Профиль ──────────────────────────────────────────────────────────

export function MasterProfileSection({ masterId: _masterId }: { masterId: number }) {
  const { user } = useAuth();
  const [master, setMaster] = useState<Master | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", tagline: "", bio: "", phone: "", telegram: "", instagram: "",
    city: "", experience_years: 0, price_from: 0,
  });
  const [avatar, setAvatar] = useState("");
  const [portfolio, setPortfolio] = useState<Array<{ key: string; url: string; caption?: string }>>([]);
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const [photos, setPhotos] = useState<Array<{ key: string; url: string }>>([]);
  const [photosUploading, setPhotosUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    mastersApi.getMyProfile().then((m) => {
      setMaster(m);
      setForm({
        name: m.name || "", tagline: m.tagline || "", bio: m.bio || "",
        phone: m.phone || "", telegram: m.telegram || "", instagram: m.instagram || "",
        city: m.city || "", experience_years: m.experience_years || 0, price_from: m.price_from || 0,
      });
      setAvatar(m.avatar || "");
      setPortfolio(m.portfolio || []);
      const raw = (m.photos || []) as Array<{ key: string; url: string } | string>;
      setPhotos(raw.map((p) => typeof p === "string" ? { key: p, url: p } : p));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const updated = await mastersApi.updateMyProfile({ ...form, avatar, portfolio, photos });
      // Подтягиваем свежее состояние верификации (бэкенд мог обновить requested_at).
      setMaster((prev) => (prev ? { ...prev, ...updated } as Master : prev));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally { setSaving(false); }
  };

  const handleToggleVisibility = async (hide: boolean) => {
    // Оптимистичное обновление, чтобы переключатель отзывался моментально.
    setMaster((prev) => (prev ? { ...prev, hidden_by_owner: hide } : prev));
    try {
      const updated = await mastersApi.setVisibility(hide);
      setMaster((prev) => (prev ? { ...prev, ...updated } as Master : prev));
    } catch (e) {
      // Откат при ошибке.
      setMaster((prev) => (prev ? { ...prev, hidden_by_owner: !hide } : prev));
      setError(e instanceof Error ? e.message : "Не удалось изменить видимость");
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { setError("Размер фото не более 10 МБ"); return; }
    setPhotosUploading(true);
    try {
      const { url } = await uploadFile(file);
      const key = `masters/photos/${Date.now()}_${file.name}`;
      const updated = [...photos, { key, url }];
      setPhotos(updated);
      await mastersApi.updateMyProfile({ ...form, avatar, portfolio, photos: updated });
    } catch { setError("Не удалось загрузить фото"); }
    setPhotosUploading(false);
  };

  const handlePhotoDelete = async (key: string) => {
    const updated = photos.filter((p) => p.key !== key);
    setPhotos(updated);
    await mastersApi.updateMyProfile({ ...form, avatar, portfolio, photos: updated }).catch(() => {});
  };

  const handlePortfolioUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { setError("Размер фото не более 10 МБ"); return; }
    setPortfolioUploading(true);
    try {
      const { url } = await uploadFile(file);
      const key = `masters/portfolio/${Date.now()}_${file.name}`;
      const updated = [...portfolio, { key, url }];
      setPortfolio(updated);
      await mastersApi.updateMyProfile({ ...form, avatar, portfolio: updated, photos });
    } catch { setError("Не удалось загрузить фото"); }
    setPortfolioUploading(false);
  };

  const handlePortfolioDelete = async (key: string) => {
    const updated = portfolio.filter((p) => p.key !== key);
    setPortfolio(updated);
    await mastersApi.updateMyProfile({ ...form, avatar, portfolio: updated, photos }).catch(() => {});
  };

  if (loading) return <div className="flex justify-center py-16"><Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" /></div>;
  if (!master) return null;

  const field = (key: keyof typeof form, label: string, placeholder = "") => (
    <div key={key}>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      <input
        className="w-full px-3 py-2 text-sm bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
        value={String(form[key])}
        placeholder={placeholder}
        type={typeof form[key] === "number" ? "number" : "text"}
        onChange={(e) => setForm((p) => ({ ...p, [key]: typeof form[key] === "number" ? Number(e.target.value) : e.target.value }))}
      />
    </div>
  );

  return (
    <div className="space-y-5 max-w-2xl">
      <h2 className="text-xl font-bold">Мой профиль мастера</h2>

      {/* Статус верификации — мастер должен понимать, что с его профилем */}
      <VerificationStatus master={master} />

      {/* Ссылка на публичный профиль */}
      {!master.is_verified ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 flex gap-3">
          <Icon name="Clock" size={18} className="text-zinc-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium text-zinc-600">Ссылка на профиль появится после проверки</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              После одобрения администратором вы получите личную страницу в каталоге мастеров.
            </div>
          </div>
        </div>
      ) : master.slug && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex gap-3">
          <Icon name="Globe" size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-blue-900">Ваша публичная страница</div>
            <a
              href={`/masters/${master.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 underline underline-offset-2 truncate block mt-0.5"
            >
              {window.location.origin}/masters/{master.slug}
            </a>
            <div className="flex gap-2 mt-2.5">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/masters/${master.slug}`);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2000);
                }}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 transition-colors"
              >
                <Icon name={linkCopied ? "Check" : "Copy"} size={12} />
                {linkCopied ? "Скопировано" : "Копировать"}
              </button>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/masters/${master.slug}`;
                  if (navigator.share) {
                    navigator.share({ title: master.name || "Мой профиль", url });
                  } else {
                    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}`, "_blank");
                  }
                }}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 transition-colors"
              >
                <Icon name="Share2" size={12} />
                Поделиться
              </button>
              <a
                href={`/masters/${master.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 transition-colors"
              >
                <Icon name="ExternalLink" size={12} />
                Открыть
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Переключатель видимости профиля в каталоге */}
      <VisibilityToggle master={master} onToggle={handleToggleVisibility} />

      {/* Аватар */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          <div className="w-20 h-20 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center flex-shrink-0 border-2 border-border">
            {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <Icon name="User" size={32} className="text-primary" />}
          </div>
          <label
            className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            title="Загрузить фото"
          >
            {avatarUploading
              ? <Icon name="Loader2" size={18} className="text-white animate-spin" />
              : <Icon name="Camera" size={18} className="text-white" />}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 10 * 1024 * 1024) { setError("Размер фото не более 10 МБ"); return; }
                const reader = new FileReader();
                reader.onload = () => setCropSrc(reader.result as string);
                reader.readAsDataURL(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <div>
          <p className="text-sm font-medium">{form.name || "Ваш профиль"}</p>
          <p className="text-xs text-muted-foreground">Нажмите на фото, чтобы выбрать нужную область</p>
          <p className="text-xs text-muted-foreground">ID мастера: #{master.id}</p>
        </div>
      </div>

      {cropSrc && (
        <ImageCropDialog
          open
          imageSrc={cropSrc}
          aspect={1}
          cropShape="round"
          title="Настройте фото профиля"
          onCancel={() => setCropSrc(null)}
          onCropped={async (file) => {
            setCropSrc(null);
            setAvatarUploading(true);
            try {
              const { url } = await uploadFile(file);
              setAvatar(url);
            } catch { setError("Не удалось загрузить фото"); }
            finally { setAvatarUploading(false); }
          }}
        />
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field("name", "Имя")}
        {field("tagline", "Слоган")}
        {field("city", "Город")}
        {field("phone", "Телефон")}
        {field("telegram", "Telegram")}
        {field("instagram", "Instagram")}
        {field("experience_years", "Лет опыта")}
        {field("price_from", "Цена от (₽)")}
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">О себе</label>
        <textarea
          rows={4}
          className="w-full px-3 py-2 text-sm bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          value={form.bio}
          onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <Icon name="Loader2" size={15} className="animate-spin" /> : null}
        {saved
          ? "Сохранено!"
          : !master?.verification_requested_at
          ? "Отправить на проверку"
          : "Сохранить профиль"}
      </Button>

      {/* Фото профиля */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">Фото профиля</h3>
            <p className="text-xs text-muted-foreground">Показываются в карусели на вашей публичной странице</p>
          </div>
          <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-border bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer ${photosUploading ? "opacity-50 pointer-events-none" : ""}`}>
            {photosUploading
              ? <Icon name="Loader2" size={13} className="animate-spin" />
              : <Icon name="Plus" size={13} />}
            Добавить фото
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              disabled={photosUploading}
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                for (const f of files) await handlePhotoUpload(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {photos.length === 0 && !photosUploading && (
          <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center text-muted-foreground text-sm">
            <Icon name="Images" size={28} className="mx-auto mb-2 opacity-40" />
            Добавьте фото для галереи в вашем профиле
          </div>
        )}

        {photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((item) => (
              <div key={item.key} className="relative group aspect-video rounded-xl overflow-hidden bg-muted/40">
                <img src={item.url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handlePhotoDelete(item.key)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Icon name="Trash2" size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Портфолио */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">Портфолио</h3>
            <p className="text-xs text-muted-foreground">Фото ваших работ — клиенты увидят их в профиле</p>
          </div>
          <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-border bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer ${portfolioUploading ? "opacity-50 pointer-events-none" : ""}`}>
            {portfolioUploading
              ? <Icon name="Loader2" size={13} className="animate-spin" />
              : <Icon name="Plus" size={13} />}
            Добавить фото
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              disabled={portfolioUploading}
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                for (const f of files) await handlePortfolioUpload(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {portfolio.length === 0 && !portfolioUploading && (
          <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center text-muted-foreground text-sm">
            <Icon name="ImagePlus" size={28} className="mx-auto mb-2 opacity-40" />
            Загрузите фото своих работ
          </div>
        )}

        {portfolio.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {portfolio.map((item) => (
              <div key={item.key} className="relative group aspect-square rounded-xl overflow-hidden bg-muted/40">
                <img src={item.url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handlePortfolioDelete(item.key)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Icon name="Trash2" size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Видео */}
      {master && (
        <div className="pt-2">
          <ExternalVideoBlock
            ownerType="master"
            ownerId={master.id}
            userToken={localStorage.getItem("user_token") || ""}
          />
        </div>
      )}

      {/* Уведомления в ВК */}
      <div className="pt-2">
        <VkConnectBanner vkId={user?.vk_id} variant="banner" dismissKey="vk_banner_master_profile" onDismiss={() => {}} />
      </div>
    </div>
  );
}

// ─── Мастер: Расписание ───────────────────────────────────────────────────────

export function MasterScheduleSection({ masterId, masterSlug }: { masterId: number; masterSlug: string }) {
  const [tab, setTab] = useState<"quick" | "calendar" | "services" | "templates" | "settings">("quick");
  const tabs = [
    { id: "quick", label: "Быстрый старт", icon: "Zap" },
    { id: "calendar", label: "Календарь", icon: "CalendarDays" },
    { id: "services", label: "Услуги", icon: "Sparkles" },
    { id: "templates", label: "Шаблоны", icon: "Copy" },
    { id: "settings", label: "Настройки", icon: "Settings" },
  ] as const;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Расписание</h2>
        <a
          href="/master-schedule-guide"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-base font-semibold"
        >
          <Icon name="BookOpen" size={13} />
          Инструкция
        </a>
      </div>
      <div className="flex gap-1 bg-muted/60 rounded-xl p-1 w-fit overflow-x-auto max-w-full">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${tab === t.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon name={t.icon} size={13} />
            {t.label}
          </button>
        ))}
      </div>
      {tab === "quick" && <QuickScheduleSetup masterId={masterId} masterSlug={masterSlug} onNavigateToServices={() => setTab("services")} />}
      {tab === "calendar" && <MasterCalendar masterId={masterId} />}
      {tab === "services" && <MasterServices masterId={masterId} />}
      {tab === "templates" && <MasterTemplates masterId={masterId} />}
      {tab === "settings" && <MasterCalendarSettings masterId={masterId} />}
    </div>
  );
}

// ─── Мастер: Записи ───────────────────────────────────────────────────────────

export function MasterBookingsSection({ masterId }: { masterId: number }) {
  return <div className="space-y-4"><h2 className="text-xl font-bold">Записи клиентов</h2><MasterBookingsList masterId={masterId} /></div>;
}

// ─── Мастер: Отзывы ───────────────────────────────────────────────────────────

export function MasterReviewsSection({ masterId }: { masterId: number }) {
  const [reviews, setReviews] = useState<MasterReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);

  useEffect(() => {
    masterBookingsApi.getReviews(masterId).then(setReviews).catch(() => setReviews([])).finally(() => setLoading(false));
  }, [masterId]);

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const filtered = filterRating ? reviews.filter((r) => r.rating === filterRating) : reviews;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Отзывы обо мне</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border rounded-2xl p-4 flex items-center gap-3">
          <div className="text-3xl font-bold text-primary">{avgRating.toFixed(1)}</div>
          <div className="flex flex-col gap-0.5">
            <div className="flex gap-0.5">{[1,2,3,4,5].map((s) => <Icon key={s} name="Star" size={12} className={s <= Math.round(avgRating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"} />)}</div>
            <div className="text-xs text-muted-foreground">Средняя</div>
          </div>
        </div>
        <div className="bg-card border rounded-2xl p-4"><div className="text-3xl font-bold">{reviews.length}</div><div className="text-xs text-muted-foreground">Всего</div></div>
        <div className="bg-card border rounded-2xl p-4"><div className="text-3xl font-bold text-green-600 dark:text-green-400">{reviews.filter((r) => r.rating >= 4).length}</div><div className="text-xs text-muted-foreground">Позитивных</div></div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[null, 5, 4, 3, 2, 1].map((r) => (
          <button key={r ?? "all"} onClick={() => setFilterRating(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterRating === r ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            {r ? `${r} ★` : "Все"}
          </button>
        ))}
      </div>
      {loading ? <div className="flex justify-center py-8"><Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" /></div>
        : filtered.length === 0 ? <div className="text-center py-12 text-sm text-muted-foreground"><Icon name="MessageSquare" size={32} className="mx-auto mb-2 opacity-30" />{reviews.length === 0 ? "Пока нет отзывов" : "Нет отзывов с такой оценкой"}</div>
        : <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="bg-card border rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary text-sm">{r.client_name[0].toUpperCase()}</div>
                  <div>
                    <div className="font-medium text-sm">{r.client_name}</div>
                    <div className="text-xs text-muted-foreground">{format(parseISO(r.created_at), "d MMMM yyyy", { locale: ru })}</div>
                  </div>
                </div>
                <div className="flex gap-0.5">{[1,2,3,4,5].map((s) => <Icon key={s} name="Star" size={13} className={s <= r.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"} />)}</div>
              </div>
              {r.text && <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{r.text}</p>}
            </div>
          ))}
        </div>}
    </div>
  );
}

// ─── Мастер: Финансы ──────────────────────────────────────────────────────────

export function MasterFinancesSection({ masterId }: { masterId: number }) {
  const [stats, setStats] = useState<{ total_revenue: number; expected_revenue: number; completed_sessions: number } | null>(null);
  useEffect(() => { masterBookingsApi.getStats(masterId).then((s) => setStats(s as typeof stats)).catch(() => {}); }, [masterId]);
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Финансы</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Доход за месяц", value: `${(stats?.total_revenue ?? 0).toLocaleString("ru-RU")} ₽`, icon: "TrendingUp", color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Ожидаемый доход", value: `${(stats?.expected_revenue ?? 0).toLocaleString("ru-RU")} ₽`, icon: "Clock", color: "text-primary" },
          { label: "Завершённых сеансов", value: stats?.completed_sessions ?? 0, icon: "CheckCircle2", color: "text-green-600 dark:text-green-400" },
        ].map((m) => (
          <div key={m.label} className="bg-card border rounded-2xl p-4">
            <div className="w-8 h-8 bg-muted rounded-xl flex items-center justify-center mb-2"><Icon name={m.icon} size={16} className={m.color} /></div>
            <div className="text-2xl font-bold">{m.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>
      <div className="bg-muted/50 border rounded-2xl p-6 text-center">
        <Icon name="Wallet" size={32} className="mx-auto text-muted-foreground/40 mb-2" />
        <div className="font-semibold text-sm">Вывод средств</div>
        <p className="text-xs text-muted-foreground mt-1">Система выплат в разработке. Для расчётов свяжитесь с администратором.</p>
      </div>
    </div>
  );
}

// ─── Мастер: Уведомления ──────────────────────────────────────────────────────

export function MasterNotificationsSection({ masterId }: { masterId: number }) {
  const [settings, setSettings] = useState({ notify_new_booking: true, notify_24h_reminder: true, notify_cancellation: true, auto_confirm: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { masterCalendarApi.getSettings(masterId).then((s) => setSettings({ notify_new_booking: s.notify_new_booking, notify_24h_reminder: s.notify_24h_reminder, notify_cancellation: s.notify_cancellation, auto_confirm: s.auto_confirm })).catch(() => {}); }, [masterId]);
  const handleSave = async () => {
    setSaving(true);
    try { await masterCalendarApi.saveSettings({ master_id: masterId, ...settings }); setSaved(true); setTimeout(() => setSaved(false), 2000); } catch { /* ignore */ } finally { setSaving(false); }
  };
  const toggles: { key: keyof typeof settings; label: string; desc: string }[] = [
    { key: "notify_new_booking", label: "Новая запись", desc: "Уведомление при каждой новой записи клиента" },
    { key: "notify_24h_reminder", label: "Напоминание за 24 часа", desc: "Напомнить о предстоящем сеансе за сутки" },
    { key: "notify_cancellation", label: "Отмена записи", desc: "Уведомление при отмене клиентом" },
    { key: "auto_confirm", label: "Автоподтверждение", desc: "Записи автоматически получают статус «Подтверждено»" },
  ];
  return (
    <div className="space-y-5 max-w-xl">
      <h2 className="text-xl font-bold">Уведомления</h2>

      {/* О чём уведомлять */}
      <div className="space-y-3">
        <div>
          <p className="font-semibold text-sm">О чём уведомлять</p>
          <p className="text-xs text-muted-foreground mt-0.5">Выберите события, о которых хотите получать оповещения</p>
        </div>
        <div className="space-y-2">
          {toggles.map((t) => (
            <div key={t.key} className="flex items-center justify-between gap-4 bg-card border rounded-2xl p-4">
              <div><div className="font-medium text-sm">{t.label}</div><div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div></div>
              <button onClick={() => setSettings((p) => ({ ...p, [t.key]: !p[t.key] }))}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${settings[t.key] ? "bg-primary" : "bg-muted"}`}>
                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings[t.key] ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          ))}
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Icon name="Loader2" size={14} className="animate-spin mr-1" /> : null}
          {saved ? "Сохранено!" : "Сохранить"}
        </Button>
      </div>

      {/* Куда присылать уведомления (каналы) */}
      <div className="border-t pt-5">
        <NotifyChannels />
      </div>
    </div>
  );
}

// ─── Мастер: Дашборд ──────────────────────────────────────────────────────────

export function MasterDashboardSection({ masterId }: { masterId: number }) {
  const [stats, setStats] = useState<{ upcoming_sessions: number; completed_sessions: number; total_revenue: number; occupancy_percent: number } | null>(null);
  const [upcoming, setUpcoming] = useState<{ id: number; client_name: string; service_name?: string; datetime_start: string; price: number }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([masterBookingsApi.getStats(masterId), masterBookingsApi.getBookings(masterId, "confirmed")])
      .then(([s, b]) => {
        setStats(s as typeof stats);
        const now = new Date().toISOString();
        setUpcoming((b as typeof upcoming).filter((x) => x.datetime_start >= now).sort((a, b) => a.datetime_start.localeCompare(b.datetime_start)).slice(0, 5));
      }).catch(() => {}).finally(() => setLoading(false));
  }, [masterId]);
  if (loading) return <div className="flex justify-center py-16"><Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" /></div>;
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Обзор мастера</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Предстоящих записей", value: stats?.upcoming_sessions ?? 0, icon: "CalendarCheck", color: "text-primary" },
          { label: "Проведено сеансов", value: stats?.completed_sessions ?? 0, icon: "CheckCircle2", color: "text-green-600" },
          { label: "Доход (месяц)", value: `${(stats?.total_revenue ?? 0).toLocaleString("ru-RU")} ₽`, icon: "TrendingUp", color: "text-emerald-600" },
          { label: "Загруженность", value: `${stats?.occupancy_percent ?? 0}%`, icon: "BarChart2", color: "text-amber-600" },
        ].map((m) => (
          <div key={m.label} className="bg-card border rounded-2xl p-4">
            <div className="w-8 h-8 bg-muted rounded-xl flex items-center justify-center mb-2"><Icon name={m.icon} size={16} className={m.color} /></div>
            <div className="text-2xl font-bold">{m.value}</div>
            <div className="text-xs text-muted-foreground">{m.label}</div>
          </div>
        ))}
      </div>
      {upcoming.length > 0 && (
        <div className="bg-card border rounded-2xl p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Icon name="Clock" size={14} className="text-primary" />Ближайшие сеансы</h3>
          <div className="space-y-2">
            {upcoming.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-primary text-xs">{b.client_name[0].toUpperCase()}</div>
                  <div className="min-w-0"><div className="text-sm font-medium truncate">{b.client_name}</div>{b.service_name && <div className="text-xs text-muted-foreground truncate">{b.service_name}</div>}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-medium">{format(parseISO(b.datetime_start), "d MMM, HH:mm", { locale: ru })}</div>
                  <div className="text-xs text-primary">{b.price.toLocaleString()} ₽</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}