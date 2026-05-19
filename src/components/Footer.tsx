import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { TELEGRAM_URL } from "@/lib/constants";

const LOGO_ON_DARK = "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/bucket/760cbfd5-821a-4526-9e92-8807a4ff87f6.png";
const LOGO_ON_LIGHT = "https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/bucket/d2735e2c-6a4d-4538-b086-6156be8bd33a.png";

const COLUMNS = [
  {
    title: "Проект",
    links: [
      { label: "Афиша событий", to: "/events" },
      { label: "Мастера", to: "/masters" },
      { label: "Бани", to: "/baths" },
      { label: "Энциклопедия", to: "/blog" },
      { label: "О клубе", to: "/about" },
      { label: "Принципы", to: "/principles" },
    ],
  },
  {
    title: "Участникам",
    links: [
      { label: "Войти", to: "/login" },
      { label: "Регистрация", to: "/register" },
      { label: "Личный кабинет", to: "/account" },
      { label: "Расписание в Telegram", to: TELEGRAM_URL, external: true },
    ],
  },
  {
    title: "Организаторам",
    links: [
      { label: "Стать организатором", to: "/organizer" },
      { label: "Рабочий кабинет", to: "/workspace" },
      { label: "Руководство мастера", to: "/steam-master-guide" },
    ],
  },
];

const SOCIAL = [
  {
    label: "Telegram-канал",
    href: "http://t.me/banya_live",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z" />
      </svg>
    ),
  },
  {
    label: "ВКонтакте",
    href: "https://vk.ru/sparcom",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C5.029 11.66 4.47 9.04 4.47 8.49c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.204.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.491-.085.745-.576.745z" />
      </svg>
    ),
  },
  {
    label: "MAX",
    href: "https://max.ru/join/t71ZcnlfuCESMrQtoECowhw-SLuwDrERP6GR5LNMj0Y",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.5 16.5h-2.25l-2.25-3-2.25 3H7.5l3.375-4.5L7.5 7.5h2.25l2.25 3 2.25-3h2.25l-3.375 4.5L16.5 16.5z" />
      </svg>
    ),
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-background text-foreground border-t border-border transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">

        {/* Основной блок */}
        <div className="flex flex-col md:flex-row gap-10 justify-between mb-10">

          {/* Бренд */}
          <div className="max-w-xs shrink-0">
            <Link to="/" className="inline-block mb-4 hover:opacity-80 transition-opacity">
              <img src={LOGO_ON_LIGHT} alt="СПАРКОМ" className="h-8 w-auto object-contain block dark:hidden" />
              <img src={LOGO_ON_DARK} alt="СПАРКОМ" className="h-8 w-auto object-contain hidden dark:block" />
            </Link>
            <p className="text-sm leading-relaxed mb-5 text-muted-foreground">
              Банный агрегатор событий Москвы. Встречи у пара, огня и тепла — без алкоголя, с уважением к каждому.
            </p>

            {/* Соцсети */}
            <div className="flex items-center gap-2">
              {SOCIAL.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.label}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-primary bg-primary/10 border border-primary/20 transition-all hover:bg-primary/20"
                >
                  {s.icon}
                </a>
              ))}
            </div>

            {/* Контакты */}
            <div className="mt-5 flex flex-col gap-2.5">
              <a
                href="tel:+79265370200"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon name="Phone" size={13} />
                +7 (926) 537-02-00
              </a>
              <a
                href="mailto:club@sparcom.ru"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon name="Mail" size={13} />
                club@sparcom.ru
              </a>
              <a
                href="https://t.me/DmitryChikin"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon name="Send" size={13} />
                @DmitryChikin
              </a>
            </div>
          </div>

          {/* Колонки ссылок */}
          <div className="flex flex-wrap gap-10 sm:gap-14">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <div className="text-xs font-semibold uppercase tracking-widest mb-4 text-primary">
                  {col.title}
                </div>
                <div className="space-y-2.5">
                  {col.links.map((l) =>
                    "external" in l && l.external ? (
                      <a
                        key={l.label}
                        href={l.to}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        key={l.label}
                        to={l.to}
                        className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {l.label}
                      </Link>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Нижняя полоса */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {year} ИП Чикин Дмитрий Сергеевич · ИНН 771916365140</span>
          <div className="flex gap-5">
            <Link to="/documents?tab=privacy" className="hover:text-foreground transition-colors">
              Конфиденциальность
            </Link>
            <Link to="/documents?tab=terms" className="hover:text-foreground transition-colors">
              Правила
            </Link>
            <Link to="/documents" className="hover:text-foreground transition-colors">
              Документы
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}