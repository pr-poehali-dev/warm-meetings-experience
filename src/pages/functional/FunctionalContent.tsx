import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

export const FUNCTIONAL_SECTIONS = [
  { id: "s0", title: "Общие сведения о ПО" },
  { id: "s00", title: "Сведения о правообладателе" },
  { id: "s1", title: "Наименование ПО" },
  { id: "s2", title: "Описание функционала" },
  { id: "s21", title: "2.1. Общий функционал" },
  { id: "s22", title: "2.2. Участник" },
  { id: "s23", title: "2.3. Партнёр (Баня)" },
  { id: "s24", title: "2.4. Мастер" },
  { id: "s25", title: "2.5. Организатор" },
  { id: "s26", title: "2.6. Администратор" },
  { id: "s27", title: "2.7. Коммуникация" },
  { id: "s3", title: "Установка и эксплуатация" },
  { id: "s31", title: "3.1. Модель распространения" },
  { id: "s32", title: "3.2. Доступ" },
  { id: "s33", title: "3.3. Системные требования" },
  { id: "s34", title: "3.4. Начало работы" },
  { id: "s35", title: "3.5. Техподдержка" },
];

export function FunctionalSidebar() {
  const [activeId, setActiveId] = useState(FUNCTIONAL_SECTIONS[0].id);

  useEffect(() => {
    const timer = setTimeout(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries.filter((e) => e.isIntersecting);
          if (visible.length > 0) {
            const topmost = visible.reduce((a, b) =>
              a.boundingClientRect.top < b.boundingClientRect.top ? a : b
            );
            setActiveId(topmost.target.id);
          }
        },
        { rootMargin: "-20% 0px -70% 0px" }
      );
      FUNCTIONAL_SECTIONS.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });
      return () => observer.disconnect();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <aside className="hidden lg:block w-56 shrink-0">
      <div className="sticky top-28">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Содержание</p>
        <nav className="space-y-0.5">
          {FUNCTIONAL_SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors leading-snug
                ${activeId === s.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
            >
              {s.title}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}

export function FunctionalContent() {
  return (
    <article className="flex-1 min-w-0 max-w-3xl prose prose-sm prose-neutral dark:prose-invert prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground/80 prose-li:text-foreground/80 prose-a:text-primary max-w-none">

      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Icon name="BookOpen" size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground m-0">Документация на ПО «СПАРКОМ»</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Версия документации от 15.04.2026</p>
        </div>
      </div>

      <section id="s0" className="scroll-mt-28 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">1. Общие сведения о программном обеспечении</h2>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-semibold text-foreground">Наименование программного обеспечения:</dt>
            <dd className="text-foreground/80 mt-0.5">Платформа «СПАРКОМ» (далее — ПО, Платформа).</dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Тип программного обеспечения:</dt>
            <dd className="text-foreground/80 mt-0.5">Веб-приложение, облачная SaaS-платформа.</dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Класс программного обеспечения по Классификатору, утверждённому Приказом Минцифры России от 22.09.2020 № 486:</dt>
            <dd className="text-foreground/80 mt-0.5">12.18 «Программное обеспечение для решения отраслевых задач в области культуры, спорта, организации досуга и развлечений».</dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Код продукции по Общероссийскому классификатору продукции по видам экономической деятельности (ОКПД2):</dt>
            <dd className="text-foreground/80 mt-0.5">58.29.29 «Обеспечение программное прикладное прочее на электронном носителе».</dd>
          </div>
        </dl>
      </section>

      <section id="s00" className="scroll-mt-28 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-4">2. Сведения о правообладателе</h2>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-semibold text-foreground">Правообладатель:</dt>
            <dd className="text-foreground/80 mt-0.5">Индивидуальный предприниматель Чикин Дмитрий Сергеевич.</dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">ОГРНИП:</dt>
            <dd className="text-foreground/80 mt-0.5">321774600501510.</dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">ИНН:</dt>
            <dd className="text-foreground/80 mt-0.5">771916365140.</dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Адрес:</dt>
            <dd className="text-foreground/80 mt-0.5">105187, г. Москва, ул. Фортунатовская, д. 31/35, кв. 98.</dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Адрес электронной почты:</dt>
            <dd className="text-foreground/80 mt-0.5"><a href="mailto:privacy@sparcom.ru">privacy@sparcom.ru</a>.</dd>
          </div>
        </dl>
      </section>

      <div className="border-t border-border my-10" />

      <section id="s1" className="scroll-mt-28 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-3">3. Наименование программного обеспечения</h2>
        <p className="text-foreground/80">Платформа «СПАРКОМ» (далее — ПО, Платформа).</p>
      </section>

      <section id="s2" className="scroll-mt-28 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-3">4. Описание функциональных характеристик</h2>
        <p className="text-foreground/80">ПО представляет собой веб-платформу (SaaS), содержащую каталог банных комплексов и мероприятий, каталог профессиональных мастеров, а также информационный новостной канал. На Платформе реализован личный кабинет, функционал которого различается в зависимости от роли пользователя.</p>
      </section>

      <section id="s21" className="scroll-mt-28 mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-3">4.1. Общий функционал для всех ролей</h3>
        <ul className="space-y-1.5 text-foreground/80">
          <li>Регистрация и авторизация (по адресу электронной почты или через сервисы идентификации российских провайдеров).</li>
          <li>Восстановление доступа к учётной записи.</li>
          <li>Просмотр каталога банных комплексов, мероприятий и мастеров.</li>
          <li>Поиск и фильтрация информации по параметрам (дата, локация, тип события, услуги).</li>
          <li>Доступ к новостному каналу и медиа-материалам.</li>
          <li>Обращение в службу технической поддержки.</li>
        </ul>
      </section>

      <section id="s22" className="scroll-mt-28 mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-3">4.2. Роль «Участник» (Посетитель)</h3>
        <ul className="space-y-1.5 text-foreground/80">
          <li>Просмотр детальной информации о банном комплексе, мероприятии или мастере (описание, фотографии, правила, стоимость).</li>
          <li>Онлайн-бронирование места на мероприятие или посещения банного комплекса.</li>
          <li>Запись на сеанс к выбранному мастеру.</li>
          <li>Просмотр истории бронирований и записей.</li>
          <li>Получение уведомлений о статусе записи (подтверждение, изменение, напоминание).</li>
          <li>Возможность оставлять отзывы и оценки по факту посещения.</li>
          <li>Управление подписками на информационные рассылки.</li>
        </ul>
      </section>

      <section id="s23" className="scroll-mt-28 mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-3">4.3. Роль «Партнёр (Баня)» — Владелец или менеджер банного комплекса</h3>
        <ul className="space-y-1.5 text-foreground/80">
          <li>Регистрация и ведение карточки банного комплекса (наименование, адрес, контактные данные, описание, перечень услуг).</li>
          <li>Загрузка фотографий и медиа-материалов объекта.</li>
          <li>Создание и публикация мероприятий на базе комплекса (фестивали, парения, акции).</li>
          <li>Добавление мастеров, работающих на территории комплекса, и управление их списком.</li>
          <li>Управление расписанием доступности помещений и услуг.</li>
          <li>Просмотр и управление бронированиями (подтверждение, изменение статуса, отмена).</li>
          <li>Просмотр списка участников, записавшихся на мероприятия.</li>
          <li>Просмотр статистики по посещаемости и бронированиям.</li>
          <li>Получение уведомлений о новых бронированиях и записях.</li>
          <li>Просмотр отзывов и рейтинга комплекса.</li>
        </ul>
      </section>

      <section id="s24" className="scroll-mt-28 mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-3">4.4. Роль «Мастер»</h3>
        <ul className="space-y-1.5 text-foreground/80">
          <li>Создание и ведение личного профиля (описание, фотографии, сведения о квалификации, направления работы).</li>
          <li>Привязка к банному комплексу-партнёру (при наличии).</li>
          <li>Настройка личного расписания доступности для записи (даты и временные интервалы).</li>
          <li>Управление записями клиентов (подтверждение, перенос, отмена).</li>
          <li>Просмотр истории записей и клиентов.</li>
          <li>Получение уведомлений о новых записях.</li>
          <li>Просмотр отзывов и рейтинга.</li>
        </ul>
      </section>

      <section id="s25" className="scroll-mt-28 mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-3">4.5. Роль «Организатор мероприятий»</h3>
        <ul className="space-y-1.5 text-foreground/80">
          <li>Создание и публикация карточки мероприятия (название, описание, дата, время, место, стоимость).</li>
          <li>Привязка мероприятия к банному комплексу-партнёру.</li>
          <li>Загрузка фотографий и медиа-материалов к мероприятию.</li>
          <li>Управление списком участников (просмотр записавшихся, отметка о посещении).</li>
          <li>Коммуникация с участниками через встроенную систему уведомлений.</li>
          <li>Просмотр статистики по мероприятиям (количество просмотров, записей, отзывов).</li>
          <li>Управление календарём событий.</li>
        </ul>
      </section>

      <section id="s26" className="scroll-mt-28 mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-3">4.6. Функционал Администратора платформы</h3>
        <ul className="space-y-1.5 text-foreground/80">
          <li>Модерация публикуемого контента (карточки бань, мероприятия, профили мастеров, отзывы).</li>
          <li>Управление учётными записями пользователей и ролями.</li>
          <li>Просмотр системных журналов событий и логов.</li>
          <li>Формирование отчётности.</li>
        </ul>
      </section>

      <section id="s27" className="scroll-mt-28 mb-10">
        <h3 className="text-lg font-semibold text-foreground mb-3">4.7. Коммуникация между пользователями</h3>
        <p className="text-foreground/80">На Платформе реализована система уведомлений и служебных сообщений между участниками, партнёрами и мастерами (в рамках подтверждения бронирований и записей).</p>
        <p className="text-foreground/80 mt-3">Обмен сообщениями осуществляется без применения сквозного (end-to-end) шифрования. Все сообщения передаются по защищённому каналу связи (HTTPS/TLS) и хранятся на сервере в открытом виде, доступном администратору Платформы. Такой подход обеспечивает выполнение требований законодательства Российской Федерации к организаторам распространения информации.</p>
      </section>

      <div className="border-t border-border my-10" />

      <section id="s3" className="scroll-mt-28 mb-10">
        <h2 className="text-xl font-semibold text-foreground mb-3">5. Информация, необходимая для установки и эксплуатации</h2>
      </section>

      <section id="s31" className="scroll-mt-28 mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-3">5.1. Модель распространения</h3>
        <p className="text-foreground/80">ПО распространяется по модели SaaS (Software as a Service — программное обеспечение как услуга) и не требует установки на оборудование пользователя.</p>
      </section>

      <section id="s32" className="scroll-mt-28 mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-3">5.2. Доступ к Платформе</h3>
        <p className="text-foreground/80">Доступ осуществляется через веб-браузер по адресу: <a href="https://sparcom.ru" target="_blank" rel="noopener noreferrer">https://sparcom.ru</a>.</p>
      </section>

      <section id="s33" className="scroll-mt-28 mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-3">5.3. Системные требования</h3>
        <ul className="space-y-1.5 text-foreground/80">
          <li>Актуальная версия любого современного веб-браузера (Google Chrome, Mozilla Firefox, Safari, Яндекс.Браузер или аналогичный).</li>
          <li>Включённая поддержка JavaScript и cookies.</li>
          <li>Стабильное подключение к сети Интернет.</li>
        </ul>
      </section>

      <section id="s34" className="scroll-mt-28 mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-3">5.4. Начало работы</h3>
        <ol className="space-y-2 text-foreground/80 list-decimal list-inside">
          <li>Перейдите на сайт <a href="https://sparcom.ru" target="_blank" rel="noopener noreferrer">https://sparcom.ru</a>.</li>
          <li>Нажмите кнопку «Регистрация» и укажите действующий адрес электронной почты или воспользуйтесь авторизацией через сервис идентификации российского провайдера.</li>
          <li>Подтвердите адрес электронной почты, перейдя по ссылке из письма (если применимо).</li>
          <li>Заполните базовую информацию профиля.</li>
          <li>Для получения расширенных ролей (Мастер, Организатор, Партнёр) обратитесь в службу поддержки или воспользуйтесь соответствующим разделом в личном кабинете для подачи заявки на верификацию.</li>
        </ol>
      </section>

      <section id="s35" className="scroll-mt-28 mb-10">
        <h3 className="text-lg font-semibold text-foreground mb-3">5.5. Техническая поддержка</h3>
        <p className="text-foreground/80">По всем вопросам, связанным с работой Платформы, обращайтесь в службу поддержки по адресу электронной почты: <a href="mailto:club@sparcom.ru">club@sparcom.ru</a>.</p>
      </section>

      <div className="border-t border-border pt-6 mt-4">
        <p className="text-sm text-muted-foreground italic">Версия документации от 15.04.2026.</p>
      </div>

    </article>
  );
}