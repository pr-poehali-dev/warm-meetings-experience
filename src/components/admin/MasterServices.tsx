import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Link } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";
import TgPublishButton from "@/components/tg/TgPublishButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { masterCalendarApi } from "@/lib/master-calendar-api";
import { mastersApi } from "@/lib/masters-api";
import type {
  MasterService,
  ServiceFormat,
  MasterAddress,
} from "@/lib/master-calendar-api";
import {
  parseServiceDescription,
  buildServiceDescription,
} from "@/lib/service-description";

interface ServiceFormData {
  name: string;
  description: string;
  rich_description: string;
  video_url: string;
  included: string[];
  bring: string[];
  contraindications: string[];
  duration_minutes: string;
  price: string;
  max_clients: string;
  is_active: boolean;
  service_format: ServiceFormat;
  departure_address_id: string;
}

const FORMAT_OPTIONS: {
  value: ServiceFormat;
  title: string;
  desc: string;
  icon: string;
  emoji: string;
  cardBg: string;
  cardBorder: string;
}[] = [
  {
    value: "on_site",
    title: "На месте у мастера",
    desc: "Гость приезжает к мастеру. Укажите адрес в настройках.",
    icon: "Home",
    emoji: "🏠",
    cardBg: "bg-green-50",
    cardBorder: "border-green-200",
  },
  {
    value: "at_home",
    title: "Выезд к гостю (пригласить в гости)",
    desc: "Мастер приезжает к гостю. Гость указывает место на карте при записи.",
    icon: "Car",
    emoji: "🚗",
    cardBg: "bg-blue-50",
    cardBorder: "border-blue-200",
  },
  {
    value: "by_agreement",
    title: "По согласованию",
    desc: "Мастер и гость договариваются о месте сами.",
    icon: "MessagesSquare",
    emoji: "🤝",
    cardBg: "bg-yellow-50",
    cardBorder: "border-yellow-200",
  },
];

const DEFAULT_CONTRA = [
  "Беременность",
  "Онкологические заболевания",
  "Острые воспалительные процессы",
  "Гипертония в стадии обострения",
];

const emptyForm: ServiceFormData = {
  name: "",
  description: "",
  included: [],
  bring: [],
  contraindications: [],
  duration_minutes: "60",
  price: "",
  max_clients: "1",
  is_active: true,
  service_format: "on_site",
  departure_address_id: "",
};

const formatPrice = (price: number): string => {
  return price.toLocaleString("ru-RU") + " \u20BD";
};

interface ListFieldProps {
  label: string;
  icon: string;
  color: string;
  items: string[];
  placeholder: string;
  hint?: string;
  onChange: (items: string[]) => void;
  extraAction?: { label: string; onClick: () => void };
}

const ListField = ({
  label,
  icon,
  color,
  items,
  placeholder,
  hint,
  onChange,
  extraAction,
}: ListFieldProps) => {
  const [draft, setDraft] = useState("");

  const addItem = (text: string) => {
    const value = text.trim();
    if (!value) return;
    onChange([...items, value]);
    setDraft("");
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, value: string) => {
    onChange(items.map((it, i) => (i === idx ? value : it)));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className="flex items-center gap-1.5">
          <Icon name={icon} size={14} className={color} />
          {label}
        </Label>
        {extraAction && (
          <button
            type="button"
            onClick={extraAction.onClick}
            className="text-xs text-nature-forest hover:underline font-medium"
          >
            {extraAction.label}
          </button>
        )}
      </div>

      {items.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Icon
                name="GripVertical"
                size={14}
                className="text-gray-300 shrink-0"
                fallback="Dot"
              />
              <Input
                value={item}
                onChange={(e) => updateItem(idx, e.target.value)}
                className="h-8 text-sm"
              />
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                aria-label="Удалить пункт"
              >
                <Icon name="X" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem(draft);
            }
          }}
          placeholder={placeholder}
          className="h-8 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addItem(draft)}
          disabled={!draft.trim()}
          className="h-8 px-3"
        >
          <Icon name="Plus" size={14} className="mr-1" />
          Добавить
        </Button>
      </div>

      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
};

export interface MasterServicesRef {
  openCreate: () => void;
}

