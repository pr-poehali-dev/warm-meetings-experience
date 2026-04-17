import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";
import { loginSecurityApi, Login2FAStatus } from "@/lib/user-api";
import { toast } from "sonner";

type Method = "email" | "vk" | "yandex";

const METHOD_META: Record<Method, { title: string; icon: string; description: string }> = {
  email: {
    title: "Email",
    icon: "Mail",
    description: "Код на вашу почту при каждом входе",
  },
  vk: {
    title: "VK ID",
    icon: "Share2",
    description: "Подтверждение через привязанный VK-аккаунт",
  },
  yandex: {
    title: "Яндекс ID",
    icon: "Globe",
    description: "Подтверждение через привязанный Яндекс-аккаунт",
  },
};

export default function LoginSecuritySection() {
  const [status, setStatus] = useState<Login2FAStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<Method>("email");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);

  const load = async () => {
    try {
      const data = await loginSecurityApi.get();
      setStatus(data);
      if (data.explicit_method) setSelectedMethod(data.explicit_method);
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error("Введите текущий пароль");
      return;
    }
    setSaving(true);
    try {
      await loginSecurityApi.set(selectedMethod, password);
      toast.success("Способ подтверждения обновлён");
      setEditing(false);
      setPassword("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error("Введите текущий пароль");
      return;
    }
    setDisabling(true);
    try {
      await loginSecurityApi.disable(password);
      toast.success("Двухфакторная аутентификация отключена");
      setConfirmDisable(false);
      setPassword("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось отключить");
    } finally {
      setDisabling(false);
    }
  };

  if (loading || !status) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-8 flex justify-center">
          <Icon name="Loader2" size={20} className="animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const currentMethod = status.method;
  const isOn = status.enabled;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Icon name="ShieldCheck" size={18} className="text-primary" />
          Двухфакторная защита входа
          {isOn && (
            <span className="ml-auto text-xs px-2.5 py-1 rounded-full font-medium bg-green-50 text-green-700">
              Включена
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.mandatory && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2 text-sm">
            <Icon name="Info" size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <span className="text-blue-800">
              Для вашей роли двухфакторная аутентификация обязательна и не может быть отключена. Можно выбрать удобный способ подтверждения.
            </span>
          </div>
        )}

        {!editing && !confirmDisable && (
          <>
            <p className="text-sm text-muted-foreground">
              {isOn
                ? "При каждом входе в аккаунт мы дополнительно запросим подтверждение выбранным способом."
                : "Включите, чтобы злоумышленник не смог войти в ваш аккаунт, даже узнав пароль."}
            </p>

            {isOn && currentMethod && (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon name={METHOD_META[currentMethod].icon} size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{METHOD_META[currentMethod].title}</div>
                  <div className="text-xs text-muted-foreground">{METHOD_META[currentMethod].description}</div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setEditing(true)}>
                {isOn ? "Сменить способ" : "Включить 2FA"}
              </Button>
              {isOn && !status.mandatory && (
                <Button size="sm" variant="outline" onClick={() => setConfirmDisable(true)}>
                  Отключить
                </Button>
              )}
            </div>
          </>
        )}

        {editing && (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Выберите способ подтверждения</Label>
              {(Object.keys(METHOD_META) as Method[]).map((m) => {
                const disabled =
                  (m === "vk" && !status.vk_linked) ||
                  (m === "yandex" && !status.yandex_linked);
                return (
                  <label
                    key={m}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedMethod === m ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="radio"
                      name="2fa-method"
                      value={m}
                      checked={selectedMethod === m}
                      onChange={() => setSelectedMethod(m)}
                      disabled={disabled}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium flex items-center gap-2">
                        <Icon name={METHOD_META[m].icon} size={14} />
                        {METHOD_META[m].title}
                      </div>
                      <div className="text-xs text-muted-foreground">{METHOD_META[m].description}</div>
                      {disabled && (
                        <div className="text-xs text-amber-700 mt-1">
                          Сначала привяжите {m === "vk" ? "VK" : "Яндекс"}-аккаунт в профиле
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pwdConfirm">Подтвердите паролем</Label>
              <Input
                id="pwdConfirm"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ваш текущий пароль"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? (
                  <>
                    <Icon name="Loader2" size={14} className="animate-spin mr-2" />
                    Сохранение...
                  </>
                ) : (
                  "Сохранить"
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => { setEditing(false); setPassword(""); }}
                disabled={saving}
              >
                Отмена
              </Button>
            </div>
          </form>
        )}

        {confirmDisable && (
          <form onSubmit={handleDisable} className="space-y-3">
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Отключение 2FA делает ваш аккаунт менее защищённым. Подтвердите паролем.
            </p>
            <div className="space-y-2">
              <Label htmlFor="pwdDisable">Текущий пароль</Label>
              <Input
                id="pwdDisable"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" variant="destructive" disabled={disabling}>
                {disabling ? (
                  <>
                    <Icon name="Loader2" size={14} className="animate-spin mr-2" />
                    Отключение...
                  </>
                ) : (
                  "Отключить 2FA"
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => { setConfirmDisable(false); setPassword(""); }}
                disabled={disabling}
              >
                Отмена
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}