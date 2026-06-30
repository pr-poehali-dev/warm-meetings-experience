import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useAccount } from "@/hooks/useAccount";
import { useAuth } from "@/contexts/AuthContext";
import { userProfileApi } from "@/lib/user-api";
import { usePolling } from "@/hooks/usePolling";
import AccountHeader from "@/components/account/AccountHeader";
import ProfileCard from "@/components/account/ProfileCard";
import GrowthSection from "@/components/account/GrowthSection";
import BadgesSection from "@/components/account/BadgesSection";
import SignupsList from "@/components/account/SignupsList";
import MyMasterBookings from "@/components/account/MyMasterBookings";
import PasswordChangeForm from "@/components/account/PasswordChangeForm";
import TwoFactorSection from "@/components/account/TwoFactorSection";
import LoginSecuritySection from "@/components/account/LoginSecuritySection";
import CookiePreferences from "@/components/account/CookiePreferences";
import SupportTickets from "@/components/account/SupportTickets";
import SupportTicketDetail from "@/components/account/SupportTicketDetail";
import MyDataExport from "@/components/account/MyDataExport";
import MyArticles from "@/components/account/MyArticles";
import MyCalendar from "@/components/account/MyCalendar";
import NotificationsSection from "@/components/account/NotificationsSection";
import InboxSection from "@/components/account/InboxSection";
import RefundsSection from "@/components/account/RefundsSection";
import FavoritesSection from "@/components/account/FavoritesSection";
import WalletSection from "@/components/account/WalletSection";
import ReferralsSection from "@/components/account/ReferralsSection";
import { Button } from "@/components/ui/button";
import BathLoader from "@/components/BathLoader";
import { Card, CardContent } from "@/components/ui/card";
import OnboardingTour, { TourStep } from "@/components/onboarding/OnboardingTour";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";

const ACCOUNT_TOUR_STEPS: TourStep[] = [
  { title: "Добро пожаловать в личный кабинет!", description: "Покажем за минуту, что здесь есть. Можно пропустить в любой момент.", icon: "Sparkles" },
  { target: '[data-tour="account-tabs"]', title: "Разделы кабинета", description: "Профиль, ваши события, уведомления и безопасность — переключайтесь между вкладками здесь.", icon: "LayoutGrid" },
  { target: '[data-tour="account-profile"]', title: "Ваш профиль", description: "Здесь можно изменить имя, контакты и привязать соцсети для входа.", icon: "User" },
  { target: '[data-tour="account-links"]', title: "Быстрые разделы", description: "Кошелёк, приглашение друзей, ваши записи и избранное — всё под рукой.", icon: "Wallet" },
];

type Tab = "main" | "articles" | "calendar" | "my-data" | "favorites" | "wallet" | "referrals" | "support" | "roles";
type MainTab = "profile" | "signups" | "notify" | "security";

const MAIN_TABS: { key: MainTab; label: string; icon: string }[] = [
  { key: "profile", label: "Профиль", icon: "User" },
  { key: "signups", label: "Мои события", icon: "Calendar" },
  { key: "notify", label: "Уведомления", icon: "Bell" },
  { key: "security", label: "Безопасность", icon: "Shield" },
];

