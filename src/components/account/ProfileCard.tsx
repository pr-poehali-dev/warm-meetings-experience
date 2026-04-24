import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { User, userProfileApi } from "@/lib/user-api";
import VkLinkSection from "@/components/account/VkLinkSection";
import YandexLinkSection from "@/components/account/YandexLinkSection";
import { toast } from "sonner";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}${"*".repeat(Math.min(local.length - 2, 4))}${local[local.length - 1]}@${domain}`;
}

function maskPhone(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return phone;
  return `+7 (***) ***-**-${digits.slice(-2)}`;
}

interface ProfileCardProps {
  user: User;
  editing: boolean;
  editName: string;
  editEmail: string;
  editPhone: string;
  editTelegram: string;
  savingProfile: boolean;
  setEditing: (editing: boolean) => void;
  setEditName: (name: string) => void;
  setEditEmail: (email: string) => void;
  setEditPhone: (phone: string) => void;
  setEditTelegram: (telegram: string) => void;
  handleSaveProfile: () => void;
  handleCancelEdit: () => void;
  deletePassword: string;
  setDeletePassword: (v: string) => void;
  deletingAccount: boolean;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (v: boolean) => void;
  handleDeleteAccount: (e: React.FormEvent) => void;
  onVkLinked?: (vkId: string) => void;
  onVkUnlinked?: () => void;
  onYandexLinked?: (yandexId: string) => void;
  onYandexUnlinked?: () => void;
}

export default function ProfileCard({
  user,
  editing,
  editName,
  editEmail,
  editPhone,
  editTelegram,
  savingProfile,
  setEditing,
  setEditName,
  setEditEmail,
  setEditPhone,
  setEditTelegram,
  handleSaveProfile,
  handleCancelEdit,
  deletePassword,
  setDeletePassword,
  deletingAccount,
  showDeleteConfirm,
  setShowDeleteConfirm,
  handleDeleteAccount,
  onVkLinked,
  onVkUnlinked,
  onYandexLinked,
  onYandexUnlinked,
}: ProfileCardProps) {
  const [showPhone, setShowPhone] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [sendingVerify, setSendingVerify] = useState(false);

  const handleSendVerify = async () => {
    setSendingVerify(true);
    try {
      await userProfileApi.sendVerifyEmail();
      toast.success("Письмо отправлено — проверьте почту");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка отправки");
    } finally {
      setSendingVerify(false);
    }
  };

  const initials = user.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      {/* Визитка-шапка */}
      <div className="bg-gradient-to-br from-primary/15 to-primary/5 px-5 pt-5 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-xl font-semibold text-primary flex-shrink-0 select-none">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-lg leading-tight truncate">{user.name || "Имя не указано"}</div>
            {!user.email?.includes("@vk.local") && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm text-muted-foreground truncate">
                  {showEmail ? user.email : maskEmail(user.email)}
                </span>
                <button
                  onClick={() => setShowEmail(!showEmail)}
                  className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                >
                  <Icon name={showEmail ? "EyeOff" : "Eye"} size={13} />
                </button>
                {user.email_verified
                  ? <Icon name="CheckCircle" size={13} className="text-green-500 flex-shrink-0" />
                  : <button onClick={handleSendVerify} disabled={sendingVerify} className="text-xs text-amber-600 underline underline-offset-2 flex-shrink-0 disabled:opacity-50">
                      {sendingVerify ? "..." : "подтвердить"}
                    </button>
                }
              </div>
            )}
            {/* Бейджи привязанных аккаунтов */}
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {user.email_verified && (
                <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Email ✓</span>
              )}
              {user.vk_id && (
                <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">VK</span>
              )}
              {user.telegram && (
                <span className="text-xs bg-sky-500 text-white px-2 py-0.5 rounded-full">TG</span>
              )}
              {user.yandex_id && (
                <span className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded-full">Яндекс</span>
              )}
            </div>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="w-8 h-8 rounded-full bg-background/70 hover:bg-background flex items-center justify-center transition-colors flex-shrink-0"
              title="Редактировать"
            >
              <Icon name="Pencil" size={14} className="text-foreground" />
            </button>
          )}
        </div>
      </div>

      <CardContent className="p-5">
        {editing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Имя</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            {(user.email?.includes("@vk.local") || !user.email_verified) ? (
              <div className="space-y-2">
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  placeholder="your@email.com"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {user.email?.includes("@vk.local")
                    ? "Укажите email для уведомлений и восстановления доступа"
                    : "Email можно изменить пока он не подтверждён"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user.email} disabled />
                <p className="text-xs text-muted-foreground">Email нельзя изменить</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="editPhone">Телефон</Label>
              <Input
                id="editPhone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTelegram">Telegram</Label>
              <Input
                id="editTelegram"
                placeholder="@username"
                value={editTelegram}
                onChange={(e) => setEditTelegram(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? (
                  <>
                    <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                    Сохранение...
                  </>
                ) : (
                  "Сохранить"
                )}
              </Button>
              <Button variant="outline" onClick={handleCancelEdit} disabled={savingProfile}>
                Отмена
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {user.phone && (
              <div className="flex items-center gap-3">
                <Icon name="Phone" size={15} className="text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground">Телефон</div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">
                      {showPhone ? user.phone : maskPhone(user.phone)}
                    </div>
                    <button
                      onClick={() => setShowPhone(!showPhone)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Icon name={showPhone ? "EyeOff" : "Eye"} size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )}
            {user.telegram && (
              <div className="flex items-center gap-3">
                <Icon name="Send" size={15} className="text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Telegram</div>
                  <div className="text-sm font-medium">{user.telegram}</div>
                </div>
              </div>
            )}
            {/* Привязка аккаунтов */}
            <div className="pt-2 border-t border-border space-y-2">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Привязанные аккаунты</div>
              <VkLinkSection
                vkId={user.vk_id}
                hasPassword={user.has_password !== false}
                onLinked={onVkLinked || (() => {})}
                onUnlinked={onVkUnlinked || (() => {})}
              />
              <YandexLinkSection
                yandexId={user.yandex_id}
                hasPassword={user.has_password !== false}
                onLinked={onYandexLinked || (() => {})}
                onUnlinked={onYandexUnlinked || (() => {})}
              />
            </div>
          </div>
        )}

        {/* Удаление аккаунта */}
        {!editing && (
          <div className="mt-8 pt-6 border-t border-border">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-sm text-destructive hover:underline flex items-center gap-1.5"
              >
                <Icon name="Trash2" size={14} />
                Удалить аккаунт
              </button>
            ) : (
              <form onSubmit={handleDeleteAccount} className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Все ваши персональные данные будут обезличены. Это действие необратимо.
                </p>
                <div className="space-y-2">
                  {user.has_password !== false ? (
                    <>
                      <Label htmlFor="deletePassword">Введите пароль для подтверждения</Label>
                      <Input
                        id="deletePassword"
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="Ваш текущий пароль"
                      />
                    </>
                  ) : (
                    <>
                      <Label htmlFor="deletePassword">Введите слово УДАЛИТЬ для подтверждения</Label>
                      <Input
                        id="deletePassword"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="УДАЛИТЬ"
                      />
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    variant="destructive"
                    size="sm"
                    disabled={deletingAccount}
                  >
                    {deletingAccount ? (
                      <>
                        <Icon name="Loader2" size={14} className="animate-spin mr-1.5" />
                        Удаление...
                      </>
                    ) : (
                      "Удалить аккаунт"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeletePassword("");
                    }}
                    disabled={deletingAccount}
                  >
                    Отмена
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}