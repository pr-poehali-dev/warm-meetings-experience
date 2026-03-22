import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { User } from "@/lib/user-api";

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
}: ProfileCardProps) {
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
  );
}
