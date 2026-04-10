import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { User } from "@/lib/user-api";
import VkLinkSection from "@/components/account/VkLinkSection";

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
  editPhone: string;
  editTelegram: string;
  savingProfile: boolean;
  setEditing: (editing: boolean) => void;
  setEditName: (name: string) => void;
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
}

export default function ProfileCard({
  user,
  editing,
  editName,
  editPhone,
  editTelegram,
  savingProfile,
  setEditing,
  setEditName,
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
}: ProfileCardProps) {
  const [showPhone, setShowPhone] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Профиль</CardTitle>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Icon name="Pencil" size={16} className="mr-2" />
              Редактировать
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
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
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email} disabled />
            </div>
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
            <div className="flex items-center gap-3">
              <Icon name="User" size={16} className="text-muted-foreground flex-shrink-0" />
              <div>
                <div className="text-sm text-muted-foreground">Имя</div>
                <div className="font-medium">{user.name}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Icon name="Mail" size={16} className="text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-muted-foreground">Email</div>
                <div className="flex items-center gap-2">
                  <div className="font-medium">
                    {showEmail ? user.email : maskEmail(user.email)}
                  </div>
                  <button
                    onClick={() => setShowEmail(!showEmail)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title={showEmail ? "Скрыть" : "Показать"}
                  >
                    <Icon name={showEmail ? "EyeOff" : "Eye"} size={14} />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Icon name="Phone" size={16} className="text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-muted-foreground">Телефон</div>
                <div className="flex items-center gap-2">
                  <div className="font-medium">
                    {user.phone
                      ? (showPhone ? user.phone : maskPhone(user.phone))
                      : "Не указан"}
                  </div>
                  {user.phone && (
                    <button
                      onClick={() => setShowPhone(!showPhone)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title={showPhone ? "Скрыть" : "Показать"}
                    >
                      <Icon name={showPhone ? "EyeOff" : "Eye"} size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Icon name="Send" size={16} className="text-muted-foreground flex-shrink-0" />
              <div>
                <div className="text-sm text-muted-foreground">Telegram</div>
                <div className="font-medium">{user.telegram || "Не указан"}</div>
              </div>
            </div>
            <div className="pt-1 border-t border-border">
              <VkLinkSection
                vkId={user.vk_id}
                onLinked={onVkLinked || (() => {})}
                onUnlinked={onVkUnlinked || (() => {})}
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
                  <Label htmlFor="deletePassword">Введите пароль для подтверждения</Label>
                  <Input
                    id="deletePassword"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Ваш текущий пароль"
                  />
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