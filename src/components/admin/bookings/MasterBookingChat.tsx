import GuestConversation, { ConversationMessage } from "@/components/shared/GuestConversation";
import { masterChatApi, ChatSource } from "@/lib/master-calendar-api";

interface Props {
  open: boolean;
  masterId: number;
  bookingId: number | null;
  guestName: string;
  source?: ChatSource;
  onClose: () => void;
}

const MasterBookingChat = ({ open, masterId, bookingId, guestName, source = "booking", onClose }: Props) => {
  return (
    <GuestConversation
      open={open}
      threadId={bookingId}
      guestName={guestName}
      subtitle={source === "inquiry" ? "Чат по вопросу" : "Чат по записи"}
      subtitleIcon="MessageCircle"
      placeholder="Напишите сообщение гостю…"
      emptyHint="Переписки пока нет. Напишите гостю — он увидит сообщение по ссылке на чат."
      loadMessages={async (id) => {
        const r = await masterChatApi.getMessages(id, source);
        return (r.messages || []) as ConversationMessage[];
      }}
      sendMessage={async (id, body) => {
        await masterChatApi.send(masterId, id, body, source);
      }}
      onClose={onClose}
    />
  );
};

export default MasterBookingChat;
