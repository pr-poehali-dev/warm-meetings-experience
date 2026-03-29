import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import Footer from "@/components/Footer";
import { appendices } from "./terms/termsAppendices";
import TermsAppendixModal from "./terms/TermsAppendixModal";
import TermsContent from "./terms/TermsContent";

export default function Terms() {
  const [openAppendix, setOpenAppendix] = useState<number | null>(null);
  const activeAppendix = appendices.find((a) => a.id === openAppendix);

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
          Правила сайта и сообщества «СПАРКОМ»
        </h1>
        <p className="text-sm text-muted-foreground mb-1">
          Пользовательское соглашение + Правила сообщества
        </p>
        <p className="text-sm text-muted-foreground mb-10">
          Версия от 30 марта 2026 г. Действуют с 30 марта 2026 г.
        </p>

        <nav className="bg-muted rounded-lg p-4 mb-10 text-sm">
          <p className="font-semibold mb-3">Содержание</p>
          <ol className="space-y-1 list-decimal list-inside text-muted-foreground">
            <li><a href="#part1" className="hover:text-foreground transition-colors">Часть I. Общие положения</a></li>
            <li><a href="#part2" className="hover:text-foreground transition-colors">Часть II. Регистрация и верификация</a></li>
            <li><a href="#part3" className="hover:text-foreground transition-colors">Часть III. Правила сообщества</a></li>
            <li><a href="#part4" className="hover:text-foreground transition-colors">Часть IV. Создание и проведение мероприятий</a></li>
            <li><a href="#part5" className="hover:text-foreground transition-colors">Часть V. Финансы, комиссии, кошелёк</a></li>
            <li><a href="#part6" className="hover:text-foreground transition-colors">Часть VI. Ответственность, арбитраж, блокировки</a></li>
            <li><a href="#part7" className="hover:text-foreground transition-colors">Часть VII. Интеллектуальная собственность</a></li>
            <li><a href="#part8" className="hover:text-foreground transition-colors">Часть VIII. Заключительные положения</a></li>
          </ol>
        </nav>

        <TermsContent onOpenAppendix={setOpenAppendix} />
      </div>
      <Footer />

      {openAppendix !== null && activeAppendix && (
        <TermsAppendixModal
          appendix={activeAppendix}
          onClose={() => setOpenAppendix(null)}
        />
      )}
    </div>
  );
}
