import { useEffect, useState } from "react";
import BathCaptcha, { useBathCaptcha } from "@/components/BathCaptcha";
import { useParams } from "react-router-dom";
import NotFound from "@/pages/NotFoundPage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { landingApi, PublicLandingResponse, LandingBlockId } from "@/lib/landing-api";
import BathLoader from "@/components/BathLoader";

const DEFAULT_BLOCKS: LandingBlockId[] = [
  "avatar_name", "about_text", "services", "portfolio", "reviews", "contacts", "map", "cta", "social",
];

const themeClasses: Record<string, { bg: string; accent: string; card: string }> = {
  terracotta: {
    bg: "bg-gradient-to-b from-orange-50 via-amber-50 to-rose-50",
    accent: "text-orange-700",
    card: "bg-white/80 backdrop-blur",
  },
};

export default function LandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<PublicLandingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    landingApi.getPublic(slug)
      .then((d) => setData(d))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (notFound) return <NotFound />;
  if (loading || !data) {
    return <BathLoader label="Загружаем страницу…" />;
  }

  const { landing, owner, master, services, reviews, baths } = data;
  const cd = landing.custom_data || {};
  const theme = themeClasses[landing.theme] || themeClasses.terracotta;
  const blocks = (cd.blocks && cd.blocks.length > 0 ? cd.blocks : DEFAULT_BLOCKS).filter(
    (b) => !cd.hidden_blocks?.includes(b)
  );

  const displayName = cd.display_name || master?.name || owner?.name || landing.slug;
  const tagline = cd.tagline || master?.tagline;
  const avatarUrl = cd.avatar_url || master?.avatar || owner?.avatar_url;
  const aboutText = cd.about_text || master?.bio;
  const contacts = {
    phone: cd.contacts?.phone || owner?.phone,
    email: cd.contacts?.email || owner?.email,
    telegram: cd.contacts?.telegram || owner?.telegram,
    whatsapp: cd.contacts?.whatsapp,
    vk: cd.contacts?.vk,
    instagram: cd.contacts?.instagram,
    youtube: cd.contacts?.youtube,
  };
  const visibleServices = services.filter((s) => !cd.hidden_service_ids?.includes(s.id));
  const portfolioItems = cd.portfolio || [];
  const mapAddress = cd.map_address || baths[0]?.address;
  const mapCoords = baths[0]?.lat && baths[0]?.lng ? { lat: Number(baths[0].lat), lng: Number(baths[0].lng) } : null;

  const scrollToCta = () => {
    landingApi.ctaClick(landing.slug);
    document.getElementById("landing-cta")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className={`min-h-screen ${theme.bg}`}>
      <div className="container mx-auto px-4 sm:px-6 max-w-3xl py-8 md:py-12">
        {blocks.map((blockId) => {
          switch (blockId) {
            case "avatar_name":
              return (
                <section key={blockId} className="mb-8 text-center">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover mx-auto mb-5 shadow-lg ring-4 ring-white"
                    />
                  ) : (
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-orange-200 to-rose-200 flex items-center justify-center mx-auto mb-5 shadow-lg ring-4 ring-white">
                      <Icon name="User" size={48} className="text-white/90" />
                    </div>
                  )}
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{displayName}</h1>
                  {tagline && <p className={`text-lg ${theme.accent} font-medium`}>{tagline}</p>}
                  {master?.rating && (
                    <div className="mt-3 inline-flex items-center gap-1.5 text-sm bg-white/70 rounded-full px-3 py-1 shadow-sm">
                      <Icon name="Star" size={14} className="text-yellow-500 fill-yellow-500" />
                      <span className="font-semibold">{master.rating}</span>
                      {master.reviews_count ? <span className="text-muted-foreground">({master.reviews_count})</span> : null}
                    </div>
                  )}
                </section>
              );

            case "about_text":
              if (!aboutText) return null;
              return (
                <Card key={blockId} className={`mb-6 border-0 shadow-sm ${theme.card}`}>
                  <CardContent className="p-6">
                    <h2 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${theme.accent}`}>
                      <Icon name="FileText" size={18} /> О себе
                    </h2>
                    <p className="text-foreground/90 leading-relaxed whitespace-pre-line">{aboutText}</p>
                  </CardContent>
                </Card>
              );

            case "services":
              if (visibleServices.length === 0) return null;
              return (
                <Card key={blockId} className={`mb-6 border-0 shadow-sm ${theme.card}`}>
                  <CardContent className="p-6">
                    <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${theme.accent}`}>
                      <Icon name="Sparkles" size={18} /> Услуги
                    </h2>
                    <div className="space-y-3">
                      {visibleServices.map((s) => (
                        <div key={s.id} className="flex items-start justify-between gap-4 py-2 border-b last:border-0">
                          <div className="min-w-0">
                            <div className="font-medium text-foreground">{s.name}</div>
                            {s.description && <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>}
                            {s.duration_minutes ? <div className="text-xs text-muted-foreground mt-0.5">⏱ {s.duration_minutes} мин</div> : null}
                          </div>
                          <div className={`font-bold whitespace-nowrap ${theme.accent}`}>
                            {Number(s.price || 0).toLocaleString("ru-RU")} ₽
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );

            case "portfolio":
              if (portfolioItems.length === 0) return null;
              return (
                <Card key={blockId} className={`mb-6 border-0 shadow-sm ${theme.card}`}>
                  <CardContent className="p-6">
                    <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${theme.accent}`}>
                      <Icon name="Image" size={18} /> Портфолио
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {portfolioItems.map((item, i) =>
                        item.type === "image" ? (
                          <a key={i} href={item.url} target="_blank" rel="noreferrer" className="aspect-square rounded-xl overflow-hidden bg-muted block">
                            <img src={item.url} alt={item.caption || ""} className="w-full h-full object-cover" />
                          </a>
                        ) : (
                          <a key={i} href={item.url} target="_blank" rel="noreferrer" className="aspect-square rounded-xl overflow-hidden bg-black/80 flex items-center justify-center">
                            <Icon name="Play" size={32} className="text-white" />
                          </a>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              );

            case "reviews":
              if (reviews.length === 0) return null;
              return (
                <Card key={blockId} className={`mb-6 border-0 shadow-sm ${theme.card}`}>
                  <CardContent className="p-6">
                    <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${theme.accent}`}>
                      <Icon name="Star" size={18} /> Отзывы
                    </h2>
                    <div className="space-y-4">
                      {reviews.slice(0, 5).map((r) => (
                        <div key={r.id} className="border-b last:border-0 pb-3 last:pb-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-medium text-sm">{r.client_name}</span>
                            <div className="flex">
                              {Array.from({ length: 5 }).map((_, idx) => (
                                <Icon key={idx} name="Star" size={12} className={idx < r.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"} />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-foreground/80">{r.text}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );

            case "contacts":
              return (
                <Card key={blockId} className={`mb-6 border-0 shadow-sm ${theme.card}`}>
                  <CardContent className="p-6">
                    <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${theme.accent}`}>
                      <Icon name="Phone" size={18} /> Контакты
                    </h2>
                    <div className="space-y-2.5 text-sm">
                      {/* Телефоны и WhatsApp скрываем в целях приватности — оставляем только действие. */}
                      {contacts.phone && <ContactRow icon="Phone" label="Телефон" value="Позвонить" href={`tel:${contacts.phone}`} />}
                      {contacts.email && <ContactRow icon="Mail" label="Email" value={contacts.email} href={`mailto:${contacts.email}`} />}
                      {contacts.telegram && <ContactRow icon="Send" label="Telegram" value={`@${contacts.telegram.replace(/^@/, "")}`} href={`https://t.me/${contacts.telegram.replace(/^@/, "")}`} />}
                      {contacts.whatsapp && <ContactRow icon="MessageCircle" label="WhatsApp" value="Написать в WhatsApp" href={`https://wa.me/${contacts.whatsapp.replace(/[^0-9]/g, "")}`} />}
                      {contacts.vk && <ContactRow icon="Globe" label="ВКонтакте" value={contacts.vk} href={contacts.vk.startsWith("http") ? contacts.vk : `https://vk.com/${contacts.vk}`} />}
                    </div>
                  </CardContent>
                </Card>
              );

            case "map":
              if (!mapAddress) return null;
              return (
                <Card key={blockId} className={`mb-6 border-0 shadow-sm overflow-hidden ${theme.card}`}>
                  <CardContent className="p-6">
                    <h2 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${theme.accent}`}>
                      <Icon name="MapPin" size={18} /> Где найти
                    </h2>
                    <div className="text-sm text-foreground/90 mb-3">{mapAddress}</div>
                    {mapCoords && (
                      <div className="rounded-lg overflow-hidden">
                        <iframe
                          title="Карта"
                          src={`https://yandex.ru/map-widget/v1/?ll=${mapCoords.lng}%2C${mapCoords.lat}&z=15&pt=${mapCoords.lng},${mapCoords.lat},pm2rdm`}
                          width="100%"
                          height="280"
                          frameBorder="0"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );

            case "cta":
              return (
                <div key={blockId} id="landing-cta" className="mb-6">
                  <CtaForm slug={landing.slug} title={cd.cta_title} description={cd.cta_description} accent={theme.accent} />
                </div>
              );

            case "social":
              if (!cd.social || Object.values(cd.social).every((v) => !v)) return null;
              return (
                <Card key={blockId} className={`mb-6 border-0 shadow-sm ${theme.card}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      {cd.social.telegram && <SocialIcon icon="Send" href={`https://t.me/${cd.social.telegram.replace(/^@/, "")}`} />}
                      {cd.social.vk && <SocialIcon icon="Globe" href={cd.social.vk.startsWith("http") ? cd.social.vk : `https://vk.com/${cd.social.vk}`} />}
                      {cd.social.youtube && <SocialIcon icon="Youtube" href={cd.social.youtube} />}
                      {cd.social.instagram && <SocialIcon icon="Instagram" href={cd.social.instagram.startsWith("http") ? cd.social.instagram : `https://instagram.com/${cd.social.instagram}`} />}
                    </div>
                  </CardContent>
                </Card>
              );
          }
          return null;
        })}

        {!blocks.includes("cta") && (
          <Button onClick={scrollToCta} size="lg" className="rounded-full w-full md:w-auto mx-auto block bg-orange-600 hover:bg-orange-700 text-white">
            Записаться
          </Button>
        )}

        <div className="text-center text-xs text-muted-foreground mt-10">
          Создано на <a href="/" className="font-medium hover:text-foreground">sparcom.ru</a>
        </div>
      </div>
    </div>
  );
}

function ContactRow({ icon, label, value, href }: { icon: string; label: string; value: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition">
      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
        <Icon name={icon} size={15} className="text-orange-700" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium text-sm truncate">{value}</div>
      </div>
    </a>
  );
}

function SocialIcon({ icon, href }: { icon: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-orange-100 hover:bg-orange-200 flex items-center justify-center transition">
      <Icon name={icon} size={18} className="text-orange-700" />
    </a>
  );
}

function CtaForm({ slug, title, description, accent }: { slug: string; title?: string; description?: string; accent: string }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const captcha = useBathCaptcha();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) {
      toast.error("Укажите имя и контакт");
      return;
    }
    if (!captcha.isValid) {
      toast.error("Ответьте на вопрос-проверку");
      return;
    }
    setLoading(true);
    try {
      await landingApi.sendLead(slug, { name: name.trim(), contact: contact.trim(), message: message.trim() });
      landingApi.ctaClick(slug);
      setSent(true);
    } catch {
      toast.error("Не удалось отправить заявку");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-md bg-white">
      <CardContent className="p-6">
        <h2 className={`text-xl font-bold mb-2 ${accent}`}>{title || "Записаться"}</h2>
        <p className="text-sm text-muted-foreground mb-4">{description || "Оставьте контакт — свяжусь с вами в ближайшее время"}</p>
        {sent ? (
          <div className="text-center py-6 space-y-2">
            <div className="w-14 h-14 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <Icon name="CheckCircle2" size={28} className="text-green-600" />
            </div>
            <h3 className="font-semibold">Заявка отправлена!</h3>
            <p className="text-sm text-muted-foreground">Свяжемся с вами в ближайшее время.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <Input placeholder="Ваше имя" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input placeholder="Телефон или Telegram" value={contact} onChange={(e) => setContact(e.target.value)} required />
            <Textarea placeholder="Сообщение (необязательно)" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
            <BathCaptcha {...captcha} />
            <Button type="submit" disabled={loading || !captcha.isValid} className="w-full bg-orange-600 hover:bg-orange-700 text-white">
              {loading ? <Icon name="Loader2" size={16} className="animate-spin" /> : "Отправить заявку"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}