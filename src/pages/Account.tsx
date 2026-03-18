import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { UserSignup, userProfileApi } from "@/lib/user-api";
import { toast } from "sonner";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    new: { label: "Новая", className: "bg-blue-50 text-blue-700" },
    confirmed: { label: "Подтверждена", className: "bg-green-50 text-green-700" },
    cancelled: { label: "Отменена", className: "bg-red-50 text-red-700" },
  };
  const badge = map[status] || { label: status, className: "bg-gray-50 text-gray-700" };
  return (
    <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${badge.className}`}>
      {badge.label}
    </span>
  );
}

export default function Account() {
  const { user, loading: authLoading, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editTelegram, setEditTelegram] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [signups, setSignups] = useState<UserSignup[]>([]);
  const [signupsLoading, setSignupsLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      setEditName(user.name || "");
      setEditPhone(user.phone || "");
      setEditTelegram(user.telegram || "");
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      userProfileApi
        .getSignups()
        .then((data) => setSignups(data.signups))
        .catch(() => toast.error("Не удалось загрузить записи"))
        .finally(() => setSignupsLoading(false));
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const data = await userProfileApi.updateProfile({
        name: editName,
        phone: editPhone,
        telegram: editTelegram,
      });
      updateUser(data.user);
      setEditing(false);
      toast.success("Профиль обновлён");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      setEditName(user.name || "");
      setEditPhone(user.phone || "");
      setEditTelegram(user.telegram || "");
    }
    setEditing(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast.error("Пароли не совпадают");
      return;
    }
    setChangingPassword(true);
    try {
      await userProfileApi.changePassword(currentPassword, newPassword);
      toast.success("Пароль успешно изменён");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка смены пароля");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon name="ArrowLeft" size={20} />
              <span className="text-sm font-medium">Главная</span>
            </Link>
            <h1 className="text-lg font-semibold">Личный кабинет</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <Icon name="LogOut" size={16} className="mr-2" />
            Выйти
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 max-w-2xl">
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
                  <div>
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div className="font-medium">{user.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Icon name="Phone" size={16} className="text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-sm text-muted-foreground">Телефон</div>
                    <div className="font-medium">{user.phone || "Не указан"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Icon name="Send" size={16} className="text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-sm text-muted-foreground">Telegram</div>
                    <div className="font-medium">{user.telegram || "Не указан"}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Мои записи</CardTitle>
          </CardHeader>
          <CardContent>
            {signupsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
              </div>
            ) : signups.length === 0 ? (
              <div className="text-center py-8">
                <Icon name="Calendar" size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">У вас пока нет записей на события</p>
                <Link to="/events">
                  <Button variant="outline" size="sm" className="mt-4">
                    Посмотреть события
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {signups.map((signup) => (
                  <Link
                    key={signup.id}
                    to={`/events/${signup.event_slug}`}
                    className="block"
                  >
                    <div className="flex gap-4 p-4 rounded-lg border hover:bg-accent/5 transition-colors">
                      {signup.image_url && (
                        <img
                          src={signup.image_url}
                          alt={signup.event_title}
                          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium truncate">{signup.event_title}</h3>
                          <StatusBadge status={signup.status} />
                        </div>
                        <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Icon name="Calendar" size={14} />
                            <span>{signup.event_date}, {signup.start_time} — {signup.end_time}</span>
                          </div>
                          {signup.bath_name && (
                            <div className="flex items-center gap-1.5">
                              <Icon name="MapPin" size={14} />
                              <span className="truncate">{signup.bath_name}{signup.bath_address ? `, ${signup.bath_address}` : ""}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Смена пароля</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
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
              <div className="space-y-2">
                <Label htmlFor="newPassword">Новый пароль</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Введите новый пароль"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">Подтверждение нового пароля</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  placeholder="Повторите новый пароль"
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
                ) : (
                  "Изменить пароль"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
