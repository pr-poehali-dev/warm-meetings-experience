import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { userProfileApi, OnboardingCabinet } from "@/lib/user-api";

/**
 * Управление обучающим туром для кабинета.
 * Автозапуск при первом посещении (если в профиле не отмечено прохождение),
 * сохранение статуса в БД и возможность пройти обучение заново.
 */
export function useOnboardingTour(cabinet: OnboardingCabinet, ready: boolean) {
  const { user, refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);

  const done =
    cabinet === "account" ? user?.onboarding_account_done : user?.onboarding_workspace_done;

  // Автозапуск один раз, когда данные готовы и обучение ещё не пройдено
  useEffect(() => {
    if (!ready || !user) return;
    if (done === false) {
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [ready, user, done]);

  const finish = useCallback(async () => {
    setOpen(false);
    try {
      await userProfileApi.completeOnboarding(cabinet);
      await refreshProfile();
    } catch {
      /* ignore */
    }
  }, [cabinet, refreshProfile]);

  // Закрытие крестиком/по фону тоже считаем как «не показывать снова»
  const close = useCallback(() => {
    finish();
  }, [finish]);

  const restart = useCallback(() => {
    setOpen(true);
  }, []);

  return { open, finish, close, restart };
}
