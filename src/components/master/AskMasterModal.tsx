import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { masterChatApi } from "@/lib/master-calendar-api";

interface Props {
  open: boolean;
  masterId: number;
  masterName: string;
  onClose: () => void;
}

type ContactType = "email" | "phone" | "telegram";

const CONTACT_OPTS: { id: ContactType; label: string; icon: string; placeholder: string }[] = [
  { id: "email", label: "Email", icon: "Mail", placeholder: "you@example.com" },
  { id: "phone", label: "Телефон", icon: "Phone", placeholder: "+7 900 000-00-00" },
  { id: "telegram", label: "Telegram", icon: "Send", placeholder: "@username" },
];

const AskMasterModal = ({ open, masterId, masterName, onClose }: Props) => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [contactType, setContactType] = useState<ContactType>("email");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [chatToken, setChatToken] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      setName((prev) => prev || user.name || "");
      if (user.email) {
        setContact((prev) => prev || user.email || "");
        setContactType("email");
      } else if (user.phone) {
        setContact((prev) => prev || user.phone || "");
        setContactType("phone");
      }
    }
  }, [open, user]);

  const validContact = () => {
    const c = contact.trim();
    if (contactType === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c);
    if (contactType === "phone") return c.replace(/\D/g, "").length >= 10;
    return /^@?[A-Za-z0-9_]{3,32}$/.test(c);
  };

  const handleSubmit = async () => {
    if (sending) return;
    if (name.trim().length < 2) { toast.error("Укажите имя"); return; }
    if (!validContact()) { toast.error("Проверьте контакт"); return; }
    if (message.trim().length < 5) { toast.error("Напишите вопрос подробнее"); return; }
    setSending(true);
    try {
      const r = await masterChatApi.createInquiry({
        master_id: masterId,
        name: name.trim(),
        contact: contact.trim(),
        contact_type: contactType,
        message: message.trim(),
      });
      setChatToken(r.chat_token);
    } catch (e) {
      toast.error("Не удалось отправить: " + String(e));
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setMessage("");
    setChatToken(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && reset()}>
      <DialogContent className="max-w-md">
        {chatToken ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
              <Icon name="Check" size={26} />
            </div>
            <DialogTitle className="text-lg">Вопрос отправлен!</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Мастер получит ваш вопрос и ответит в чате.
            </p>
            <a
              href={`/m/${chatToken}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition"
            >
              <Icon name="MessageCircle" size={16} />
              Открыть чат
            </a>
            <button onClick={reset} className="text-sm text-muted-foreground hover:text-foreground">
              Закрыть
            </button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Icon name="MessageCircleQuestion" size={18} className="text-primary" />
                Вопрос мастеру {masterName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Ваше имя"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
              />
              <div>
                <div className="flex gap-1 bg-muted/60 rounded-xl p-1 mb-2">
                  {CONTACT_OPTS.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => setContactType(o.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        contactType === o.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      <Icon name={o.icon} size={13} />
                      {o.label}
                    </button>
                  ))}
                </div>
                <Input
                  placeholder={CONTACT_OPTS.find((o) => o.id === contactType)?.placeholder}
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  maxLength={200}
                />
              </div>
              <Textarea
                placeholder="Ваш вопрос мастеру…"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={4000}
                className="resize-none"
              />
              <Button onClick={handleSubmit} disabled={sending} className="w-full gap-2">
                {sending ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Send" size={16} />}
                Отправить вопрос
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AskMasterModal;
