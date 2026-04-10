import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { User } from "@/lib/user-api";
import { TELEGRAM_URL } from "@/lib/constants";

interface HeroSectionProps {
  user: User | null;
  onScrollDown: () => void;
}

export default function HeroSection({ user, onScrollDown }: HeroSectionProps) {
  return (
    <section data-hero className="relative h-screen flex items-center justify-center">
      <img 
        src="https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/69533be6-e8cd-4137-89eb-a06d187922f4.jpg"
        alt="Спокойная пустая баня"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight">
          В баню можно идти одному.
        </h1>
        <p className="text-xl md:text-2xl text-white/90 mb-12 font-light max-w-2xl mx-auto">
          Если хочется нормальной бани, но не с кем — это не проблема. СПАРКОМ существует именно для таких ситуаций.
        </p>
        
        <div className="mb-16 w-full max-w-md mx-auto px-4">
          <Button
            size="lg"
            className="rounded-full text-base sm:text-lg px-6 sm:px-8 w-full h-auto py-4 bg-primary hover:bg-primary/90"
            onClick={() => window.open(TELEGRAM_URL, '_blank')}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
            <span className="truncate">Расписание встреч в Telegram</span>
          </Button>
        </div>
        
        <button 
          onClick={onScrollDown}
          className="animate-bounce text-white/80 hover:text-white transition-colors"
          aria-label="Прокрутить вниз"
        >
          <Icon name="ChevronDown" size={48} />
        </button>
      </div>
    </section>
  );
}