import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserSignup, userProfileApi } from "@/lib/user-api";
import { toast } from "sonner";

const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 60 минут бездействия

export function useAccount() {
  const { user, loading: authLoading, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editTelegram, setEditTelegram] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [signups, setSignups] = useState<UserSignup[]>([]);
  const [signupsLoading, setSignupsLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Автовыход при бездействии
  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(async () => {
      toast.info("Сессия завершена из-за бездействия");
      await logout();
      navigate("/login");
    }, IDLE_TIMEOUT_MS);
  }, [logout, navigate]);

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetIdleTimer));
    resetIdleTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdleTimer]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      setEditName(user.name || "");
      setEditEmail(user.email?.includes("@vk.local") ? "" : (user.email || ""));
      setEditPhone(user.phone || "");
      setEditTelegram(user.telegram || "");
    }
  }, [user?.id]);

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
      const isVkEmail = user?.email?.includes("@vk.local");
      const data = await userProfileApi.updateProfile({
        name: editName,
        phone: editPhone,
        telegram: editTelegram,
        ...(isVkEmail && editEmail ? { email: editEmail } : {}),
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
      setEditEmail(user.email?.includes("@vk.local") ? "" : (user.email || ""));
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
      const hasPassword = user?.has_password !== false;
      toast.success(hasPassword ? "Пароль успешно изменён" : "Пароль установлен");
      if (user && !hasPassword) {
        updateUser({ ...user, has_password: true });
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка смены пароля");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasPassword = user?.has_password !== false;
    if (hasPassword && !deletePassword) {
      toast.error("Введите пароль для подтверждения");
      return;
    }
    if (!hasPassword && deletePassword !== "УДАЛИТЬ") {
      toast.error('Введите слово УДАЛИТЬ для подтверждения');
      return;
    }
    setDeletingAccount(true);
    try {
      const data = hasPassword
        ? { password: deletePassword }
        : { confirm_text: deletePassword };
      await userProfileApi.deleteAccount(data);
      toast.success("Аккаунт удалён. Ваши данные обезличены.");
      await logout();
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка удаления аккаунта");
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return {
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
  };
}