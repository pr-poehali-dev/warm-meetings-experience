import Icon from "@/components/ui/icon";
import { useAccount } from "@/hooks/useAccount";
import AccountHeader from "@/components/account/AccountHeader";
import ProfileCard from "@/components/account/ProfileCard";
import GrowthSection from "@/components/account/GrowthSection";
import BadgesSection from "@/components/account/BadgesSection";
import SignupsList from "@/components/account/SignupsList";
import PasswordChangeForm from "@/components/account/PasswordChangeForm";

export default function Account() {
  const {
    user,
    authLoading,
    editing,
    setEditing,
    editName,
    setEditName,
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

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 max-w-2xl">
        <ProfileCard
          user={user}
          editing={editing}
          editName={editName}
          editPhone={editPhone}
          editTelegram={editTelegram}
          savingProfile={savingProfile}
          setEditing={setEditing}
          setEditName={setEditName}
          setEditPhone={setEditPhone}
          setEditTelegram={setEditTelegram}
          handleSaveProfile={handleSaveProfile}
          handleCancelEdit={handleCancelEdit}
        />

        <GrowthSection />

        <BadgesSection />

        <SignupsList signups={signups} signupsLoading={signupsLoading} />

        <PasswordChangeForm
          currentPassword={currentPassword}
          newPassword={newPassword}
          confirmNewPassword={confirmNewPassword}
          changingPassword={changingPassword}
          setCurrentPassword={setCurrentPassword}
          setNewPassword={setNewPassword}
          setConfirmNewPassword={setConfirmNewPassword}
          handleChangePassword={handleChangePassword}
        />
      </div>
    </div>
  );
}
