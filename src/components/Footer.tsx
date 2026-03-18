import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background/80 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="text-background font-bold text-lg mb-2">СПАРКОМ</div>
            <p className="text-sm leading-relaxed text-background/60">
              Банный клуб для тех, кто ценит настоящую баню, живое общение и правильную компанию.
            </p>
          </div>

          <div>
            <div className="text-background font-semibold text-sm mb-3 uppercase tracking-wider">Навигация</div>
            <nav className="flex flex-col gap-2">
              <Link to="/" className="text-sm text-background/60 hover:text-background transition-colors">
                Главная
              </Link>
              <Link to="/events" className="text-sm text-background/60 hover:text-background transition-colors">
                Мероприятия
              </Link>
              <Link to="/register" className="text-sm text-background/60 hover:text-background transition-colors">
                Регистрация
              </Link>
              <Link to="/login" className="text-sm text-background/60 hover:text-background transition-colors">
                Личный кабинет
              </Link>
            </nav>
          </div>

          <div>
            <div className="text-background font-semibold text-sm mb-3 uppercase tracking-wider">Контакты</div>
            <div className="flex flex-col gap-2 mb-5">
              <a
                href="tel:+79265370200"
                className="flex items-center gap-2 text-sm text-background/60 hover:text-background transition-colors"
              >
                <Icon name="Phone" size={14} />
                +7 (926) 537-02-00
              </a>
              <a
                href="mailto:privacy@sparcom.ru"
                className="flex items-center gap-2 text-sm text-background/60 hover:text-background transition-colors"
              >
                <Icon name="Mail" size={14} />
                privacy@sparcom.ru
              </a>
              <a
                href="https://t.me/DmitryChikin"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-background/60 hover:text-background transition-colors"
              >
                <Icon name="Send" size={14} />
                @DmitryChikin
              </a>
            </div>
            <div className="text-background font-semibold text-sm mb-3 uppercase tracking-wider">Мы в сетях</div>
            <div className="flex items-center gap-3">
              <a
                href="http://t.me/banya_live"
                target="_blank"
                rel="noopener noreferrer"
                title="Telegram"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-background/10 hover:bg-background/20 text-background/60 hover:text-background transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/>
                </svg>
              </a>
              <a
                href="https://vk.ru/sparcom"
                target="_blank"
                rel="noopener noreferrer"
                title="ВКонтакте"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-background/10 hover:bg-background/20 text-background/60 hover:text-background transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C5.029 11.66 4.47 9.04 4.47 8.49c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.204.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.491-.085.745-.576.745z"/>
                </svg>
              </a>
              <a
                href="https://max.ru/join/t71ZcnlfuCESMrQtoECowhw-SLuwDrERP6GR5LNMj0Y"
                target="_blank"
                rel="noopener noreferrer"
                title="MAX"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-background/10 hover:bg-background/20 text-background/60 hover:text-background transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.5 16.5h-2.25l-2.25-3-2.25 3H7.5l3.375-4.5L7.5 7.5h2.25l2.25 3 2.25-3h2.25l-3.375 4.5L16.5 16.5z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-background/10 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-background/40">
            © {currentYear} ИП Чикин Дмитрий Сергеевич. ИНН 771916365140
          </p>
          <Link
            to="/privacy"
            className="text-xs text-background/40 hover:text-background/70 transition-colors underline underline-offset-2"
          >
            Политика конфиденциальности
          </Link>
        </div>
      </div>
    </footer>
  );
}