import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import Footer from "@/components/Footer";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <Icon name="ArrowLeft" size={16} />
          <span>Вернуться на главную</span>
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-1">
          Политика конфиденциальности
        </h1>
        <p className="text-sm text-muted-foreground mb-1">
          Банного клуба «СПАРКОМ» (sparcom.ru | спарком.рф)
        </p>
        <p className="text-sm text-muted-foreground mb-10">
          Дата последнего обновления: 18 марта 2026 года
        </p>

        <div className="space-y-8 text-foreground/90 leading-relaxed">
          <p>
            Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки
            персональных данных пользователей сайта{" "}
            <a href="https://sparcom.ru" className="text-primary underline underline-offset-2 hover:text-primary/80">
              sparcom.ru
            </a>{" "}
            (далее — «Сайт»), а также лиц, взаимодействующих с проектом «СПАРКОМ» через каналы,
            чаты, мессенджеры и при организации совместных мероприятий (далее — «Клуб»). Мы уважаем
            ваше право на конфиденциальность и стремимся к максимальной прозрачности и безопасности
            при работе с вашими данными.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Общие положения</h2>
            <div className="space-y-3">
              <p>
                <strong>1.1.</strong> Использование Сервисов Клуба означает ваше безоговорочное
                согласие с настоящей Политикой и указанными в ней условиями обработки вашей
                информации. Если вы не согласны с этими условиями, вам следует воздержаться от
                использования Сервисов.
              </p>
              <p>
                <strong>1.2.</strong> Настоящая Политика разработана в соответствии с Конституцией
                Российской Федерации, Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных
                данных» и иными нормативными правовыми актами в области защиты персональных данных.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              2. Оператор (контактная информация)
            </h2>
            <p className="mb-3">
              Оператором, организующим и осуществляющим обработку персональных данных, является:
            </p>
            <div className="bg-muted rounded-lg p-4 space-y-1 text-sm">
              <p className="font-semibold">Индивидуальный предприниматель Чикин Дмитрий Сергеевич</p>
              <p>Юридический адрес: г. Москва, ул. Фортунатовская, д. 31/35, кв. 98</p>
              <p>ИНН: 771916365140</p>
              <p>ОГРНИП: 321774600501510</p>
            </div>
            <p className="mt-3 text-sm font-medium">Контактная информация для вопросов о конфиденциальности:</p>
            <div className="mt-2 space-y-1 text-sm">
              <p>
                Электронная почта:{" "}
                <a href="mailto:privacy@sparcom.ru" className="text-primary underline underline-offset-2">
                  privacy@sparcom.ru
                </a>
              </p>
              <p>
                Телефон:{" "}
                <a href="tel:+79265370200" className="text-primary underline underline-offset-2">
                  +7 (926) 537-02-00
                </a>
              </p>
              <p>
                Telegram:{" "}
                <a
                  href="https://t.me/DmitryChikin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  @DmitryChikin
                </a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              3. Какую информацию мы собираем
            </h2>
            <p className="mb-3">
              Мы собираем только ту информацию, которая необходима для организации вашего участия в
              мероприятиях Клуба и поддержания связи. Это минимально необходимый объём данных.
            </p>
            <div className="space-y-4">
              <div>
                <p className="font-medium mb-2">3.1. Информация, которую вы предоставляете нам добровольно:</p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-sm">
                  <li>
                    <strong>Идентификаторы:</strong> имя (может быть псевдоним или никнейм),
                    контактный номер телефона, адрес электронной почты, ваш логин в Telegram
                  </li>
                  <li>
                    <strong>Информация о транзакциях:</strong> данные о вашем участии в мероприятиях
                    (даты, выбранные бани, сумма взноса), история ваших записей на события
                  </li>
                  <li>
                    <strong>Платёжная информация:</strong> оплата производится через защищённые
                    платёжные шлюзы (ЮKassa, Тинькофф и др.). Мы не храним данные ваших банковских
                    карт
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">3.2. Информация, которую мы собираем автоматически:</p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-sm">
                  <li>
                    <strong>Техническая информация:</strong> IP-адрес, тип устройства, тип браузера,
                    данные об операционной системе, сведения о посещении Сайта
                  </li>
                  <li>
                    Информация из публичных источников (отзывы, комментарии, фото с тегами) при
                    наличии вашего согласия
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">3.3. Информация из Telegram-каналов и чатов:</p>
                <p className="text-sm">
                  Участие в закрытом Telegram-чате Клуба подразумевает обработку вашего никнейма,
                  аватарки и текстовых сообщений в рамках чата. Мы не передаём данные из чата
                  третьим лицам.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              4. Цели сбора и обработки персональных данных
            </h2>
            <p className="mb-3">
              Мы обрабатываем ваши данные исключительно в следующих целях:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left p-3 border border-border font-medium w-8">№</th>
                    <th className="text-left p-3 border border-border font-medium">Цель</th>
                    <th className="text-left p-3 border border-border font-medium">Правовое основание</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3 border border-border align-top">4.1</td>
                    <td className="p-3 border border-border align-top">
                      Организация и проведение мероприятий. Связь с вами для подтверждения записи,
                      информирования о дате, времени, месте, изменениях в расписании.
                    </td>
                    <td className="p-3 border border-border align-top">
                      Исполнение договора и ваше согласие
                    </td>
                  </tr>
                  <tr className="bg-muted/30">
                    <td className="p-3 border border-border align-top">4.2</td>
                    <td className="p-3 border border-border align-top">
                      Информирование о событиях. Отправка анонсов предстоящих встреч и специальных
                      предложений (при наличии вашего согласия на рассылку).
                    </td>
                    <td className="p-3 border border-border align-top">Ваше согласие</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-border align-top">4.3</td>
                    <td className="p-3 border border-border align-top">
                      Взаимодействие с партнёрами. В редких случаях, с вашего отдельного согласия,
                      передача имени и контакта пармастеру или представителю бани.
                    </td>
                    <td className="p-3 border border-border align-top">Ваше согласие</td>
                  </tr>
                  <tr className="bg-muted/30">
                    <td className="p-3 border border-border align-top">4.4</td>
                    <td className="p-3 border border-border align-top">
                      Улучшение сервиса. Анализ посещаемости сайта, популярности мероприятий и
                      предпочтений аудитории для развития Клуба.
                    </td>
                    <td className="p-3 border border-border align-top">
                      Законный интерес Оператора
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              5. Как мы защищаем ваши данные
            </h2>
            <div className="space-y-3">
              <p>
                <strong>5.1.</strong> Безопасность ваших персональных данных для нас приоритетна. Мы
                принимаем все необходимые организационные и технические меры для защиты от
                неправомерного или случайного доступа, уничтожения, изменения, блокирования,
                копирования, распространения, а также от иных неправомерных действий третьих лиц.
              </p>
              <div>
                <p className="mb-2">
                  <strong>5.2.</strong> Меры защиты включают:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-sm">
                  <li>Использование защищённого протокола HTTPS на Сайте</li>
                  <li>Хранение данных на серверах, расположенных на территории РФ</li>
                  <li>
                    Ограниченный доступ сотрудников и партнёров к персональным данным (только для
                    выполнения конкретных задач)
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              6. Передача данных третьим лицам
            </h2>
            <div className="space-y-3">
              <p>
                <strong>6.1.</strong> Мы не продаём ваши персональные данные и не передаём их
                третьим лицам для их собственных маркетинговых целей.
              </p>
              <div>
                <p className="mb-2">
                  <strong>6.2.</strong> Мы можем передавать ваши данные в следующих случаях:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-sm">
                  <li>
                    Платёжным системам (ЮKassa, Тинькофф и др.) для осуществления переводов и
                    подтверждения платежей
                  </li>
                  <li>
                    Партнёрам (баням и пармастерам) исключительно для выполнения вашего заказа и
                    только с вашего предварительного согласия
                  </li>
                  <li>
                    По законному требованию государственных органов в случаях, установленных
                    законодательством РФ
                  </li>
                  <li>
                    Нашим техническим подрядчикам (хостинг-провайдерам, разработчикам), которые
                    обеспечивают работу Сайта и обязуются сохранять конфиденциальность данных
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Хранение данных</h2>
            <div className="space-y-3">
              <p>
                <strong>7.1.</strong> Мы храним ваши персональные данные не дольше, чем это
                необходимо для целей их обработки, или в течение срока, установленного
                законодательством РФ.
              </p>
              <p>
                <strong>7.2.</strong> Данные о транзакциях и участии в мероприятиях могут храниться
                дольше для целей бухгалтерского учёта и налоговой отчётности (до 5 лет).
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Ваши права</h2>
            <p className="mb-3">
              В соответствии с законодательством РФ вы имеете право:
            </p>
            <div className="space-y-2">
              <p>
                <strong>8.1. На доступ к данным:</strong> Получить информацию о том, какие ваши
                данные мы обрабатываем.
              </p>
              <p>
                <strong>8.2. На исправление данных:</strong> Требовать уточнения, исправления или
                дополнения ваших данных, если они неполные или неточные.
              </p>
              <p>
                <strong>8.3. На удаление данных («право на забвение»):</strong> Требовать удаления
                ваших персональных данных при отсутствии законных оснований для их дальнейшей
                обработки.
              </p>
              <p>
                <strong>8.4. На отзыв согласия:</strong> В любой момент отозвать согласие на
                обработку персональных данных, направив уведомление на наш электронный адрес.
              </p>
              <p>
                <strong>8.5. На обжалование действий Оператора:</strong> Подать жалобу в
                уполномоченный орган по защите прав субъектов персональных данных (Роскомнадзор).
              </p>
            </div>
            <p className="mt-3 text-sm">
              Для реализации любого из этих прав свяжитесь с нами по адресу{" "}
              <a href="mailto:privacy@sparcom.ru" className="text-primary underline underline-offset-2">
                privacy@sparcom.ru
              </a>{" "}
              или через контакты, указанные в разделе 2 настоящей Политики.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              9. Файлы cookie и схожие технологии
            </h2>
            <div className="space-y-3">
              <p>
                <strong>9.1.</strong> Наш Сайт использует файлы cookie и аналогичные технологии для
                сбора технической информации и улучшения работы сайта.
              </p>
              <p>
                <strong>9.2.</strong> Cookie — это небольшие текстовые файлы, сохраняемые на вашем
                устройстве. Они позволяют нам понимать, как вы взаимодействуете с Сайтом, запоминать
                ваши настройки и анализировать посещаемость.
              </p>
              <p>
                <strong>9.3.</strong> Вы можете в любой момент отключить файлы cookie в настройках
                вашего браузера. Однако это может привести к некорректной работе некоторых функций
                Сайта.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              10. Изменения в Политике
            </h2>
            <div className="space-y-3">
              <p>
                <strong>10.1.</strong> Мы оставляем за собой право вносить изменения в настоящую
                Политику. Новая редакция Политики вступает в силу с момента её размещения на Сайте,
                если иное не предусмотрено новой редакцией.
              </p>
              <p>
                <strong>10.2.</strong> Рекомендуем вам периодически просматривать страницу с
                Политикой конфиденциальности для ознакомления с актуальной версией.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              11. Реквизиты и контакты для связи
            </h2>
            <div className="bg-muted rounded-lg p-4 text-sm space-y-1">
              <p className="font-semibold">Индивидуальный предприниматель Чикин Дмитрий Сергеевич</p>
              <p>ИНН: 771916365140</p>
              <p>ОГРНИП: 321774600501510</p>
              <p>Адрес для корреспонденции: 105187, г. Москва, ул. Фортунатовская, д. 31/35, кв. 98</p>
              <p>
                Email:{" "}
                <a href="mailto:privacy@sparcom.ru" className="text-primary underline underline-offset-2">
                  privacy@sparcom.ru
                </a>
              </p>
              <p>
                Telegram:{" "}
                <a
                  href="https://t.me/DmitryChikin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  @DmitryChikin
                </a>
              </p>
              <p>
                Телефон:{" "}
                <a href="tel:+79265370200" className="text-primary underline underline-offset-2">
                  +7 (926) 537-02-00
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
