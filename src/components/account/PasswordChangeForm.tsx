import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Icon from "@/components/ui/icon";

interface PasswordChangeFormProps {
  hasPassword: boolean;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
  changingPassword: boolean;
  setCurrentPassword: (value: string) => void;
  setNewPassword: (value: string) => void;
  setConfirmNewPassword: (value: string) => void;
  handleChangePassword: (e: React.FormEvent) => void;
}

export default function PasswordChangeForm({
  hasPassword,
  currentPassword,
  newPassword,
  confirmNewPassword,
  changingPassword,
  setCurrentPassword,
  setNewPassword,
  setConfirmNewPassword,
  handleChangePassword,
}: PasswordChangeFormProps) {
  const title = hasPassword ? "Смена пароля" : "Установить пароль";
  const description = hasPassword
    ? undefined
    : "Установите пароль, чтобы входить по email и паролю";

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleChangePassword} className="space-y-4">
          {hasPassword && (
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Текущий пароль</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="Введите текущий пароль"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="newPassword">
              {hasPassword ? "Новый пароль" : "Пароль"}
            </Label>
            <Input
              id="newPassword"
              type="password"
              placeholder={hasPassword ? "Введите новый пароль" : "Минимум 6 символов"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmNewPassword">
              {hasPassword ? "Подтверждение нового пароля" : "Подтверждение пароля"}
            </Label>
            <Input
              id="confirmNewPassword"
              type="password"
              placeholder="Повторите пароль"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={changingPassword}>
            {changingPassword ? (
              <>
                <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                Сохранение...
              </>
            ) : hasPassword ? (
              "Изменить пароль"
            ) : (
              "Установить пароль"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
