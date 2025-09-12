import { Button } from "@/components/ui/button";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60"
        style={{
          backgroundImage: `url('/img/6f1b0345-c153-4c3c-b7a3-589f1835b717.jpg')`
        }}
      />
      <div className="absolute inset-0 bg-nature-forest/40" />
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto animate-fade-in">
        <h1 className="text-6xl md:text-8xl font-serif font-light text-nature-cream mb-6">
          Встречайте.
        </h1>
        <p className="text-xl md:text-2xl text-nature-cream/90 mb-8 max-w-2xl mx-auto leading-relaxed">
          Себя — через тишину и пар. Других — через искренность и доверие. 
          Жизнь — через её простые и вечные ритуалы.
        </p>
        <Button 
          size="lg" 
          className="bg-nature-brown hover:bg-nature-brown/90 text-nature-cream text-lg px-8 py-4 rounded-full transition-all duration-300 hover:scale-105"
        >
          Войти в пространство
        </Button>
      </div>
    </section>
  );
}