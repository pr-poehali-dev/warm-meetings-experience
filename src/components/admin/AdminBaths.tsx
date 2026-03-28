import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { bathsApi, Bath } from "@/lib/baths-api";
import func2url from "../../../backend/func2url.json";

const BATHS_API = func2url["baths-api"];

const BATH_TYPES_OPTIONS = ["Русская парная", "Финская сауна", "Хамам", "Инфракрасная", "Японская офуро"];
const FEATURES_OPTIONS = ["Купель", "Бассейн", "Дровяная печь", "Финская печь", "Мангал", "Веники", "Парковка", "Комната отдыха", "Панорамный вид"];

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  address: "",
  city: "Москва",
  lat: "",
  lng: "",
  phone: "",
  website: "",
  bath_types: [] as string[],
  features: [] as string[],
  capacity_min: 1,
  capacity_max: 20,
  price_from: 0,
  price_per_hour: 0,
};

function slugify(text: string) {
  const translit: Record<string, string> = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",
    к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",
    х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"
  };
  return text.toLowerCase().trim()
    .split("").map(c => translit[c] ?? (c === " " ? "-" : c)).join("")
    .replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export default function AdminBaths() {
  const [baths, setBaths] = useState<Bath[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const token = localStorage.getItem("admin_token") || "";

  const load = () => {
    setLoading(true);
    bathsApi.getAll().then(setBaths).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (bath: Bath) => {
    setForm({
      name: bath.name,
      slug: bath.slug,
      description: bath.description || "",
      address: bath.address || "",
      city: bath.city || "Москва",
      lat: bath.lat != null ? String(bath.lat) : "",
      lng: bath.lng != null ? String(bath.lng) : "",
      phone: bath.phone || "",
      website: bath.website || "",
      bath_types: bath.bath_types || [],
      features: bath.features || [],
      capacity_min: bath.capacity_min,
      capacity_max: bath.capacity_max,
      price_from: bath.price_from,
      price_per_hour: bath.price_per_hour,
    });
    setEditingId(bath.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        slug: form.slug || slugify(form.name),
        lat: form.lat ? parseFloat(form.lat) : null,
        lng: form.lng ? parseFloat(form.lng) : null,
      };

      if (editingId) {
        await fetch(`${BATHS_API}/?slug=${form.slug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`${BATHS_API}/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      }
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (bath: Bath) => {
    await fetch(`${BATHS_API}/?slug=${bath.slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_active: !bath.is_active }),
    });
    load();
  };

  const toggleArray = (arr: string[], val: string): string[] =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const filtered = baths.filter((b) =>
    !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.address.toLowerCase().includes(search.toLowerCase())
  );

  if (showForm) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Icon name="ArrowLeft" size={20} />
          </button>
          <h2 className="text-xl font-bold">{editingId ? "Редактировать баню" : "Добавить баню"}</h2>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })}
                placeholder="Баня в центре"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="banya-v-centre"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Город</label>
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Москва"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Адрес</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="ул. Тверская, 12"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Описание бани..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+7 (999) 123-45-67"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Сайт</label>
              <input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Широта (lat)</label>
              <input
                value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })}
                placeholder="55.7558"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Долгота (lng)</label>
              <input
                value={form.lng}
                onChange={(e) => setForm({ ...form, lng: e.target.value })}
                placeholder="37.6176"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Цена от (₽)</label>
              <input
                type="number"
                value={form.price_from}
                onChange={(e) => setForm({ ...form, price_from: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Цена за час (₽)</label>
              <input
                type="number"
                value={form.price_per_hour}
                onChange={(e) => setForm({ ...form, price_per_hour: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Вместимость мин.</label>
              <input
                type="number"
                value={form.capacity_min}
                onChange={(e) => setForm({ ...form, capacity_min: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Вместимость макс.</label>
              <input
                type="number"
                value={form.capacity_max}
                onChange={(e) => setForm({ ...form, capacity_max: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Тип бани</label>
            <div className="flex flex-wrap gap-2">
              {BATH_TYPES_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, bath_types: toggleArray(form.bath_types, t) })}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    form.bath_types.includes(t) ? "bg-gray-900 text-white border-gray-900" : "border-gray-300 hover:border-gray-500"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Особенности</label>
            <div className="flex flex-wrap gap-2">
              {FEATURES_OPTIONS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setForm({ ...form, features: toggleArray(form.features, f) })}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    form.features.includes(f) ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 hover:border-gray-500"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="flex-1 bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {saving ? "Сохранение..." : editingId ? "Сохранить изменения" : "Добавить баню"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Бани</h2>
          <p className="text-sm text-gray-500 mt-0.5">{baths.length} бань в базе</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <Icon name="Plus" size={16} />
          Добавить баню
        </button>
      </div>

      <div className="relative mb-4">
        <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию или адресу..."
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {loading ? (
        <div className="text-center py-20">
          <Icon name="Loader2" size={28} className="animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Загрузка...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <Icon name="Home" size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">Бань пока нет</p>
          <button onClick={openNew} className="text-sm text-blue-600 hover:underline">Добавить первую баню</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((bath) => (
            <div key={bath.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4">
              <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                {bath.photos?.[0] ? (
                  <img src={bath.photos[0]} alt={bath.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Icon name="Home" size={24} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{bath.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${bath.is_active !== false ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {bath.is_active !== false ? "Активна" : "Скрыта"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{bath.address}, {bath.city}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <a
                      href={`/baths/${bath.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                      title="Открыть на сайте"
                    >
                      <Icon name="ExternalLink" size={15} />
                    </a>
                    <button
                      onClick={() => handleToggleActive(bath)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                      title={bath.is_active !== false ? "Скрыть" : "Показать"}
                    >
                      <Icon name={bath.is_active !== false ? "EyeOff" : "Eye"} size={15} />
                    </button>
                    <button
                      onClick={() => openEdit(bath)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                    >
                      <Icon name="Pencil" size={15} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {bath.bath_types.slice(0, 2).map((t) => (
                    <span key={t} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                  {bath.features.slice(0, 3).map((f) => (
                    <span key={f} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{f}</span>
                  ))}
                </div>

                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  {bath.price_from > 0 && <span>от {bath.price_from.toLocaleString("ru-RU")} ₽</span>}
                  {bath.rating > 0 && <span>★ {bath.rating.toFixed(1)} ({bath.reviews_count})</span>}
                  {bath.capacity_max > 0 && <span>{bath.capacity_min}–{bath.capacity_max} чел.</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
