import { useSearchParams, Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useAccount } from "@/hooks/useAccount";
import { useAuth } from "@/contexts/AuthContext";
import AccountHeader from "@/components/account/AccountHeader";
import ProfileCard from "@/components/account/ProfileCard";
import GrowthSection from "@/components/account/GrowthSection";
import BadgesSection from "@/components/account/BadgesSection";
import SignupsList from "@/components/account/SignupsList";
import PasswordChangeForm from "@/components/account/PasswordChangeForm";
import TwoFactorSection from "@/components/account/TwoFactorSection";
import LoginSecuritySection from "@/components/account/LoginSecuritySection";
import MyDataExport from "@/components/account/MyDataExport";
import MyArticles from "@/components/account/MyArticles";
import MyCalendar from "@/components/account/MyCalendar";
import NotificationsSection from "@/components/account/NotificationsSection";
import FavoritesSection from "@/components/account/FavoritesSection";
import WalletSection from "@/components/account/WalletSection";
import ReferralsSection from "@/components/account/ReferralsSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Tab = "main" | "articles" | "calendar" | "my-data" | "favorites" | "wallet" | "referrals";

export default function Account() {
  const [searchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) || "main";
  const { user: authUser, updateUser } = useAuth();

  const {
    user,
    authLoading,
    editing,
    setEditing,
    editName,
    setEditName,
    editEmail,
    setEditEmail,
    editPhone,
    setEditPhone,
    editTelegram,
    setEditTelegram,
    savingProfile,
    signups,
    signupsLoading,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    changingPassword,
    handleSaveProfile,
    handleCancelEdit,
    handleChangePassword,
    handleLogout,
    deletePassword,
    setDeletePassword,
    deletingAccount,
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleDeleteAccount,
  } = useAccount();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  const upcomingSignups = signups.filter((s) => s.status !== "attended" && s.status !== "cancelled");
  const pastSignups = signups.filter((s) => s.status === "attended");

  const securityOk = user.has_password !== false && (user.totp_enabled === true);

  return (
    <div className="min-h-screen bg-background">
      <AccountHeader handleLogout={handleLogout} />

      {tab === "main" && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-10 max-w-2xl space-y-4 pt-6">

          {user.email?.includes("@vk.local") && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Icon name="AlertTriangle" size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Укажите настоящий email</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Вы вошли через ВКонтакте. Укажите email и пароль, чтобы получать уведомления и восстановить доступ при необходимости.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 1. Профиль — визитка с инлайн-редактированием */}
          <ProfileCard
            user={user}
            editing={editing}
            editName={editName}
            editEmail={editEmail}
            editPhone={editPhone}
            editTelegram={editTelegram}
            savingProfile={savingProfile}
            setEditing={setEditing}
            setEditName={setEditName}
            setEditEmail={setEditEmail}
            setEditPhone={setEditPhone}
            setEditTelegram={setEditTelegram}
            handleSaveProfile={handleSaveProfile}
            handleCancelEdit={handleCancelEdit}
            deletePassword={deletePassword}
            setDeletePassword={setDeletePassword}
            deletingAccount={deletingAccount}
            showDeleteConfirm={showDeleteConfirm}
            setShowDeleteConfirm={setShowDeleteConfirm}
            handleDeleteAccount={handleDeleteAccount}
            onVkLinked={(vkId) => authUser && updateUser({ ...authUser, vk_id: vkId })}
            onVkUnlinked={() => authUser && updateUser({ ...authUser, vk_id: null })}
            onYandexLinked={(yandexId) => authUser && updateUser({ ...authUser, yandex_id: yandexId })}
            onYandexUnlinked={() => authUser && updateUser({ ...authUser, yandex_id: null })}
          />

          {/* 2. Ближайшие события — на видном месте */}
          <SignupsList
            signups={upcomingSignups}
            signupsLoading={signupsLoading}
            title="Ближайшие встречи"
            emptyIcon="CalendarCheck"
            emptyText="Пока нет запланированных встреч — будем рады видеть вас"
            showEventsLink
          />

          {/* 3. Уведомления */}
          <NotificationsSection />

          {/* 4. Быстрые действия */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex flex-col gap-2 h-full">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${securityOk ? "bg-green-50 dark:bg-green-950/40" : "bg-amber-50 dark:bg-amber-950/30"}`}>
                    <Icon name="Shield" size={15} className={securityOk ? "text-green-600" : "text-amber-600"} />
                  </div>
                  <span className="text-sm font-medium">Безопасность</span>
                </div>
                <p className={`text-xs ${securityOk ? "text-green-600 dark:text-green-400 flex items-center gap-1" : "text-muted-foreground"}`}>
                  {securityOk
                    ? <><Icon name="CheckCircle" size={11} />Всё настроено</>
                    : "Настройте защиту"}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-auto w-full"
                  onClick={() => {
                    document.getElementById("security-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Настроить
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex flex-col gap-2 h-full">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                    <Icon name="Wallet" size={15} className="text-violet-600" />
                  </div>
                  <span className="text-sm font-medium">Кошелёк</span>
                </div>
                <p className="text-xs text-muted-foreground">Баланс и бонусы</p>
                <Link to="/account?tab=wallet" className="mt-auto">
                  <Button size="sm" variant="outline" className="w-full">Открыть</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex flex-col gap-2 h-full">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                    <Icon name="Heart" size={15} className="text-rose-500" />
                  </div>
                  <span className="text-sm font-medium">Избранное</span>
                </div>
                <p className="text-xs text-muted-foreground">Бани и мастера</p>
                <Link to="/account?tab=favorites" className="mt-auto">
                  <Button size="sm" variant="outline" className="w-full">Смотреть</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex flex-col gap-2 h-full">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Icon name="Users" size={15} className="text-blue-600" />
                  </div>
                  <span className="text-sm font-medium">Приглашения</span>
                </div>
                <p className="text-xs text-muted-foreground">Реферальная ссылка</p>
                <Link to="/account?tab=referrals" className="mt-auto">
                  <Button size="sm" variant="outline" className="w-full">Пригласить</Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* 5. Роли и достижения */}
          <GrowthSection />
          <BadgesSection />

          {/* 6. Прошедшие события */}
          {pastSignups.length > 0 && (
            <SignupsList
              signups={pastSignups}
              signupsLoading={false}
              title="Были вместе"
              emptyIcon="Calendar"
              emptyText=""
            />
          )}

          {/* 7. Безопасность — детали (якорь) */}
          <div id="security-section" className="space-y-4 scroll-mt-20">
            <PasswordChangeForm
              hasPassword={user.has_password !== false}
              currentPassword={currentPassword}
              newPassword={newPassword}
              confirmNewPassword={confirmNewPassword}
              changingPassword={changingPassword}
              setCurrentPassword={setCurrentPassword}
              setNewPassword={setNewPassword}
              setConfirmNewPassword={setConfirmNewPassword}
              handleChangePassword={handleChangePassword}
            />
            <LoginSecuritySection />
            <TwoFactorSection
              totpEnabled={user.totp_enabled === true}
              hasPassword={user.has_password !== false}
              onToggled={(enabled) => authUser && updateUser({ ...authUser, totp_enabled: enabled })}
            />
          </div>

          {/* Дополнительные ссылки */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2">
            <Link to="/account?tab=my-data" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <Icon name="Download" size={11} />
              Скачать мои данные
            </Link>
            <Link to="/account?tab=articles" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <Icon name="FileText" size={11} />
              Мои статьи
            </Link>
          </div>
        </div>
      )}

      {tab === "my-data" && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8 max-w-2xl pt-6">
          <MyDataExport />
        </div>
      )}

      {tab === "articles" && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8 max-w-2xl pt-6">
          <MyArticles />
        </div>
      )}

      {tab === "calendar" && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-6">
          <MyCalendar />
        </div>
      )}

      {tab === "favorites" && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8 max-w-2xl pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Link to="/account" className="text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="ArrowLeft" size={18} />
            </Link>
            <h2 className="text-lg font-semibold text-foreground">Избранное</h2>
          </div>
          <FavoritesSection />
        </div>
      )}

      {tab === "wallet" && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8 max-w-2xl pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Link to="/account" className="text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="ArrowLeft" size={18} />
            </Link>
            <h2 className="text-lg font-semibold text-foreground">Кошелёк и бонусы</h2>
          </div>
          <WalletSection />
        </div>
      )}

      {tab === "referrals" && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8 max-w-2xl pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Link to="/account" className="text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="ArrowLeft" size={18} />
            </Link>
            <h2 className="text-lg font-semibold text-foreground">Приглашения</h2>
          </div>
          <ReferralsSection />
        </div>
      )}
    </div>
  );
}