import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useAccount } from "@/hooks/useAccount";
import { rolesApi } from "@/lib/roles-api";
import AccountHeader from "@/components/account/AccountHeader";
import ProfileCard from "@/components/account/ProfileCard";
import GrowthSection from "@/components/account/GrowthSection";
import BadgesSection from "@/components/account/BadgesSection";
import SignupsList from "@/components/account/SignupsList";
import PasswordChangeForm from "@/components/account/PasswordChangeForm";
import MyArticles from "@/components/account/MyArticles";
import MyCalendar from "@/components/account/MyCalendar";

type Tab = "main" | "articles" | "calendar";

export default function Account() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("main");
  const [isParmaster, setIsParmaster] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);

  useEffect(() => {
    rolesApi.getMyRoles().then(({ roles }) => {
      setIsParmaster(roles.some((r) => r.slug === "parmaster" && r.status === "active"));
      setIsOrganizer(roles.some((r) => ["organizer", "admin"].includes(r.slug) && r.status === "active"));
    }).catch(() => {});
  }, []);

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

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8">
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
          {isParmaster && (
            <button
              onClick={() => setTab("calendar")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${tab === "calendar" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon name="Calendar" size={14} />
              Календарь
            </button>
          )}
          {isOrganizer && (
            <button
              onClick={() => navigate("/organizer-cabinet")}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Icon name="LayoutDashboard" size={14} />
              Кабинет организатора
            </button>
          )}
        </div>
      </div>

      {tab === "main" && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8 max-w-2xl">
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