import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { userProfileApi } from "@/lib/user-api";
import { toast } from "sonner";

interface TwoFactorSectionProps {
  totpEnabled: boolean;
  hasPassword: boolean;
  onToggled: (enabled: boolean) => void;
}

export default function TwoFactorSection({ totpEnabled, hasPassword, onToggled }: TwoFactorSectionProps) {
  const [step, setStep] = useState<"idle" | "setup" | "verify" | "backup" | "disable">("idle");
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState("");
  const [provisioningUri, setProvisioningUri] = useState("");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");

  const handleSetup = async () => {
    setLoading(true);
    try {
      const data = await userProfileApi.totpSetup();
      setSecret(data.secret);
      setProvisioningUri(data.provisioning_uri);
      setStep("setup");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка настройки 2FA");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error("Введите 6-значный код");
      return;
    }
    setLoading(true);
    try {
      const data = await userProfileApi.totpVerify(code);
      setBackupCodes(data.backup_codes);
      setStep("backup");
      onToggled(true);
      toast.success("2FA успешно включена");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Неверный код");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword && !disableCode) {
      toast.error("Введите пароль или код из при��ожения");
      return;
    }
    setLoading(true);
    try {
      await userProfileApi.totpDisable({
        password: disablePassword || undefined,
        code: disableCode || undefined,
      });
      onToggled(false);
      setStep("idle");
      setDisablePassword("");
      setDisableCode("");
      toast.success("2FA отключена");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка отключения 2FA");
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    toast.success("Коды скопированы");
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <Icon name="Shield" size={20} />
            Двухфакторная аутентификация
          </CardTitle>
          {totpEnabled && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              Включена
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {step === "idle" && !totpEnabled && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Добавьте дополнительный уровень защиты с помощью приложения-аутентификатора (Google Authenticator, Authy и др.)
            </p>
            <Button onClick={handleSetup} disabled={loading}>
              {loading ? (
                <Icon name="Loader2" size={16} className="animate-spin mr-2" />
              ) : (
                <Icon name="Plus" size={16} className="mr-2" />
              )}
              Настроить 2FA
            </Button>
          </div>
        )}

        {step === "idle" && totpEnabled && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              2FA включена. При каждом входе потребуется код из приложения-аутентификатора.
            </p>
            <Button variant="outline" onClick={() => setStep("disable")}>
              Отключить 2FA
            </Button>
          </div>
        )}

        {step === "setup" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Отсканируйте QR-код приложением-аутентификатором или введите ключ вручную:
            </p>
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(provisioningUri)}`}
                alt="QR Code"
                className="w-48 h-48"
              />
            </div>
            <div className="bg-muted rounded-lg p-3">
              <Label className="text-xs text-muted-foreground">Ключ для ручного ввода</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm font-mono break-all">{secret}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(secret); toast.success("Скопировано"); }}
                  className="text-muted-foreground hover:text-foreground flex-shrink-0"
                >
                  <Icon name="Copy" size={14} />
                </button>
              </div>
            </div>
            <form onSubmit={handleVerify} className="space-y-3">
              <div className="space-y-2">
                <Label>Введите код из приложения</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-lg tracking-widest font-mono"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading || code.length !== 6}>
                  {loading ? <Icon name="Loader2" size={16} className="animate-spin mr-2" /> : null}
                  Подтвердить
                </Button>
                <Button variant="outline" type="button" onClick={() => { setStep("idle"); setCode(""); }}>
                  Отмена
                </Button>
              </div>
            </form>
          </div>
        )}

        {step === "backup" && (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Icon name="AlertTriangle" size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Сохраните резервные коды</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Эти коды можно использовать для входа, если вы потеряете доступ к приложению-аутентификатору. Каждый код одноразовый.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((c, i) => (
                  <code key={i} className="text-sm font-mono text-center py-1 bg-background rounded">{c}</code>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={copyBackupCodes}>
                <Icon name="Copy" size={14} className="mr-2" />
                Скопировать
              </Button>
              <Button onClick={() => { setStep("idle"); setCode(""); setBackupCodes([]); }}>
                Готово
              </Button>
            </div>
          </div>
        )}

        {step === "disable" && (
          <form onSubmit={handleDisable} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Для отключения 2FA введите пароль или текущий код из приложения:
            </p>
            {hasPassword && (
              <div className="space-y-2">
                <Label>Пароль</Label>
                <Input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Ваш пароль"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>{hasPassword ? "Или код из приложения" : "Код ��з приложения"}</Label>
              <Input
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="text-center font-mono"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="destructive" disabled={loading}>
                {loading ? <Icon name="Loader2" size={16} className="animate-spin mr-2" /> : null}
                Отключить 2FA
              </Button>
              <Button variant="outline" type="button" onClick={() => { setStep("idle"); setDisablePassword(""); setDisableCode(""); }}>
                Отмена
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
