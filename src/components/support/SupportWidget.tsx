import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supportApi, FaqItem } from "@/lib/support-api";
import AttachmentPicker from "@/components/support/AttachmentPicker";
import { toast } from "sonner";

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

// «Тёплая» капча: задача в стиле бани
type CaptchaTask = {
  question: string;
  image: string;
  hint: string;
  answer: number;
};

function makeCaptcha(): CaptchaTask {
  const variants: CaptchaTask[] = [
    {
      image: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/a1619179-149e-4609-9c5a-c3441887ff5c.jpg",
      question: "Сколько поленьев нужно подкинуть в печку, если уже горит 2, а нужно 5?",
      hint: "Считайте, как в бане — спокойно и без спешки",
      answer: 3,
    },
    {
      image: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/69d3513a-a0a8-4cf0-856d-da7d60dad9e1.jpg",
      question: "В чайник входит 4 чашки чая. Сколько чашек ещё помещается, если налили 1?",
      hint: "Тёплая математика для тёплой компании",
      answer: 3,
    },
    {
      image: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/c7b14206-d862-476c-bb68-21f206310077.jpg",
      question: "В парилке +60°C, а нужно +90°C. На сколько градусов поднять температуру?",
      hint: "Аккуратно — пар любит точность",
      answer: 30,
    },
    {
      image: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/fbeef153-e043-46ce-891f-1f7ae43e55a9.jpg",
      question: "У вас 2 веника, а пришло 6 человек. Сколько ещё веников связать?",
      hint: "По одному на каждого",
      answer: 4,
    },
    {
      image: "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/cdaa6f57-627f-4183-ac95-2d026d91e2c5.jpg",
      question: "В шайке 3 ковша воды. Сколько ковшей долить, чтобы стало 7?",
      hint: "Не больше, не меньше",
      answer: 4,
    },
  ];
  return variants[Math.floor(Math.random() * variants.length)];
}

export default function SupportWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
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

  return (
    <>
      {/* Плавающая кнопка */}
      <button
        aria-label="Открыть помощь"
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-4 right-4 z-[90] w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all
          bg-primary text-primary-foreground hover:scale-105 active:scale-95
          ${open ? "rotate-45" : ""}`}
      >
        <Icon name={open ? "X" : "MessageCircleQuestion"} size={26} />
      </button>

      {/* Окно виджета */}
      {open && (
        <div
          className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-4 z-[95] sm:w-[380px] sm:max-w-[calc(100vw-2rem)] sm:max-h-[80vh]
            bg-background border border-border shadow-2xl sm:rounded-2xl flex flex-col overflow-hidden"
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
  const [captcha, setCaptcha] = useState<CaptchaTask>(() => makeCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");
  const [attachment, setAttachment] = useState<import("@/lib/support-api").AttachmentInfo | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const captchaOk = !user
    ? Number(captchaInput.trim()) === captcha.answer
    : true;

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
            setCaptcha(makeCaptcha());
            setCaptchaInput("");
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
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
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

      {!user && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 p-3">
          <div className="flex items-start gap-2 mb-2">
            <img src={captcha.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium">{captcha.question}</div>
              <div className="text-[11px] text-muted-foreground">
                {captcha.hint}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setCaptcha(makeCaptcha());
                setCaptchaInput("");
              }}
              className="text-muted-foreground hover:text-foreground p-1"
              title="Другая задача"
            >
              <Icon name="RefreshCw" size={14} />
            </button>
          </div>
          <Input
            type="number"
            value={captchaInput}
            onChange={(e) => setCaptchaInput(e.target.value)}
            placeholder="Ответ числом"
            className={
              captchaInput && !captchaOk
                ? "border-rose-400 focus-visible:ring-rose-300"
                : captchaOk && captchaInput
                  ? "border-green-500 focus-visible:ring-green-300"
                  : ""
            }
          />
          {captchaInput && captchaOk && (
            <div className="text-[11px] text-green-600 mt-1 flex items-center gap-1">
              <Icon name="Flame" size={11} />
              Печка горит ровно — можно отправлять
            </div>
          )}
        </div>
      )}

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