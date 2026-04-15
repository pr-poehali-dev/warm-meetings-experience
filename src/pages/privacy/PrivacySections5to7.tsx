export function PrivacySections5to7() {
  return (
    <>
      <section id="ps5" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-5 pb-2 border-b border-border">
          5. Цели сбора и обработки персональных данных
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="text-left p-3 border-b border-border font-medium">
                  Цель обработки
                </th>
                <th className="text-left p-3 border-b border-border font-medium">
                  Персональные данные
                </th>
                <th className="text-left p-3 border-b border-border font-medium">
                  Правовое основание
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="p-3 align-top">
                  Регистрация и авторизация Пользователя на Сайте
                </td>
                <td className="p-3 align-top text-muted-foreground">
                  Фамилия, имя, номер телефона, адрес электронной почты,
                  идентификаторы в VK ID, Яндекс ID, Telegram
                </td>
                <td className="p-3 align-top">
                  Согласие субъекта, исполнение договора
                </td>
              </tr>
              <tr className="bg-muted/20">
                <td className="p-3 align-top">
                  Организация и проведение мероприятий
                </td>
                <td className="p-3 align-top text-muted-foreground">
                  Фамилия, имя, номер телефона, адрес электронной почты
                </td>
                <td className="p-3 align-top">
                  Согласие субъекта, исполнение договора
                </td>
              </tr>
              <tr>
                <td className="p-3 align-top">
                  Передача данных третьим лицам для связи по вопросам
                  мероприятия
                </td>
                <td className="p-3 align-top text-muted-foreground">
                  Фамилия, имя, номер телефона (при необходимости)
                </td>
                <td className="p-3 align-top">
                  Согласие субъекта, договор поручения
                </td>
              </tr>
              <tr className="bg-muted/20">
                <td className="p-3 align-top">
                  Направление уведомлений (Telegram, SMS, VK, email)
                </td>
                <td className="p-3 align-top text-muted-foreground">
                  Контактные данные (номер телефона, email, идентификаторы
                  мессенджеров)
                </td>
                <td className="p-3 align-top">
                  Согласие субъекта, исполнение договора
                </td>
              </tr>
              <tr>
                <td className="p-3 align-top">
                  Подтверждение действий с использованием ПЭП
                </td>
                <td className="p-3 align-top text-muted-foreground">
                  Номер телефона, идентификаторы VK ID, Яндекс ID, Telegram,
                  IP-адрес, дата и время
                </td>
                <td className="p-3 align-top">
                  Согласие субъекта (Соглашение об использовании ПЭП)
                </td>
              </tr>
              <tr className="bg-muted/20">
                <td className="p-3 align-top">
                  Обеспечение безопасности, предотвращение мошенничества
                </td>
                <td className="p-3 align-top text-muted-foreground">
                  IP-адреса, данные сессий, логи действий
                </td>
                <td className="p-3 align-top">Законные интересы Оператора</td>
              </tr>
              <tr>
                <td className="p-3 align-top">
                  Улучшение качества услуг, аналитика
                </td>
                <td className="p-3 align-top text-muted-foreground">
                  Обезличенные данные (статистика посещений)
                </td>
                <td className="p-3 align-top">
                  Согласие субъекта (при сборе cookies)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="ps6" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-5 pb-2 border-b border-border">
          6. Передача персональных данных третьим лицам
        </h2>
        <div className="space-y-3 text-sm">
          <p>
            <strong>6.1.</strong> Оператор вправе передавать персональные данные
            Пользователей третьим лицам в следующих случаях:
          </p>
          <ul className="list-disc list-outside ml-5 space-y-1.5">
            <li>
              <strong>Организаторам мероприятий</strong> — для связи с
              Пользователем по вопросам записи, подтверждения участия, уточнения
              деталей мероприятия, направления напоминаний.
            </li>
            <li>
              <strong>Мастерам</strong> — для координации времени и условий
              проведения сеанса.
            </li>
            <li>
              <strong>Партнёрам (владельцам бань)</strong> — для обеспечения
              допуска на мероприятие.
            </li>
            <li>
              <strong>
                Сервисам аутентификации (VK ID, Яндекс ID, Telegram)
              </strong>{" "}
              — в целях подтверждения личности Пользователя при использовании
              ПЭП.
            </li>
            <li>
              <strong>Платёжным системам</strong> — для проведения оплаты за
              участие в мероприятиях.
            </li>
          </ul>
          <p>
            <strong>6.2.</strong> Передача персональных данных третьим лицам
            осуществляется на основании отдельного согласия Пользователя и с
            обязательным заключением с получателями данных договора поручения
            обработки персональных данных.
          </p>
          <p>
            <strong>6.3.</strong> Оператор не передает персональные данные
            третьим лицам в иных целях, не указанных в настоящей Политике, за
            исключением случаев, предусмотренных действующим законодательством
            РФ.
          </p>
        </div>
      </section>

      <section id="ps7" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-5 pb-2 border-b border-border">
          7. Обработка персональных данных с использованием простой электронной
          подписи (ПЭП)
        </h2>
        <div className="space-y-3 text-sm">
          <p>
            <strong>7.1.</strong> При совершении юридически значимых действий
            (подписание договоров, согласий, актов) Оператор может использовать
            простую электронную подпись.
          </p>
          <p>
            <strong>7.2.</strong> Подтверждение волеизъявления Пользователя
            осуществляется одним из следующих способов:
          </p>
          <ul className="list-disc list-outside ml-5 space-y-1.5">
            <li>
              ввод одноразового кода, отправленного по SMS на номер телефона;
            </li>
            <li>ввод одноразового кода, отправленного в Telegram-бота;</li>
            <li>подтверждение действия через сервис VK ID или Яндекс ID;</li>
            <li>
              иные способы, предусмотренные Соглашением об использовании ПЭП.
            </li>
          </ul>
          <p>
            <strong>7.3.</strong> Факт подписания документа с использованием ПЭП
            фиксируется в протоколе подписания, который хранится у Оператора и
            может быть представлен для подтверждения юридической силы документа.
          </p>
        </div>
      </section>
    </>
  );
}