const MasterServices = forwardRef<MasterServicesRef, { masterId: number }>(
  ({ masterId }, ref) => {
    const [services, setServices] = useState<MasterService[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [editingService, setEditingService] = useState<MasterService | null>(
      null,
    );
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [form, setForm] = useState<ServiceFormData>({ ...emptyForm });
    const [addresses, setAddresses] = useState<MasterAddress[]>([]);
    const [masterSlug, setMasterSlug] = useState<string>("");
    const [servicePhotos, setServicePhotos] = useState<string[]>([]);
    const [photoUploading, setPhotoUploading] = useState(false);

    const { toast } = useToast();

    useEffect(() => {
      fetchServices();
      masterCalendarApi
        .getAddresses(masterId)
        .then(setAddresses)
        .catch(() => setAddresses([]));
      mastersApi
        .getMyProfile()
        .then((p) => setMasterSlug(p?.slug || ""))
        .catch(() => setMasterSlug(""));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [masterId]);

    const copyToClipboard = (text: string): boolean => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    };

    const copyServiceLink = async (service: MasterService) => {
      if (!masterSlug) {
        toast({
          title: "Ссылка недоступна",
          description: "Не удалось определить публичный адрес страницы мастера",
          variant: "destructive",
        });
        return;
      }
      const url = `${window.location.origin}/masters/${masterSlug}?service=${service.id}`;
      let copied = false;
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch {
        copied = copyToClipboard(url);
      }
      if (copied) {
        toast({ title: "Ссылка скопирована", description: url });
      } else {
        toast({
          title: "Не удалось скопировать",
          description: url,
          variant: "destructive",
        });
      }
    };

    const fetchServices = async () => {
      setLoading(true);
      try {
        const data = await masterCalendarApi.getServices(masterId);
        setServices(data);
      } catch {
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить услуги",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    const openCreate = () => {
      setEditingService(null);
      setForm({ ...emptyForm });
      setServicePhotos([]);
      setIsDialogOpen(true);
    };

    useImperativeHandle(ref, () => ({ openCreate }));

    const openEdit = (service: MasterService) => {
      setEditingService(service);
      const parsed = parseServiceDescription(service.description);
      setForm({
        name: service.name,
        description: parsed.intro,
        rich_description: service.rich_description || "",
        video_url: service.video_url || "",
        included: parsed.included,
        bring: parsed.bring,
        contraindications: parsed.contraindications,
        duration_minutes: String(service.duration_minutes),
        price: String(service.price),
        max_clients: String(service.max_clients),
        is_active: service.is_active,
        service_format: service.service_format || "on_site",
        departure_address_id: service.departure_address_id
          ? String(service.departure_address_id)
          : "",
      });
      setServicePhotos(Array.isArray(service.photos) ? service.photos : []);
      setIsDialogOpen(true);
    };

    const handleSave = async () => {
      if (!form.name.trim()) {
        toast({
          title: "Ошибка",
          description: "Введите название услуги",
          variant: "destructive",
        });
        return;
      }
      if (!form.duration_minutes || Number(form.duration_minutes) <= 0) {
        toast({
          title: "Ошибка",
          description: "Укажите длительность",
          variant: "destructive",
        });
        return;
      }
      if (!form.price || Number(form.price) < 0) {
        toast({
          title: "Ошибка",
          description: "Укажите цену",
          variant: "destructive",
        });
        return;
      }

      setSaving(true);
      try {
        const fullDescription = buildServiceDescription({
          intro: form.description.trim(),
          included: form.included.map((x) => x.trim()).filter(Boolean),
          bring: form.bring.map((x) => x.trim()).filter(Boolean),
          contraindications: form.contraindications
            .map((x) => x.trim())
            .filter(Boolean),
        });
        const departureAddressId =
          form.service_format === "at_home" && form.departure_address_id
            ? Number(form.departure_address_id)
            : null;
        if (editingService?.id) {
          await masterCalendarApi.updateService({
            id: editingService.id,
            master_id: masterId,
            name: form.name.trim(),
            description: fullDescription || undefined,
            rich_description: form.rich_description.trim() || undefined,
            video_url: form.video_url.trim() || undefined,
            duration_minutes: Number(form.duration_minutes),
            price: Number(form.price),
            max_clients: Number(form.max_clients) || 1,
            is_active: form.is_active,
            service_format: form.service_format,
            departure_address_id: departureAddressId,
          });
          toast({ title: "Готово", description: "Услуга обновлена" });
        } else {
          await masterCalendarApi.createService({
            master_id: masterId,
            name: form.name.trim(),
            description: fullDescription || undefined,
            rich_description: form.rich_description.trim() || undefined,
            video_url: form.video_url.trim() || undefined,
            duration_minutes: Number(form.duration_minutes),
            price: Number(form.price),
            max_clients: Number(form.max_clients) || 1,
            is_active: form.is_active,
            service_format: form.service_format,
            departure_address_id: departureAddressId,
          });
          toast({ title: "Готово", description: "Услуга создана" });
        }
        setIsDialogOpen(false);
        setEditingService(null);
        setForm({ ...emptyForm });
        fetchServices();
      } catch {
        toast({
          title: "Ошибка",
          description: "Не удалось сохранить услугу",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editingService?.id) return;
      setPhotoUploading(true);
      try {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const base64 = (ev.target?.result as string) ?? "";
          const result = await masterCalendarApi.uploadServicePhoto(
            editingService.id!,
            base64,
            file.type,
          );
          setServicePhotos(result.photos);
        };
        reader.readAsDataURL(file);
      } catch {
        toast({ title: "Ошибка", description: "Не удалось загрузить фото", variant: "destructive" });
      } finally {
        setPhotoUploading(false);
      }
      e.target.value = "";
    };

    const handlePhotoDelete = async (url: string) => {
      if (!editingService?.id) return;
      try {
        const result = await masterCalendarApi.deleteServicePhoto(editingService.id!, url);
        setServicePhotos(result.photos);
      } catch {
        toast({ title: "Ошибка", description: "Не удалось удалить фото", variant: "destructive" });
      }
    };

    const confirmDelete = (id: number) => {
      setDeletingId(id);
      setIsDeleteOpen(true);
    };

    const handleDelete = async () => {
      if (!deletingId) return;
      setSaving(true);
      try {
        await masterCalendarApi.deleteService(deletingId);
        toast({ title: "Готово", description: "Услуга удалена" });
        setIsDeleteOpen(false);
        setDeletingId(null);
        fetchServices();
      } catch {
        toast({
          title: "Ошибка",
          description: "Не удалось удалить услугу",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    };

    const toggleActive = async (service: MasterService) => {
      if (!service.id) return;
      setSaving(true);
      try {
        await masterCalendarApi.updateService({
          id: service.id,
          master_id: masterId,
          name: service.name,
          duration_minutes: service.duration_minutes,
          price: service.price,
          max_clients: service.max_clients,
          is_active: !service.is_active,
        });
        toast({
          title: "Готово",
          description: service.is_active
            ? "Услуга деактивирована"
            : "Услуга активирована",
        });
        fetchServices();
      } catch {
        toast({
          title: "Ошибка",
          description: "Не удалось изменить статус",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    };

    return (
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Услуги мастера
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Управление предоставляемыми услугами
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={openCreate}
              size="sm"
              className="bg-nature-forest hover:bg-nature-forest/90 text-white lg:hidden"
            >
              <Icon name="Plus" size={16} />
            </Button>
            <Button
              onClick={openCreate}
              className="bg-nature-forest hover:bg-nature-forest/90 text-white hidden lg:flex"
            >
              <Icon name="Plus" size={18} className="mr-2" />
              Добавить услугу
            </Button>
          </div>
        </div>

        {loading && !services.length ? (
          <div className="text-center py-12">
            <Icon
              name="Loader2"
              size={32}
              className="animate-spin mx-auto text-gray-400"
            />
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Icon
              name="Sparkles"
              size={48}
              className="mx-auto text-gray-300 mb-4"
            />
            <p className="text-gray-500 text-lg">Услуг пока нет</p>
            <p className="text-gray-400 text-sm mt-1">
              Добавьте первую услугу, нажав кнопку выше
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {services.map((service) => {
              const fmt = FORMAT_OPTIONS.find((f) => f.value === service.service_format);
              return (
              <div
                key={service.id}
                className={`rounded-lg border px-3 py-2.5 hover:shadow-sm transition-shadow ${
                  fmt ? `${fmt.cardBg} ${fmt.cardBorder}` : "bg-white border-gray-200"
                } ${!service.is_active ? "opacity-60" : ""}`}
              >
                {/* Строка 1: иконка + название + бейдж */}
                <div className="flex items-center gap-2 mb-1.5">
                  {fmt && (
                    <Icon name={fmt.icon as "Home"} size={16} className="text-gray-500 shrink-0" />
                  )}
                  <h3 className="text-sm font-semibold text-gray-900 truncate flex-1 min-w-0">
                    {service.name}
                  </h3>
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap shrink-0 ${
                      service.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {service.is_active ? "Активна" : "Неактивна"}
                  </span>
                </div>

                {/* Строка 2: мета-инфо + кнопки */}
                <div className="flex items-center gap-2">
                  {/* Мета-инфо */}
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-1 min-w-0 overflow-hidden">
                    <span className="flex items-center gap-0.5 shrink-0">
                      <Icon name="Clock" size={11} className="text-gray-400" />
                      {service.duration_minutes}м
                    </span>
                    <span className="flex items-center gap-0.5 font-semibold text-gray-900 shrink-0">
                      <Icon name="Banknote" size={11} className="text-gray-400" />
                      {formatPrice(service.price)}
                    </span>
                    <span className="flex items-center gap-0.5 shrink-0 hidden sm:flex">
                      <Icon name="Users" size={11} className="text-gray-400" />
                      до {service.max_clients} чел.
                    </span>
                    {fmt && (
                      <span className="text-gray-400 truncate hidden sm:block">{fmt.title}</span>
                    )}
                  </div>

                  {/* Кнопки */}
                  <div className="flex items-center gap-0 shrink-0">
                  <TooltipProvider delayDuration={400}>
                    <div className="flex items-center gap-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => openEdit(service)}
                            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
                            disabled={saving}
                          >
                            <Icon name="Pencil" size={15} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          Редактировать услугу
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => toggleActive(service)}
                            className={`p-1.5 rounded-md transition-colors ${
                              service.is_active
                                ? "text-yellow-600 hover:bg-yellow-50"
                                : "text-green-600 hover:bg-green-50"
                            }`}
                            disabled={saving}
                          >
                            <Icon
                              name={service.is_active ? "EyeOff" : "Eye"}
                              size={15}
                            />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="bottom"
                          className="text-xs max-w-[180px] leading-snug"
                        >
                          {service.is_active
                            ? "Скрыть услугу — гости не увидят её при записи"
                            : "Показать услугу — гости смогут выбрать её при записи"}
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => copyServiceLink(service)}
                            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
                            disabled={saving}
                          >
                            <Icon name="Link" size={15} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="bottom"
                          className="text-xs max-w-[180px] leading-snug"
                        >
                          Скопировать ссылку на эту услугу — отправьте гостю, он
                          сразу попадёт на запись
                        </TooltipContent>
                      </Tooltip>
                      {masterSlug && service.id && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              to={`/masters/${masterSlug}/services/${service.id}`}
                              target="_blank"
                              className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors inline-flex"
                            >
                              <Icon name="ExternalLink" size={15} />
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            Открыть страницу услуги
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() =>
                              service.id && confirmDelete(service.id)
                            }
                            className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors"
                            disabled={saving}
                          >
                            <Icon name="Trash2" size={15} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          Удалить услугу
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                    {service.id && service.is_active && (
                      <TgPublishButton
                        contentType="master_service"
                        contentId={service.id}
                        userId={masterId}
                        label=""
                        allowRepeat
                        size="sm"
                        variant="ghost"
                      />
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[560px] flex flex-col max-h-[90vh]">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <Icon
                  name={editingService ? "Pencil" : "Plus"}
                  size={20}
                  className="text-nature-forest"
                />
                {editingService ? "Редактировать услугу" : "Новая услуга"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 overflow-y-auto flex-1 px-3.5">
              <div>
                <Label>
                  Название <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Парение в бане"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1.5 mb-2">
                  <Icon
                    name="MapPinned"
                    size={14}
                    className="text-nature-forest"
                  />
                  Формат оказания
                </Label>
                <div className="space-y-2 px-0 py-5">
                  {FORMAT_OPTIONS.map((opt) => {
                    const active = form.service_format === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setForm({ ...form, service_format: opt.value })
                        }
                        className={`w-full text-left flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                          active
                            ? `${opt.cardBorder} ${opt.cardBg}`
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <Icon
                          name={opt.icon}
                          size={18}
                          className={active ? "text-nature-forest mt-0.5" : "text-gray-400 mt-0.5"}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {opt.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {opt.desc}
                          </p>
                        </div>
                        {active && (
                          <Icon
                            name="Check"
                            size={16}
                            className="text-nature-forest mt-0.5"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {form.service_format === "at_home" && (
                  <div className="mt-3">
                    <Label className="text-sm">Адрес отправления мастера</Label>
                    {addresses.length === 0 ? (
                      <p className="text-xs text-gray-400 mt-1">
                        У вас пока нет сохранённых адресов. Можно добавить их в
                        разделе «Мои адреса» — мастер уточнит место позже.
                      </p>
                    ) : (
                      <select
                        value={form.departure_address_id}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            departure_address_id: e.target.value,
                          })
                        }
                        className="mt-1 w-full h-10 rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-nature-forest/30"
                      >
                        <option value="">Не выбран (уточню позже)</option>
                        {addresses.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.address_text}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label>Краткое описание</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Суть процедуры в 1–2 предложениях..."
                  className="mt-1"
                  rows={3}
                  maxLength={300}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Например: «Традиционное русское парение с акцентом на
                  прогревание и массаж веником.»
                </p>
              </div>

              {/* Подробное описание */}
              <div>
                <Label className="flex items-center gap-1.5">
                  <Icon name="AlignLeft" size={14} className="text-nature-forest" />
                  Подробное описание
                </Label>
                <Textarea
                  value={form.rich_description}
                  onChange={(e) => setForm({ ...form, rich_description: e.target.value })}
                  placeholder="Расскажите подробнее об услуге: как проходит процедура, что гость почувствует, особенности вашего подхода..."
                  className="mt-1"
                  rows={5}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Отображается на отдельной странице услуги
                </p>
              </div>

              {/* Фото */}
              <div>
                <Label className="flex items-center gap-1.5">
                  <Icon name="Images" size={14} className="text-nature-forest" />
                  Фотографии услуги
                </Label>
                {servicePhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2 mb-2">
                    {servicePhotos.map((url) => (
                      <div key={url} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handlePhotoDelete(url)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white"
                        >
                          <Icon name="Trash2" size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {editingService?.id ? (
                  <label className={`mt-1 flex items-center gap-2 cursor-pointer text-sm px-3 py-2 rounded-lg border border-dashed border-gray-300 hover:border-nature-forest hover:bg-nature-forest/5 transition ${photoUploading ? "opacity-50 pointer-events-none" : ""}`}>
                    <Icon name={photoUploading ? "Loader" : "Upload"} size={16} className={`text-gray-400 ${photoUploading ? "animate-spin" : ""}`} />
                    {photoUploading ? "Загружаю..." : "Добавить фото"}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                ) : (
                  <p className="text-[11px] text-gray-400 mt-1">Сначала сохраните услугу, затем добавьте фото</p>
                )}
              </div>

              {/* Видео */}
              <div>
                <Label className="flex items-center gap-1.5">
                  <Icon name="Play" size={14} className="text-nature-forest" />
                  Ссылка на видео
                </Label>
                <Input
                  value={form.video_url}
                  onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=... или rutube.ru/video/..."
                  className="mt-1"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  YouTube, Rutube — видео отобразится на странице услуги
                </p>
              </div>

              {/* Что входит */}
              <ListField
                label="Что входит"
                icon="ListChecks"
                color="text-nature-forest"
                items={form.included}
                placeholder="Например: 3 захода с веником"
                onChange={(items) => setForm({ ...form, included: items })}
              />

              {/* Что взять с собой */}
              <ListField
                label="Что взять с собой"
                icon="Briefcase"
                color="text-nature-sage"
                items={form.bring}
                placeholder="Например: купальник, сланцы"
                onChange={(items) => setForm({ ...form, bring: items })}
              />

              {/* Противопоказания */}
              <ListField
                label="Противопоказания"
                icon="AlertTriangle"
                color="text-amber-600"
                items={form.contraindications}
                placeholder="Например: беременность"
                hint="Обязательно для безопасности гостей. Можно использовать шаблон."
                onChange={(items) =>
                  setForm({ ...form, contraindications: items })
                }
                extraAction={
                  form.contraindications.length === 0
                    ? {
                        label: "Использовать шаблон",
                        onClick: () =>
                          setForm({
                            ...form,
                            contraindications: [...DEFAULT_CONTRA],
                          }),
                      }
                    : undefined
                }
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>
                    Длительность (мин) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={5}
                    max={720}
                    value={form.duration_minutes}
                    onChange={(e) =>
                      setForm({ ...form, duration_minutes: e.target.value })
                    }
                    placeholder="60"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>
                    Цена (₽) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    placeholder="3000"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label>Макс. участников</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={form.max_clients}
                  onChange={(e) =>
                    setForm({ ...form, max_clients: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div>
                  <Label className="text-sm font-medium text-gray-900">
                    Активна
                  </Label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Услуга видна клиентам при записи
                  </p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, is_active: checked })
                  }
                />
              </div>
            </div>
            <DialogFooter className="flex-shrink-0 pt-2 border-t">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Отмена
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-nature-forest hover:bg-nature-forest/90 text-white"
              >
                {saving && (
                  <Icon name="Loader2" size={16} className="animate-spin" />
                )}
                Сохранить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Icon name="Trash2" size={20} className="text-red-500" />
                Удалить услугу
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600 py-2">
              Вы уверены, что хотите удалить эту услугу? Это действие нельзя
              отменить.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                Отмена
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={saving}
              >
                {saving && (
                  <Icon name="Loader2" size={16} className="animate-spin" />
                )}
                Удалить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  },
);

export default MasterServices;