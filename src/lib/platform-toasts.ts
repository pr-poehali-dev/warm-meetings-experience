import { toast } from "sonner";

export const platformToasts = {
  cancelAfterDeadline: () => {
    toast.warning(
      "Вы не можете отменить мероприятие после крайней даты регистрации без финансовых потерь для участников. Пожалуйста, свяжитесь с поддержкой для поиска решения.",
      {
        duration: 8000,
        action: {
          label: "Поддержка",
          onClick: () => window.open("https://poehali.dev/help", "_blank"),
        },
      }
    );
  },

  complaintReceived: () => {
    toast.error(
      "На вашу учётную запись поступила жалоба. Пожалуйста, свяжитесь с Арбитражем в течение 3 дней, иначе будет принято решение в пользу другой стороны.",
      {
        duration: 10000,
        action: {
          label: "Связаться",
          onClick: () => window.open("https://t.me/sparcom_ru", "_blank"),
        },
      }
    );
  },

  inactiveProfile: (onConfirm: () => void, onPay: () => void) => {
    toast.warning(
      "Ваш профиль не использовался более 120 дней. Для сохранения статуса подтвердите активность или внесите абонентскую плату 20 ₽/сутки.",
      {
        duration: 0,
        action: {
          label: "Подтвердить активность",
          onClick: onConfirm,
        },
        cancel: {
          label: "Оплатить",
          onClick: onPay,
        },
      }
    );
  },
};
