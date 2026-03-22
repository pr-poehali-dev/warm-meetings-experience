import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useAccount } from "@/hooks/useAccount";
import AccountHeader from "@/components/account/AccountHeader";
import ProfileCard from "@/components/account/ProfileCard";
import GrowthSection from "@/components/account/GrowthSection";
import BadgesSection from "@/components/account/BadgesSection";
import SignupsList from "@/components/account/SignupsList";
import PasswordChangeForm from "@/components/account/PasswordChangeForm";
import MyArticles from "@/components/account/MyArticles";

type Tab = "main" | "articles";

export default function Account() {
  const [tab, setTab] = useState<Tab>("main");
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

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-2xl">
        <div className="flex gap-1 bg-muted rounded-full p-1 mb-8 w-fit">
          <button
            onClick={() => setTab("main")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === "main" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Профиль
          </button>
          <button
            onClick={() => setTab("articles")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${tab === "articles" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon name="FileText" size={14} />
            Статьи
          </button>
        </div>

        {tab === "main" ? (
          <div className="space-y-6">
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
        ) : (
          <MyArticles />
        )}
      </div>
    </div>
  );
}