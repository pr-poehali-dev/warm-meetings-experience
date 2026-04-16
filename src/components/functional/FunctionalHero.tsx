import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

export default function FunctionalHero() {
  return (
    <div className="bg-muted/40 border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
        >
          <Icon name="ArrowLeft" size={14} />
          На главную
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          Документация на программное обеспечение «СПАРКОМ»
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl">
          Функциональные характеристики и сведения об эксплуатации платформы
        </p>
      </div>
    </div>
  );
}
