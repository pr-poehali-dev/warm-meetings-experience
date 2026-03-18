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
            <div className="flex flex-col gap-2">
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
