import { Link } from "react-router-dom";

export interface PrivacyAppendix {
  id: number;
  title: string;
  content: React.ReactNode;
}

export const privacyAppendices: PrivacyAppendix[] = [
  {
    id: 1,
    title: "Приложение №1. Согласие на обработку персональных данных (для Участников)",
    content: (
      <div className="space-y-6 text-sm">
        <p className="leading-relaxed">
          Я, нижеподписавшийся(ая), свободно, своей волей и в своём интересе даю согласие{" "}
          <strong>ИП Чикин Дмитрий Сергеевич</strong> (ОГРНИП 321774600501510, ИНН 771916365140)
          (далее — Оператор) на обработку моих персональных данных на следующих условиях:
        </p>
        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">1. Перечень персональных данных</h3>
          <p className="leading-relaxed">
            Фамилия, имя, отчество (при наличии), номер телефона, адрес электронной почты,
            дата рождения (при необходимости), ссылка на аккаунт в Telegram / VK ID / Яндекс ID / MAX
            (при их использовании).
          </p>
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">2. Цели обработки</h3>
          <ul className="list-disc list-outside ml-5 space-y-1 leading-relaxed">
            <li>регистрация и авторизация на Сайте sparcom.ru;</li>
            <li>запись на мероприятия и оплата;</li>
            <li>связь с Организаторами и Мастерами по вопросам мероприятия;</li>
            <li>направление уведомлений (напоминания, изменения, отмена);</li>
            <li>сбор обратной связи (отзывы);</li>
            <li>соблюдение требований законодательства РФ.</li>
          </ul>
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">3. Передача третьим лицам</h3>
          <p className="leading-relaxed">
            Я согласен(на) на передачу моих персональных данных (в объёме, указанном в п. 1)
            Организаторам мероприятий, Мастерам, Партнёрам (владельцам бань) на основании договора
            поручения обработки. Получатели данных обязаны использовать их только для целей,
            определённых Оператором, и обеспечивать конфиденциальность.
          </p>
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">4. Срок согласия</h3>
          <p className="leading-relaxed">
            С момента регистрации до отзыва. Отзыв согласия направляется на{" "}
            <a href="mailto:privacy@sparcom.ru" className="text-primary underline underline-offset-2 hover:text-primary/80">
              privacy@sparcom.ru
            </a>
            . При отзыве Оператор вправе продолжить обработку при наличии иных законных оснований.
          </p>
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">5. Подтверждение</h3>
          <p className="leading-relaxed">
            Я ознакомлен(а) с{" "}
            <Link to="/documents?tab=privacy" className="text-primary underline underline-offset-2 hover:text-primary/80">
              Политикой конфиденциальности
            </Link>{" "}
            (sparcom.ru/documents?tab=privacy) и настоящим Согласием.
          </p>
        </div>
        <div className="bg-muted rounded-lg p-4 space-y-2">
          <p><strong>Дата:</strong> проставляется автоматически при регистрации</p>
          <p><strong>Подпись (цифровая / галочка):</strong> подтверждается отметкой в чекбоксе при регистрации на Сайте</p>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: "Приложение №2. Соглашение об использовании простой электронной подписи (ПЭП)",
    content: (
      <div className="space-y-6 text-sm">
        <p className="leading-relaxed">
          Настоящее Соглашение определяет условия использования простой электронной подписи (ПЭП)
          при взаимодействии между Пользователем и ИП Чикин Дмитрий Сергеевич (далее — Оператор)
          на Сайте sparcom.ru.
        </p>
        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">1. Что является ПЭП</h3>
          <p className="leading-relaxed">Простой электронной подписью признаётся подтверждение действия пользователем посредством:</p>
          <ul className="list-disc list-outside ml-5 space-y-1 leading-relaxed mt-2">
            <li>проставления отметки в чекбоксе (галочки) при регистрации или записи на мероприятие;</li>
            <li>нажатия кнопки «Подтвердить», «Оплатить», «Записаться» и аналогичных;</li>
            <li>авторизации через сервисы VK ID, Яндекс ID, Telegram, MAX.</li>
          </ul>
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">2. Юридическая сила</h3>
          <p className="leading-relaxed">
            Документы, подписанные ПЭП, признаются Сторонами равнозначными документам на бумажном носителе
            в соответствии с п. 4 ст. 11 Федерального закона от 27.07.2006 № 149-ФЗ «Об информации»
            и ст. 6 Федерального закона от 06.04.2011 № 63-ФЗ «Об электронной подписи».
          </p>
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">3. Обязательства Пользователя</h3>
          <ul className="list-disc list-outside ml-5 space-y-1 leading-relaxed">
            <li>не передавать доступ к своей учётной записи третьим лицам;</li>
            <li>незамедлительно уведомлять Оператора о компрометации учётных данных;</li>
            <li>не оспаривать юридическую силу действий, совершённых с использованием его ПЭП.</li>
          </ul>
        </div>
        <div className="bg-muted rounded-lg p-4 space-y-2">
          <p><strong>Дата вступления в силу:</strong> с момента регистрации на Сайте</p>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    title: "Приложение №3. Договор поручения обработки персональных данных",
    content: (
      <div className="space-y-6 text-sm">
        <p className="leading-relaxed">
          Настоящий договор заключается между ИП Чикин Дмитрий Сергеевич (Оператор)
          и лицом, получившим статус Организатора, Мастера или Партнёра на Сайте sparcom.ru (Поверенный).
        </p>
        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">1. Предмет</h3>
          <p className="leading-relaxed">
            Оператор поручает Поверенному обработку персональных данных Участников в объёме,
            необходимом для организации и проведения мероприятий: имя, номер телефона, адрес электронной почты.
          </p>
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">2. Обязанности Поверенного</h3>
          <ul className="list-disc list-outside ml-5 space-y-1 leading-relaxed">
            <li>обрабатывать данные строго в целях, определённых Оператором;</li>
            <li>не передавать данные третьим лицам без письменного согласия Оператора;</li>
            <li>обеспечивать конфиденциальность и применять меры технической защиты;</li>
            <li>уничтожать данные по завершении поручения или по требованию Оператора;</li>
            <li>незамедлительно уведомлять Оператора об инцидентах с данными (утечка, взлом и т.п.).</li>
          </ul>
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">3. Ответственность</h3>
          <p className="leading-relaxed">
            Поверенный несёт ответственность за нарушение условий обработки данных в соответствии
            с законодательством РФ, в том числе ФЗ №152-ФЗ. Оператор вправе потребовать возмещения
            убытков и лишить Поверенного специального статуса на Сайте.
          </p>
        </div>
        <div className="bg-muted rounded-lg p-4 space-y-2">
          <p><strong>Акцепт:</strong> верификация и получение статуса Организатора / Мастера / Партнёра</p>
        </div>
      </div>
    ),
  },
  {
    id: 4,
    title: "Приложение №4. Согласие на использование и обнародование фотоизображения",
    content: (
      <div className="space-y-6 text-sm">
        <p className="leading-relaxed">
          Я, нижеподписавшийся(ая), на основании ст. 152.1 ГК РФ даю согласие{" "}
          <strong>ИП Чикин Дмитрий Сергеевич</strong> на использование и обнародование
          моих фотоизображений (включая видео), сделанных в ходе мероприятий Сообщества.
        </p>
        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">1. Цели использования</h3>
          <ul className="list-disc list-outside ml-5 space-y-1 leading-relaxed">
            <li>размещение на Сайте sparcom.ru в разделах «Галерея», «Мероприятия», «О нас»;</li>
            <li>публикация в официальных аккаунтах Сообщества в социальных сетях (ВКонтакте, Telegram и др.);</li>
            <li>использование в маркетинговых и рекламных материалах Сообщества (без коммерческой передачи третьим лицам).</li>
          </ul>
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">2. Ограничения</h3>
          <ul className="list-disc list-outside ml-5 space-y-1 leading-relaxed">
            <li>фотографии не передаются третьим лицам для коммерческого использования;</li>
            <li>фотографии не используются в целях, противоречащих интересам изображённого лица;</li>
            <li>интимные и компрометирующие фотографии не публикуются ни при каких обстоятельствах.</li>
          </ul>
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">3. Отзыв согласия</h3>
          <p className="leading-relaxed">
            Согласие может быть отозвано в любое время путём направления запроса на{" "}
            <a href="mailto:privacy@sparcom.ru" className="text-primary underline underline-offset-2 hover:text-primary/80">
              privacy@sparcom.ru
            </a>
            . После отзыва Оператор прекращает дальнейшее использование фотографий, однако
            ранее опубликованные материалы могут сохраняться в кэше или архивах третьих платформ.
          </p>
        </div>
        <div className="bg-muted rounded-lg p-4 space-y-2">
          <p><strong>Акцепт:</strong> участие в мероприятии при наличии фотосъёмки, о которой объявлено заранее</p>
        </div>
      </div>
    ),
  },
];
