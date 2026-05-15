import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";
import { crmApi } from "@/lib/crm-api";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export default function AddClientDialog({ open, onClose, onAdded }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [telegram, setTelegram] = useState("");
  const [vk, setVk] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setName(""); setPhone(""); setEmail(""); setTelegram(""); setVk(""); setError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Введите имя");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const r = await crmApi.addExternalGuest({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        telegram: telegram.trim(),
        vk: vk.trim(),
      });
      if (!r.created && r.duplicate_id) {
        setError("Такой клиент уже есть — найдите его в списке по телефону или email.");
      } else {
        reset();
        onAdded();
        onClose();
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="UserPlus" size={18} />
            Добавить клиента вручную
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <Label className="text-xs">Имя *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Иван Петров" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Телефон</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7…" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mail@…" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Telegram</Label>
              <Input value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="@username" />
            </div>
            <div>
              <Label className="text-xs">VK</Label>
              <Input value={vk} onChange={(e) => setVk(e.target.value)} placeholder="id или username" />
            </div>
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Отмена</Button>
            <Button type="submit" size="sm" disabled={!name.trim() || saving}>
              {saving ? <Icon name="Loader2" size={14} className="animate-spin" /> : "Добавить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
