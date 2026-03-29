import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ConsentModalProps {
  trigger: React.ReactNode;
}

export default function ConsentModal({ trigger }: ConsentModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        className="text-primary hover:text-primary/80 underline underline-offset-2 cursor-pointer"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {trigger}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="text-lg">
              Согласие на обработку персональных данных
            </DialogTitle>
            <DialogDescription>
              Приложение №1 к Пользовательскому соглашению
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="px-6 pb-6 max-h-[65vh]">
            <div className="space-y-6 text-sm pr-4">
              <p className="leading-relaxed">
                Я, нижеподписавшийся(ая), свободно, своей волей и в своём
                интересе даю согласие{" "}
                <strong>ИП Чикин Дмитрий Сергеевич</strong> (ОГРНИП
                321774600501510, ИНН 771916365140) (далее — Оператор) на
                обработку моих персональных данных на следующих условиях:
              </p>
              <div>
                <h3 className="text-base font-semibold text-foreground mb-3">
                  1. Перечень персональных данных
                </h3>
                <p className="leading-relaxed">
                  Фамилия, имя, отчество (при наличии), номер телефона, адрес
                  электронной почты, дата рождения (при необходимости), ссылка на
                  аккаунт в Telegram / VK ID / Яндекс ID / MAX (при их
                  использовании).
                </p>
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground mb-3">
                  2. Цели обработки
                </h3>
                <ul className="list-disc list-outside ml-5 space-y-1 leading-relaxed">
                  <li>регистрация и авторизация на Сайте sparcom.ru;</li>
                  <li>запись на мероприятия и оплата;</li>
                  <li>
                    связь с Организаторами и Мастерами по вопросам мероприятия;
                  </li>
                  <li>
                    направление уведомлений (напоминания, изменения, отмена);
                  </li>
                  <li>сбор обратной связи (отзывы);</li>
                  <li>соблюдение требований законодательства РФ.</li>
                </ul>
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground mb-3">
                  3. Передача третьим лицам
                </h3>
                <p className="leading-relaxed">
                  Я согласен(на) на передачу моих персональных данных (в объёме,
                  указанном в п. 1) Организаторам мероприятий, Мастерам,
                  Партнёрам (владельцам бань) на основании договора поручения
                  обработки. Получатели данных обязаны использовать их только для
                  целей, определённых Оператором, и обеспечивать
                  конфиденциальность.
                </p>
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground mb-3">
                  4. Срок согласия
                </h3>
                <p className="leading-relaxed">
                  С момента регистрации до отзыва. Отзыв согласия направляется на{" "}
                  <a
                    href="mailto:privacy@sparcom.ru"
                    className="text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    privacy@sparcom.ru
                  </a>
                  . При отзыве Оператор вправе продолжить обработку при наличии
                  иных законных оснований.
                </p>
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground mb-3">
                  5. Подтверждение
                </h3>
                <p className="leading-relaxed">
                  Я ознакомлен(а) с{" "}
                  <Link
                    to="/privacy"
                    className="text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    Политикой конфиденциальности
                  </Link>{" "}
                  (
                  <a
                    href="https://sparcom.ru/privacy"
                    className="text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    sparcom.ru/privacy
                  </a>
                  ) и настоящим Согласием.
                </p>
              </div>
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <p>
                  <strong>Дата:</strong> проставляется автоматически при
                  регистрации
                </p>
                <p>
                  <strong>Подпись (цифровая / галочка):</strong> подтверждается
                  отметкой в чекбоксе при регистрации на Сайте
                </p>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
