import { useSearchParams } from "react-router-dom";
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

type Tab = "main" | "articles" | "calendar" | "my-data";

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

  return (
    <div className="min-h-screen bg-background">
      <AccountHeader handleLogout={handleLogout} />

      {tab === "main" && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8 max-w-2xl">
          <div className="space-y-6">
            {user.email?.includes("@vk.local") && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Icon name="AlertTriangle" size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Укажите настоящий email</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Вы вошли через ВКонтакте. Чтобы получать уведомления и иметь возможность восстановить доступ — укажите email и установите пароль.
                    </p>
                  </div>
                </div>
              </div>
            )}
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
            <NotificationsSection />
            <GrowthSection />
            <BadgesSection />
            <SignupsList signups={signups} signupsLoading={signupsLoading} />
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
        </div>
      )}

      {tab === "my-data" && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8 max-w-2xl">
          <MyDataExport />
        </div>
      )}

      {tab === "articles" && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8 max-w-2xl">
          <MyArticles />
        </div>
      )}

      {tab === "calendar" && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <MyCalendar />
        </div>
      )}
    </div>
  );
}