export default function Account() {
  const [searchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) || "main";
  const initialMain = (searchParams.get("section") as MainTab) || "profile";
  const [mainTab, setMainTab] = useState<MainTab>(initialMain);
  const [unreadInbox, setUnreadInbox] = useState(0);
  const { user: authUser, updateUser } = useAuth();

  usePolling(
    () => {
      userProfileApi.getInboxUnreadCount()
        .then((r) => setUnreadInbox(r.unread || 0))
        .catch(() => {});
    },
    120000,
    true,
    [mainTab],
  );

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

  const tourReady = !authLoading && !!user && tab === "main" && mainTab === "profile";
  const tour = useOnboardingTour("account", tourReady);

  if (authLoading) {
    return <BathLoader label="Загружаем кабинет…" />;
  }

  if (!user) return null;

  const upcomingSignups = signups.filter((s) => s.status !== "attended" && s.status !== "cancelled");
  const pastSignups = signups.filter((s) => s.status === "attended");

  const securityOk = user.has_password !== false && (user.totp_enabled === true);

  return (
    <div className="min-h-screen bg-background">
      <OnboardingTour steps={ACCOUNT_TOUR_STEPS} open={tour.open} onClose={tour.close} onFinish={tour.finish} />
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

          {/* Вкладки в стиле мобильных приложений */}
          <div data-tour="account-tabs" className="flex gap-1 bg-muted rounded-xl p-1 sticky top-2 z-10">
            {MAIN_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setMainTab(t.key)}
                className={`relative flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-lg text-xs font-medium transition-all min-h-[44px] ${
                  mainTab === t.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon name={t.icon} size={15} />
                <span className="hidden sm:block">{t.label}</span>
                {t.key === "notify" && unreadInbox > 0 && (
                  <span className="absolute top-1 right-2 sm:right-3 bg-primary text-primary-foreground text-[10px] min-w-[16px] h-4 px-1 rounded-full font-semibold flex items-center justify-center">
                    {unreadInbox > 9 ? "9+" : unreadInbox}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Профиль */}
          {mainTab === "profile" && (
            <div className="space-y-4">
              <div data-tour="account-profile">
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
              </div>

              <GrowthSection />
              <BadgesSection />

              {/* Быстрые ссылки на остальные разделы */}
              <div data-tour="account-links" className="grid grid-cols-2 gap-3">
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

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 flex flex-col gap-2 h-full">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                        <Icon name="LifeBuoy" size={15} className="text-amber-600" />
                      </div>
                      <span className="text-sm font-medium">Поддержка</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Мои обращения</p>
                    <Link to="/account?tab=support" className="mt-auto">
                      <Button size="sm" variant="outline" className="w-full">Открыть</Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm col-span-2">
                  <CardContent className="p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                        <Icon name="BadgePlus" size={15} className="text-emerald-600" />
                      </div>
                      <span className="text-sm font-medium">Добавить специализацию</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Пармастер, управляющий, организатор и другие роли</p>
                    <Link to="/account?tab=roles" className="mt-auto">
                      <Button size="sm" variant="outline" className="w-full">Добавить</Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                <Link to="/account?tab=my-data" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <Icon name="Download" size={11} />
                  Скачать мои данные
                </Link>
                <Link to="/account?tab=calendar" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <Icon name="Calendar" size={11} />
                  Мой календарь
                </Link>
                <Link to="/account?tab=articles" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <Icon name="FileText" size={11} />
                  Мои статьи
                </Link>
                <button onClick={tour.restart} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <Icon name="GraduationCap" size={11} />
                  Пройти обучение заново
                </button>
              </div>
            </div>
          )}

          {/* Мои события */}
          {mainTab === "signups" && (
            <div className="space-y-4">
              <RefundsSection />
              <MyMasterBookings />
              <SignupsList
                signups={upcomingSignups}
                signupsLoading={signupsLoading}
                title="Ближайшие встречи"
                emptyIcon="CalendarCheck"
                emptyText="Пока нет запланированных встреч — будем рады видеть вас"
                showEventsLink
              />
              {pastSignups.length > 0 && (
                <SignupsList
                  signups={pastSignups}
                  signupsLoading={false}
                  title="Были вместе"
                  emptyIcon="Calendar"
                  emptyText=""
                />
              )}
            </div>
          )}

          {/* Уведомления */}
          {mainTab === "notify" && (
            <div className="space-y-4">
              <InboxSection />
              <NotificationsSection />
            </div>
          )}

          {/* Безопасность */}
          {mainTab === "security" && (
            <div className="space-y-4">
              {!securityOk && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-center gap-2">
                  <Icon name="AlertTriangle" size={16} className="text-amber-500" />
                  <span className="text-sm">Защита настроена не полностью</span>
                </div>
              )}
              {securityOk && (
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-3 flex items-center gap-2">
                  <Icon name="CheckCircle" size={16} className="text-green-600" />
                  <span className="text-sm">Защита аккаунта настроена</span>
                </div>
              )}
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
              <CookiePreferences />
            </div>
          )}
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

      {tab === "support" && <SupportTab />}

      {tab === "roles" && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8 max-w-2xl pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Link to="/account" className="text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="ArrowLeft" size={18} />
            </Link>
            <h2 className="text-lg font-semibold text-foreground">Добавить специализацию</h2>
          </div>
          <GrowthSection rolesOnly />
        </div>
      )}
    </div>
  );
}

function SupportTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const ticketIdParam = searchParams.get("ticket");
  const selectedId = ticketIdParam ? Number(ticketIdParam) : null;

  const setSelected = (id: number | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("ticket", String(id));
    else next.delete("ticket");
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8 max-w-2xl pt-6">
      <div className="flex items-center gap-2 mb-4">
        <Link to="/account" className="text-muted-foreground hover:text-foreground transition-colors">
          <Icon name="ArrowLeft" size={18} />
        </Link>
        <h2 className="text-lg font-semibold text-foreground">Поддержка</h2>
      </div>
      {selectedId ? (
        <SupportTicketDetail
          ticketId={selectedId}
          onBack={() => setSelected(null)}
        />
      ) : (
        <SupportTickets selectedId={null} onSelect={setSelected} />
      )}
    </div>
  );
}