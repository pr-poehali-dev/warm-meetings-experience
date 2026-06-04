import GuestConversation, { ConversationMessage } from "@/components/shared/GuestConversation";
import { organizerApi } from "@/lib/organizer-api";

interface Props {
  open: boolean;
  signupId: number | null;
  guestName: string;
  guestChannel?: string | null;
  guestPhone?: string | null;
  guestTelegram?: string | null;
  guestEmail?: string | null;
  onClose: () => void;
}

const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  telegram: "Telegram",
  vk: "ВКонтакте",
  site: "Личный кабинет",
  auto: "Авто",
};

const CHANNEL_ICON: Record<string, string> = {
  email: "Mail",
  telegram: "Send",
  vk: "MessageCircle",
  site: "Globe",
  auto: "Sparkles",
};

export default function GuestChatDialog({
  open,
  signupId,
  guestName,
  guestChannel,
  guestPhone,
  guestTelegram,
  guestEmail,
  onClose,
}: Props) {
  const preferred = (guestChannel || "auto").toLowerCase();
  const channelLabel = CHANNEL_LABEL[preferred] || preferred;
  const channelIcon = CHANNEL_ICON[preferred] || "Send";

  return (
    <GuestConversation
      open={open}
      threadId={signupId}
      guestName={guestName}
      subtitle={`Канал: ${channelLabel}`}
      subtitleIcon={channelIcon}
      showChannel
      contact={{ phone: guestPhone, telegram: guestTelegram, email: guestEmail }}
      placeholder={`Напишите сообщение — гость получит его в ${channelLabel.toLowerCase()} со ссылкой для ответа`}
      emptyHint={`Переписки пока нет. Напишите гостю — он получит сообщение в ${channelLabel.toLowerCase()} со ссылкой для ответа.`}
      loadMessages={async (id) => {
        const r = await organizerApi.getMessages(id);
        return (r.messages || []) as ConversationMessage[];
      }}
      sendMessage={async (id, body) => {
        const r = await organizerApi.sendMessages([id], body);
        const sent = r.sent?.[0];
        if (sent?.delivered) return `Отправлено через ${CHANNEL_LABEL[sent.channel] || sent.channel}`;
        if (sent?.error) throw new Error(sent.error);
        return "Сообщение отправлено";
      }}
      onClose={onClose}
    />
  );
}
