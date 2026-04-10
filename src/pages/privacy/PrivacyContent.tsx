import Icon from "@/components/ui/icon";
import { privacyAppendices } from "./privacyAppendices";

interface Props {
  onOpenAppendix: (id: number) => void;
}

export default function PrivacyContent({ onOpenAppendix }: Props) {
  return (
    <div className="space-y-12 text-foreground/90 leading-relaxed">

      <section id="ps1" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-5 pb-2 border-b border-border">1. Общие положения</h2>
        <div className="space-y-3 text-sm">
          <p><strong>1.1.</strong> Настоящая политика обработки персональных данных (далее — Политика) составлена в соответствии с требованиями Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных» и определяет порядок обработки персональных данных и меры по обеспечению их безопасности, предпринимаемые Индивидуальным предпринимателем Чикин Дмитрий Сергеевич (ОГРНИП 321774600501510, ИНН 771916365140, адрес: г. Москва, ул. Фортунатовская, д. 31/35, кв. 98) (далее — Оператор).</p>
          <p><strong>1.2.</strong> Оператор ставит своей важнейшей целью и условием осуществления своей деятельности соблюдение прав и свобод человека и гражданина при обработке его персональных данных, в том числе защиты права на неприкосновенность частной жизни, личную и семейную тайну.</p>
          <p><strong>1.3.</strong> Настоящая Политика применяется ко всей информации, которую Оператор может получить о посетителях веб-сайта <a href="https://sparcom.ru" className="text-primary underline underline-offset-2 hover:text-primary/80">https://sparcom.ru</a> (далее — Сайт), а также при использовании сервисов, интегрированных с Сайтом (Telegram-бот, VK Mini App, API и др.).</p>
          <p><strong>1.4.</strong> Действующая редакция Политики размещена по адресу: <a href="https://sparcom.ru/documents?tab=privacy" className="text-primary underline underline-offset-2 hover:text-primary/80">https://sparcom.ru/documents?tab=privacy</a>.</p>
        </div>
      </section>

      <section id="ps2" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-5 pb-2 border-b border-border">2. Основные понятия, используемые в Политике</h2>
        <div className="space-y-3 text-sm">
          <p><strong>2.1.</strong> <em>Автоматизированная обработка персональных данных</em> — обработка персональных данных с помощью средств вычислительной техники.</p>
          <p><strong>2.2.</strong> <em>Блокирование персональных данных</em> — временное прекращение обработки персональных данных (за исключением случаев, если обработка необходима для уточнения персональных данных).</p>
          <p><strong>2.3.</strong> <em>Веб-сайт</em> — совокупность графических и информационных материалов, а также программ для ЭВМ и баз данных, обеспечивающих их доступность в сети интернет по адресу https://sparcom.ru.</p>
          <p><strong>2.4.</strong> <em>Информационная система персональных данных</em> — совокупность содержащихся в базах данных персональных данных и обеспечивающих их обработку информационных технологий и технических средств.</p>
          <p><strong>2.5.</strong> <em>Обезличивание персональных данных</em> — действия, в результате которых невозможно определить без использования дополнительной информации принадлежность персональных данных конкретному Пользователю.</p>
          <p><strong>2.6.</strong> <em>Обработка персональных данных</em> — любое действие (операция) или совокупность действий, совершаемых с персональными данными, включая сбор, запись, систематизацию, накопление, хранение, уточнение, извлечение, использование, передачу, обезличивание, блокирование, удаление, уничтожение персональных данных.</p>
          <p><strong>2.7.</strong> <em>Оператор</em> — ИП Чикин Дмитрий Сергеевич, самостоятельно или совместно с другими лицами организующее и/или осуществляющее обработку персональных данных.</p>
          <p><strong>2.8.</strong> <em>Персональные данные</em> — любая информация, относящаяся к прямо или косвенно определённому или определяемому физическому лицу (субъекту персональных данных).</p>
          <p><strong>2.9.</strong> <em>Пользователь</em> — любой посетитель Сайта, а также лицо, зарегистрировавшееся на Сайте и использующее его функционал.</p>
          <p><strong>2.10.</strong> <em>Предоставление персональных данных</em> — действия, направленные на раскрытие персональных данных определённому лицу или определённому кругу лиц.</p>
          <p><strong>2.11.</strong> <em>Распространение персональных данных</em> — любые действия, направленные на раскрытие персональных данных неопределённому кругу лиц.</p>
          <p><strong>2.12.</strong> <em>Трансграничная передача персональных данных</em> — передача персональных данных на территорию иностранного государства органу власти иностранного государства, иностранному физическому или иностранному юридическому лицу.</p>
          <p><strong>2.13.</strong> <em>Уничтожение персональных данных</em> — любые действия, в результате которых персональные данные уничтожаются безвозвратно с невозможностью дальнейшего восстановления.</p>
          <p><strong>2.14.</strong> <em>Простая электронная подпись (ПЭП)</em> — электронная подпись, которая подтверждает факт её формирования конкретным лицом с использованием кодов, паролей или иных средств, в том числе одноразовых кодов, направленных по SMS, в Telegram, через VK ID, Яндекс ID, либо подтверждённых иным способом.</p>
        </div>
      </section>

      <section id="ps3" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-5 pb-2 border-b border-border">3. Основные права и обязанности Оператора</h2>
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium mb-2">3.1. Оператор имеет право:</p>
            <ul className="list-disc list-outside ml-5 space-y-1.5">
              <li>получать от субъекта персональных данных достоверную информацию и/или документы, содержащие персональные данные;</li>
              <li>в случае отзыва субъектом персональных данных согласия продолжить обработку без согласия при наличии оснований, указанных в Законе о персональных данных;</li>
              <li>самостоятельно определять состав и перечень мер, необходимых и достаточных для обеспечения выполнения обязанностей, предусмотренных законодательством;</li>
              <li>поручать обработку персональных данных третьим лицам (Организаторам, Пармастерам, Партнёрам) на основании договора поручения.</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2">3.2. Оператор обязан:</p>
            <ul className="list-disc list-outside ml-5 space-y-1.5">
              <li>предоставлять субъекту персональных данных по его просьбе информацию, касающуюся обработки его персональных данных;</li>
              <li>организовывать обработку персональных данных в порядке, установленном действующим законодательством РФ;</li>
              <li>отвечать на обращения и запросы субъектов персональных данных в соответствии с требованиями Закона о персональных данных;</li>
              <li>сообщать в уполномоченный орган по запросу необходимую информацию в течение 30 дней с даты получения запроса;</li>
              <li>публиковать или иным образом обеспечивать неограниченный доступ к настоящей Политике;</li>
              <li>принимать правовые, организационные и технические меры для защиты персональных данных;</li>
              <li>прекратить обработку и уничтожить персональные данные в порядке и случаях, предусмотренных Законом о персональных данных.</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="ps4" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-5 pb-2 border-b border-border">4. Основные права и обязанности субъектов персональных данных</h2>
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium mb-2">4.1. Субъекты персональных данных имеют право:</p>
            <ul className="list-disc list-outside ml-5 space-y-1.5">
              <li>получать информацию, касающуюся обработки его персональных данных;</li>
              <li>требовать от оператора уточнения его персональных данных, их блокирования или уничтожения в случае, если данные являются неполными, устаревшими, неточными или незаконно полученными;</li>
              <li>отозвать согласие на обработку персональных данных;</li>
              <li>обжаловать в уполномоченный орган или в судебном порядке неправомерные действия или бездействие Оператора;</li>
              <li>на осуществление иных прав, предусмотренных законодательством РФ.</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2">4.2. Субъекты персональных данных обязаны:</p>
            <ul className="list-disc list-outside ml-5 space-y-1.5">
              <li>предоставлять Оператору достоверные данные о себе;</li>
              <li>сообщать Оператору об изменении своих персональных данных.</li>
            </ul>
          </div>
          <p><strong>4.3.</strong> Лица, передавшие Оператору недостоверные сведения о себе, несут ответственность в соответствии с законодательством РФ.</p>
        </div>
      </section>

      <section id="ps5" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-5 pb-2 border-b border-border">5. Цели сбора и обработки персональных данных</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="text-left p-3 border-b border-border font-medium">Цель обработки</th>
                <th className="text-left p-3 border-b border-border font-medium">Персональные данные</th>
                <th className="text-left p-3 border-b border-border font-medium">Правовое основание</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="p-3 align-top">Регистрация и авторизация Пользователя на Сайте</td>
                <td className="p-3 align-top text-muted-foreground">Фамилия, имя, номер телефона, адрес электронной почты, идентификаторы в VK ID, Яндекс ID, Telegram</td>
                <td className="p-3 align-top">Согласие субъекта, исполнение договора</td>
              </tr>
              <tr className="bg-muted/20">
                <td className="p-3 align-top">Организация и проведение мероприятий</td>
                <td className="p-3 align-top text-muted-foreground">Фамилия, имя, номер телефона, адрес электронной почты</td>
                <td className="p-3 align-top">Согласие субъекта, исполнение договора</td>
              </tr>
              <tr>
                <td className="p-3 align-top">Передача данных третьим лицам для связи по вопросам мероприятия</td>
                <td className="p-3 align-top text-muted-foreground">Фамилия, имя, номер телефона (при необходимости)</td>
                <td className="p-3 align-top">Согласие субъекта, договор поручения</td>
              </tr>
              <tr className="bg-muted/20">
                <td className="p-3 align-top">Направление уведомлений (Telegram, SMS, VK, email)</td>
                <td className="p-3 align-top text-muted-foreground">Контактные данные (номер телефона, email, идентификаторы мессенджеров)</td>
                <td className="p-3 align-top">Согласие субъекта, исполнение договора</td>
              </tr>
              <tr>
                <td className="p-3 align-top">Подтверждение действий с использованием ПЭП</td>
                <td className="p-3 align-top text-muted-foreground">Номер телефона, идентификаторы VK ID, Яндекс ID, Telegram, IP-адрес, дата и время</td>
                <td className="p-3 align-top">Согласие субъекта (Соглашение об использовании ПЭП)</td>
              </tr>
              <tr className="bg-muted/20">
                <td className="p-3 align-top">Обеспечение безопасности, предотвращение мошенничества</td>
                <td className="p-3 align-top text-muted-foreground">IP-адреса, данные сессий, логи действий</td>
                <td className="p-3 align-top">Законные интересы Оператора</td>
              </tr>
              <tr>
                <td className="p-3 align-top">Улучшение качества услуг, аналитика</td>
                <td className="p-3 align-top text-muted-foreground">Обезличенные данные (статистика посещений)</td>
                <td className="p-3 align-top">Согласие субъекта (при сборе cookies)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="ps6" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-5 pb-2 border-b border-border">6. Передача персональных данных третьим лицам</h2>
        <div className="space-y-3 text-sm">
          <p><strong>6.1.</strong> Оператор вправе передавать персональные данные Пользователей третьим лицам в следующих случаях:</p>
          <ul className="list-disc list-outside ml-5 space-y-1.5">
            <li><strong>Организаторам мероприятий</strong> — для связи с Пользователем по вопросам записи, подтверждения участия, уточнения деталей мероприятия, направления напоминаний.</li>
            <li><strong>Мастерам</strong> — для координации времени и условий проведения сеанса.</li>
            <li><strong>Партнёрам (владельцам бань)</strong> — для обеспечения допуска на мероприятие.</li>
            <li><strong>Сервисам аутентификации (VK ID, Яндекс ID, Telegram)</strong> — в целях подтверждения личности Пользователя при использовании ПЭП.</li>
            <li><strong>Платёжным системам</strong> — для проведения оплаты за участие в мероприятиях.</li>
          </ul>
          <p><strong>6.2.</strong> Передача персональных данных третьим лицам осуществляется на основании отдельного согласия Пользователя и с обязательным заключением с получателями данных договора поручения обработки персональных данных.</p>
          <p><strong>6.3.</strong> Оператор не передает персональные данные третьим лицам в иных целях, не указанных в настоящей Политике, за исключением случаев, предусмотренных действующим законодательством РФ.</p>
        </div>
      </section>

      <section id="ps7" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-5 pb-2 border-b border-border">7. Обработка персональных данных с использованием простой электронной подписи (ПЭП)</h2>
        <div className="space-y-3 text-sm">
          <p><strong>7.1.</strong> При совершении юридически значимых действий (подписание договоров, согласий, актов) Оператор может использовать простую электронную подпись.</p>
          <p><strong>7.2.</strong> Подтверждение волеизъявления Пользователя осуществляется одним из следующих способов:</p>
          <ul className="list-disc list-outside ml-5 space-y-1.5">
            <li>ввод одноразового кода, отправленного по SMS на номер телефона;</li>
            <li>ввод одноразового кода, отправленного в Telegram-бота;</li>
            <li>подтверждение действия через сервис VK ID или Яндекс ID;</li>
            <li>иные способы, предусмотренные Соглашением об использовании ПЭП.</li>
          </ul>
          <p><strong>7.3.</strong> Факт подписания документа с использованием ПЭП фиксируется в протоколе подписания, который хранится у Оператора и может быть представлен для подтверждения юридической силы документа.</p>
        </div>
      </section>

      <section id="ps8" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-5 pb-2 border-b border-border">8. Условия обработки персональных данных</h2>
        <div className="space-y-3 text-sm">
          <p><strong>8.1.</strong> Обработка персональных данных осуществляется с согласия субъекта, за исключением случаев, когда такое согласие не требуется в соответствии с законодательством.</p>
          <p><strong>8.2.</strong> Обработка персональных данных осуществляется с использованием средств автоматизации и без использования таких средств (на бумажных носителях).</p>
          <p><strong>8.3.</strong> Персональные данные Пользователей хранятся на серверах, расположенных на территории Российской Федерации, в соответствии с требованиями законодательства о локализации персональных данных.</p>
          <p><strong>8.4.</strong> Срок обработки персональных данных определяется достижением целей обработки, но не более срока действия договорных отношений между Оператором и Пользователем.</p>
        </div>
      </section>

      <section id="ps9" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-5 pb-2 border-b border-border">9. Обеспечение безопасности персональных данных</h2>
        <div className="space-y-3 text-sm">
          <p><strong>9.1.</strong> Оператор принимает необходимые правовые, организационные и технические меры для защиты персональных данных от неправомерного или случайного доступа, уничтожения, изменения, блокирования, копирования, распространения, а также от иных неправомерных действий.</p>
          <p><strong>9.2.</strong> Меры защиты включают:</p>
          <ul className="list-disc list-outside ml-5 space-y-1.5">
            <li>назначение ответственного за организацию обработки персональных данных;</li>
            <li>разработку и внедрение локальных актов по вопросам обработки персональных данных;</li>
            <li>применение шифрования при передаче данных (SSL/TLS);</li>
            <li>разграничение доступа к персональным данным в информационных системах;</li>
            <li>регулярное резервное копирование и мониторинг инцидентов;</li>
            <li>использование средств защиты информации, прошедших процедуру оценки соответствия.</li>
          </ul>
          <p><strong>9.3.</strong> В случае выявления факта утечки персональных данных Оператор действует в соответствии с планом реагирования на инциденты и уведомляет Роскомнадзор в установленные законом сроки.</p>
        </div>
      </section>

      <section id="ps10" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-5 pb-2 border-b border-border">10. Права субъекта персональных данных на получение информации</h2>
        <div className="space-y-3 text-sm">
          <p><strong>10.1.</strong> Субъект персональных данных вправе получить информацию, касающуюся обработки его персональных данных, направив письменный запрос Оператору по адресу: 105187, г. Москва, ул. Фортунатовская, д. 31/35, кв. 98, или по электронной почте: <a href="mailto:privacy@sparcom.ru" className="text-primary underline underline-offset-2 hover:text-primary/80">privacy@sparcom.ru</a>.</p>
          <p><strong>10.2.</strong> В запросе должны быть указаны: фамилия, имя, отчество субъекта; номер основного документа, удостоверяющего личность; сведения, подтверждающие участие субъекта в отношениях с Оператором (логин, номер телефона, email); подпись субъекта или его представителя.</p>
          <p><strong>10.3.</strong> Оператор рассматривает запрос в течение 30 дней с даты его получения и предоставляет ответ в письменной форме.</p>
          <p><strong>10.4.</strong> Информация предоставляется бесплатно. При наличии оснований для отказа Оператор уведомляет об этом субъекта в течение 7 рабочих дней.</p>
        </div>
      </section>

      <section id="ps11" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-5 pb-2 border-b border-border">11. Обработка персональных данных несовершеннолетних</h2>
        <div className="space-y-3 text-sm">
          <p><strong>11.1.</strong> Сайт не предназначен для лиц, не достигших 18 лет. Регистрация на Сайте допускается только с 18 лет.</p>
          <p><strong>11.2.</strong> Если Оператору станет известно об обработке персональных данных несовершеннолетнего, такие данные подлежат немедленному удалению, за исключением случаев, когда обработка осуществляется с согласия родителей (законных представителей).</p>
        </div>
      </section>

      <section id="ps12" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-5 pb-2 border-b border-border">12. Трансграничная передача персональных данных</h2>
        <div className="space-y-3 text-sm">
          <p><strong>12.1.</strong> Оператор не осуществляет трансграничную передачу персональных данных, за исключением случаев, когда это необходимо для исполнения договора с Пользователем и при условии обеспечения надлежащего уровня защиты прав субъектов персональных данных.</p>
          <p><strong>12.2.</strong> Все серверы, на которых хранятся персональные данные, находятся на территории Российской Федерации.</p>
        </div>
      </section>

      <section id="ps13" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-5 pb-2 border-b border-border">13. Изменение Политики</h2>
        <div className="space-y-3 text-sm">
          <p><strong>13.1.</strong> Оператор вправе вносить изменения в настоящую Политику в одностороннем порядке. Изменения вступают в силу с момента размещения новой редакции на Сайте.</p>
          <p><strong>13.2.</strong> Пользователь обязуется самостоятельно отслеживать изменения Политики. Продолжение использования Сайта после изменения Политики означает согласие с новой редакцией.</p>
        </div>
      </section>

      <section id="ps14" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-5 pb-2 border-b border-border">14. Заключительные положения</h2>
        <div className="space-y-3 text-sm">
          <p><strong>14.1.</strong> Настоящая Политика и отношения между Пользователем и Оператором регулируются законодательством Российской Федерации.</p>
          <p><strong>14.2.</strong> Все споры, возникающие из настоящей Политики, подлежат рассмотрению в суде по месту нахождения Оператора с соблюдением обязательного досудебного порядка (претензия рассматривается в течение 30 рабочих дней).</p>
          <p><strong>14.3.</strong> Если какое-либо положение Политики будет признано недействительным, это не влечёт недействительности остальных положений.</p>
        </div>
      </section>

      <section id="ps15" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-5 pb-2 border-b border-border">15. Контактная информация</h2>
        <div className="bg-muted/50 rounded-xl p-6 text-sm space-y-2.5">
          <p className="font-semibold text-base text-foreground">ИП Чикин Дмитрий Сергеевич</p>
          <p className="text-muted-foreground">ИНН: 771916365140 &nbsp;·&nbsp; ОГРНИП: 321774600501510</p>
          <p className="text-muted-foreground">Почтовый адрес: 105187, г. Москва, ул. Фортунатовская, д. 31/35, кв. 98</p>
          <div className="pt-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <Icon name="Phone" size={14} className="text-muted-foreground" />
              <a href="tel:+79265370200" className="text-primary underline underline-offset-2 hover:text-primary/80">+7 (926) 537-02-00</a>
            </div>
            <div className="flex items-center gap-2">
              <Icon name="Mail" size={14} className="text-muted-foreground" />
              <span className="text-muted-foreground">По вопросам персональных данных:</span>
              <a href="mailto:privacy@sparcom.ru" className="text-primary underline underline-offset-2 hover:text-primary/80">privacy@sparcom.ru</a>
            </div>
            <div className="flex items-center gap-2">
              <Icon name="Mail" size={14} className="text-muted-foreground" />
              <span className="text-muted-foreground">Общие вопросы:</span>
              <a href="mailto:club@sparcom.ru" className="text-primary underline underline-offset-2 hover:text-primary/80">club@sparcom.ru</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Приложения ──────────────────────────────────────────────────────── */}
      <section className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-5 pb-2 border-b border-border">Приложения к Политике</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Следующие документы являются неотъемлемой частью настоящей Политики конфиденциальности:
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {privacyAppendices.map((a) => (
            <button
              key={a.id}
              onClick={() => onOpenAppendix(a.id)}
              className="flex items-start gap-3 text-left p-4 rounded-xl border border-border bg-card hover:bg-muted/60 hover:border-primary/30 transition-all group"
            >
              <div className="mt-0.5 p-1.5 rounded-lg bg-primary/10 shrink-0">
                <Icon name="FileText" size={14} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug">{a.title}</p>
              </div>
              <Icon name="ChevronRight" size={14} className="text-muted-foreground shrink-0 mt-1 ml-auto" />
            </button>
          ))}
        </div>
      </section>

    </div>
  );
}
