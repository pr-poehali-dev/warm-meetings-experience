import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supportApi, FaqItem } from "@/lib/support-api";
import AttachmentPicker from "@/components/support/AttachmentPicker";
import { toast } from "sonner";
import BathCaptcha, { useBathCaptcha } from "@/components/BathCaptcha";

function CategoryPicker({
  value,
  onChange,
  categories,
}: {
  value: string;
  onChange: (v: string) => void;
  categories: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const selected = categories.find((c) => c.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm flex items-center justify-between gap-2 hover:bg-muted/40 transition-colors"
      >
        <span>{selected?.label}</span>
        <Icon name="ChevronDown" size={16} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[200]" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 z-[201] bg-background border border-border rounded-xl shadow-xl overflow-hidden">
            {categories.map((c, i) => (
              <button
                key={c.value}
                type="button"
                onClick={() => { onChange(c.value); setOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-3.5 text-sm transition-colors hover:bg-muted/50
                  ${i !== 0 ? "border-t border-border" : ""}
                  ${c.value === value ? "font-medium text-foreground" : "text-foreground/80"}`}
              >
                <span>{c.label}</span>
                {c.value === value && (
                  <span className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  </span>
                )}
                {c.value !== value && (
                  <span className="w-5 h-5 rounded-full border-2 border-muted-foreground/40" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type Tab = "faq" | "search" | "form";

const ROLE_TABS: { key: string; label: string }[] = [
  { key: "guest", label: "Гость" },
  { key: "participant", label: "Участник" },
  { key: "master", label: "Мастер" },
  { key: "organizer", label: "Организатор" },
  { key: "partner", label: "Управляющий" },
];

const CATEGORIES = [
  { value: "booking", label: "Проблема с бронированием" },
  { value: "payment", label: "Вопрос по оплате" },
  { value: "tech", label: "Техническая проблема" },
  { value: "idea", label: "Предложение" },
  { value: "other", label: "Другое" },
];


export default function SupportWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // На страницах с собственной кнопкой «Задать вопрос» виджет не показываем,
  // чтобы не перекрывать действия пользователя.
  const hideOnPath =
    /^\/events\/[^/]+$/.test(location.pathname) ||
    location.pathname.startsWith("/account") ||
    location.pathname.startsWith("/workspace");
  const [tab, setTab] = useState<Tab>("faq");
  const [role, setRole] = useState<string>("guest");
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const loadedRef = useRef(false);

  useEffect(() => {
    if (user) setRole("participant");
  }, [user]);

  useEffect(() => {
    if (!open || loadedRef.current) return;
    loadedRef.current = true;
    setFaqLoading(true);
    supportApi
      .fetchFaq()
      .then(setFaq)
      .catch(() => toast.error("Не удалось загрузить вопросы"))
      .finally(() => setFaqLoading(false));
  }, [open]);

  const faqByRole = useMemo(() => faq.filter((f) => f.role === role), [faq, role]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 3) return [];
    return faq.filter(
      (f) =>
        f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    );
  }, [faq, search]);

  // Esc для закрытия
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (hideOnPath) return null;

  return (
    <>
      {/* Плавающая кнопка */}
      <button
        aria-label="Открыть помощь"
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-6 right-4 z-[30] w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-xl flex items-center justify-center transition-all
          bg-primary text-primary-foreground hover:scale-105 active:scale-95
          ${open ? "rotate-45" : ""}`}
        style={{ bottom: 'max(24px, env(safe-area-inset-bottom, 0px) + 16px)', right: 'max(16px, env(safe-area-inset-right, 0px) + 8px)' }}
      >
        <Icon name={open ? "X" : "MessageCircleQuestion"} size={26} />
      </button>

      {/* Окно виджета */}
      {open && (
        <div
          className="fixed inset-0 sm:inset-auto sm:right-4 z-[95] sm:w-[380px] sm:max-w-[calc(100vw-2rem)] sm:max-h-[80vh]
            bg-background border border-border shadow-2xl sm:rounded-2xl flex flex-col overflow-hidden"
          style={{ bottom: 'max(88px, env(safe-area-inset-bottom, 0px) + 80px)' }}
          role="dialog"
          aria-label="Помощь и поддержка"
        >
          {/* Шапка */}
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center text-lg">
              🪵
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Банная служба поддержки</div>
              <div className="text-xs opacity-90">Поможем разобраться</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Закрыть"
              className="sm:hidden p-1 rounded-md hover:bg-primary-foreground/15"
            >
              <Icon name="X" size={20} />
            </button>
          </div>

          {/* Табы */}
          <div className="flex border-b border-border bg-muted/40">
            {[
              { k: "faq", icon: "BookOpen", label: "Вопросы" },
              { k: "search", icon: "Search", label: "Поиск" },
              { k: "form", icon: "Send", label: "Написать" },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k as Tab)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors
                  ${tab === t.k ? "text-primary border-b-2 border-primary -mb-px bg-background" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon name={t.icon} size={16} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Контент */}
          <div className="flex-1 overflow-y-auto p-4">
            {tab === "faq" && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {ROLE_TABS.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => {
                        setRole(r.key);
                        setOpenFaq(null);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-full transition-colors
                        ${role === r.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                {faqLoading && (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <Icon name="Loader2" size={20} className="animate-spin mx-auto mb-2" />
                    Подгружаем вопросы…
                  </div>
                )}

                {!faqLoading && faqByRole.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Для этой роли пока пусто. Загляните на другую вкладку или напишите нам.
                  </div>
                )}

                {faqByRole.map((f) => (
                  <div
                    key={f.id}
                    className="border border-border rounded-xl overflow-hidden bg-card"
                  >
                    <button
                      onClick={() => setOpenFaq(openFaq === f.id ? null : f.id)}
                      className="w-full text-left px-3 py-2.5 flex items-center gap-2 text-sm font-medium hover:bg-muted/40 transition-colors"
                    >
                      <span className="flex-1">{f.question}</span>
                      <Icon
                        name="ChevronDown"
                        size={16}
                        className={`text-muted-foreground transition-transform ${openFaq === f.id ? "rotate-180" : ""}`}
                      />
                    </button>
                    {openFaq === f.id && (
                      <div className="px-3 pb-3 text-sm text-muted-foreground whitespace-pre-line">
                        {f.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === "search" && (
              <SearchTab
                search={search}
                setSearch={setSearch}
                results={searchResults}
                openFaq={openFaq}
                setOpenFaq={setOpenFaq}
              />
            )}

            {tab === "form" && (
              <ContactForm onDone={() => setTab("faq")} />
            )}
          </div>

          {/* Футер */}
          <div className="px-4 py-2 border-t border-border bg-muted/30 text-[11px] text-muted-foreground flex items-center justify-between">
            {user ? (
              <Link
                to="/account?tab=support"
                className="hover:text-foreground transition-colors flex items-center gap-1"
                onClick={() => setOpen(false)}
              >
                <Icon name="Inbox" size={11} />
                Мои обращения
              </Link>
            ) : (
              <span>Отвечаем в течение 24 часов</span>
            )}
            <span className="opacity-70">v1</span>
          </div>
        </div>
      )}
    </>
  );
}

function SearchTab({
  search,
  setSearch,
  results,
  openFaq,
  setOpenFaq,
}: {
  search: string;
  setSearch: (v: string) => void;
  results: FaqItem[];
  openFaq: number | null;
  setOpenFaq: (v: number | null) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Icon
          name="Search"
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Начните печатать…"
          className="pl-9"
        />
      </div>

      {search.trim().length < 3 && (
        <p className="text-xs text-muted-foreground text-center py-6">
          Введите хотя бы 3 буквы — мы найдём ответ в нашей базе.
        </p>
      )}

      {search.trim().length >= 3 && results.length === 0 && (
        <div className="text-center py-6 text-sm">
          <div className="text-muted-foreground mb-2">
            По запросу «{search}» ничего не нашли
          </div>
          <div className="text-xs text-muted-foreground">
            Попробуйте написать нам на вкладке «Написать» — ответим лично.
          </div>
        </div>
      )}

      {results.map((f) => (
        <div key={f.id} className="border border-border rounded-xl bg-card">
          <button
            onClick={() => setOpenFaq(openFaq === f.id ? null : f.id)}
            className="w-full text-left px-3 py-2.5 flex items-center gap-2 text-sm hover:bg-muted/40 transition-colors"
          >
            <span className="flex-1 font-medium">{f.question}</span>
            <Icon
              name="ChevronDown"
              size={16}
              className={`text-muted-foreground transition-transform ${openFaq === f.id ? "rotate-180" : ""}`}
            />
          </button>
          {openFaq === f.id && (
            <div className="px-3 pb-3 text-sm text-muted-foreground whitespace-pre-line">
              {f.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ContactForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [category, setCategory] = useState("other");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const captcha = useBathCaptcha();
  const [attachment, setAttachment] = useState<import("@/lib/support-api").AttachmentInfo | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const captchaOk = !user ? captcha.isValid : true;

  const submit = async () => {
    if (sending) return;
    if (!subject.trim() || !message.trim()) {
      toast.error("Заполните тему и сообщение");
      return;
    }
    if (!user && !captchaOk) {
      toast.error("Печка ещё не догрелась — проверьте ответ");
      return;
    }
    setSending(true);
    try {
      await supportApi.createTicket({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        category,
        message: message.trim(),
        captcha_ok: captchaOk,
        attachment_url: attachment?.url || null,
        attachment_name: attachment?.filename || null,
      });
      setDone(true);
      toast.success("Сообщение принято — ответим в течение 24 часов");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отправить");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="text-center py-8 px-2">
        <div className="text-5xl mb-3">🪵🔥</div>
        <h3 className="font-semibold mb-1">Сообщение принято!</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Печка затоплена, ответим в течение 24 часов. Ответ придёт на email.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setDone(false);
            setSubject("");
            setMessage("");
            setAttachment(null);
            captcha.reset();
            onDone();
          }}
        >
          Готово
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!user && (
        <>
          <div>
            <Label className="text-xs">Как к вам обращаться</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ваше имя"
            />
          </div>
          <div>
            <Label className="text-xs">Email для ответа</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
        </>
      )}

      <div>
        <Label className="text-xs">Тема</Label>
        <CategoryPicker value={category} onChange={setCategory} categories={CATEGORIES} />
      </div>

      <div>
        <Label className="text-xs">Кратко о чём</Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Например: не могу отменить запись"
          maxLength={120}
        />
      </div>

      <div>
        <Label className="text-xs">Расскажите подробнее</Label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Опишите ситуацию — чем подробнее, тем быстрее поможем"
          rows={4}
        />
      </div>

      <div>
        <Label className="text-xs">Файл (по желанию)</Label>
        <AttachmentPicker attachment={attachment} onChange={setAttachment} />
      </div>

      {!user && <BathCaptcha {...captcha} />}

      <Button onClick={submit} disabled={sending} className="w-full">
        {sending ? (
          <>
            <Icon name="Loader2" size={14} className="mr-1.5 animate-spin" />
            Отправляем…
          </>
        ) : (
          <>
            <Icon name="Send" size={14} className="mr-1.5" />
            Отправить
          </>
        )}
      </Button>

      <p className="text-[11px] text-muted-foreground text-center">
        Нажимая «Отправить», вы соглашаетесь с{" "}
        <Link to="/documents?tab=privacy" className="underline">
          политикой конфиденциальности
        </Link>
        .
      </p>
    </div>
  );
}