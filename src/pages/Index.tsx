import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
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

      {/* Manifesto Section */}
      <section className="py-20 px-6 bg-nature-cream">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-serif font-light text-nature-forest mb-12">
            Здесь нет случайных гостей.
          </h2>
          <div className="prose prose-lg max-w-3xl mx-auto text-nature-forest/80 leading-relaxed">
            <p className="text-xl mb-6">
              «Это место родилось из моей уверенности, что настоящая встреча — это искусство, 
              которое мы почти забыли.
            </p>
            <p className="text-xl mb-6">
              Я, Дмитрий Чикин, создал «Тёплые Встречи» не как сервис, а как дверь в то состояние, 
              где время замедляется, маски остаются на вешалке, а диалог течёт как медленный, глубокий пар.
            </p>
            <p className="text-xl font-medium text-nature-forest">
              Если вы ищете не просто баню, а место силы для общения — вы пришли по адресу.»
            </p>
          </div>
        </div>
      </section>

      {/* Principles Section */}
      <section className="py-20 px-6 bg-nature-beige">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-serif font-light text-nature-forest text-center mb-16">
            Не правила, а моя философия общения.
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-nature-cream border-nature-brown/20 hover:shadow-lg transition-all duration-300 hover:scale-105">
              <CardContent className="p-8 text-center">
                <Icon name="Shield" size={48} className="text-nature-brown mx-auto mb-6" />
                <h3 className="text-xl font-serif font-medium text-nature-forest mb-4">
                  Безопасность выше всего
                </h3>
                <p className="text-nature-forest/70 leading-relaxed">
                  Здесь можно быть тихим, уставшим, уязвимым. Здесь не учат и не оценивают.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-nature-cream border-nature-brown/20 hover:shadow-lg transition-all duration-300 hover:scale-105">
              <CardContent className="p-8 text-center">
                <Icon name="Heart" size={48} className="text-nature-brown mx-auto mb-6" />
                <h3 className="text-xl font-serif font-medium text-nature-forest mb-4">
                  Глубина, а не интенсивность
                </h3>
                <p className="text-nature-forest/70 leading-relaxed">
                  Мы не гонимся за жаром. Мы идём к сути — ваших чувств, ваших мыслей, вашей связи с другими.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-nature-cream border-nature-brown/20 hover:shadow-lg transition-all duration-300 hover:scale-105">
              <CardContent className="p-8 text-center">
                <Icon name="Leaf" size={48} className="text-nature-brown mx-auto mb-6" />
                <h3 className="text-xl font-serif font-medium text-nature-forest mb-4">
                  Ритуал как язык
                </h3>
                <p className="text-nature-forest/70 leading-relaxed">
                  Совместное приготовление пара, чайная церемония, молчаливое парение — это наш способ говорить без слов.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* States/Formats Section */}
      <section className="py-20 px-6 bg-nature-forest">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-serif font-light text-nature-cream text-center mb-16">
            В каком состоянии вы хотите встретиться?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-nature-cream/95 border-nature-brown/20 hover:shadow-lg transition-all duration-300 hover:scale-105">
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <Icon name="Users" size={32} className="text-nature-brown mr-3" />
                  <span className="text-sm text-nature-brown font-medium uppercase tracking-wide">
                    Состояние
                  </span>
                </div>
                <h3 className="text-2xl font-serif font-medium text-nature-forest mb-3">
                  Искренность
                </h3>
                <p className="text-nature-forest/60 text-sm mb-4 italic">
                  Тёплые Знакомства
                </p>
                <p className="text-nature-forest/80 mb-4">
                  Для тех, кто устал от масок и хочет услышать и быть услышанным.
                </p>
                <p className="text-sm text-nature-brown italic">
                  «Знакомство, которое начинается с сердца, а не с профиля в соцсети.»
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-nature-cream/95 border-nature-brown/20 hover:shadow-lg transition-all duration-300 hover:scale-105">
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <Icon name="HandHeart" size={32} className="text-nature-brown mr-3" />
                  <span className="text-sm text-nature-brown font-medium uppercase tracking-wide">
                    Состояние
                  </span>
                </div>
                <h3 className="text-2xl font-serif font-medium text-nature-forest mb-3">
                  Доверие
                </h3>
                <p className="text-nature-forest/60 text-sm mb-4 italic">
                  Тёплый Тимбилдинг
                </p>
                <p className="text-nature-forest/80 mb-4">
                  Для команд, которые хотят стать не коллегами, а сплочённым кругом.
                </p>
                <p className="text-sm text-nature-brown italic">
                  «Где руководитель и стажёр встречаются как равные у общего пара.»
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-nature-cream/95 border-nature-brown/20 hover:shadow-lg transition-all duration-300 hover:scale-105">
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <Icon name="Heart" size={32} className="text-nature-brown mr-3" />
                  <span className="text-sm text-nature-brown font-medium uppercase tracking-wide">
                    Состояние
                  </span>
                </div>
                <h3 className="text-2xl font-serif font-medium text-nature-forest mb-3">
                  Близость
                </h3>
                <p className="text-nature-forest/60 text-sm mb-4 italic">
                  Тёплые Свидания
                </p>
                <p className="text-nature-forest/80 mb-4">
                  Для пар, которые хотят говорить на языке прикосновений и тишины.
                </p>
                <p className="text-sm text-nature-brown italic">
                  «Свидание, которое вернёт вас от гаджетов — друг к другу.»
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Personal Story Section */}
      <section className="py-20 px-6 bg-nature-cream">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <h2 className="text-4xl md:text-5xl font-serif font-light text-nature-forest mb-8">
                Почему я веду вас в этот ритуал?
              </h2>
              <div className="space-y-6 text-lg text-nature-forest/80 leading-relaxed">
                <p>Я не «услуга». Я проводник.</p>
                <p>
                  Мои руки помнят узлы тысячи веников, а сердце — истории сотен встреч.
                </p>
                <p>
                  Я верю, что пар смывает не только токсины, но и шелуху суеты, 
                  обнажая наше настоящее «Я».
                </p>
                <p className="font-medium text-nature-forest">
                  Моя миссия — дать вам пространство, где вы сможете встретиться с собой и другими без страха и оценок.
                </p>
                <p className="text-nature-brown font-medium italic">
                  Ваша трансформация — мой главный результат.
                </p>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <img 
                src="/img/60de1bde-6350-4f98-8a25-5b5f9377d361.jpg"
                alt="Дмитрий Чикин"
                className="w-full rounded-2xl shadow-lg animate-scale-in"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Atmosphere Gallery */}
      <section className="py-20 px-6 bg-nature-beige">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-serif font-light text-nature-forest mb-16">
            Атмосфера встреч
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="aspect-square bg-nature-cream rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <img 
                src="/img/ac26bab8-6d80-4a7f-8e75-3413d651f39c.jpg"
                alt="Чайная церемония"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="aspect-square bg-nature-cream rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <img 
                src="/img/6f1b0345-c153-4c3c-b7a3-589f1835b717.jpg"
                alt="Пространство сауны"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="aspect-square bg-nature-cream rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="text-center p-8">
                <Icon name="Camera" size={48} className="text-nature-brown mx-auto mb-4" />
                <p className="text-nature-forest/60 italic">
                  Моменты истинной близости<br />
                  живут в сердце, а не в кадре
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-6 bg-nature-forest">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-serif font-light text-nature-cream mb-16">
            Истории трансформаций
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-nature-cream/95 border-nature-brown/20">
              <CardContent className="p-8">
                <Icon name="Quote" size={32} className="text-nature-brown mb-4" />
                <p className="text-nature-forest/80 italic mb-6 leading-relaxed">
                  «После вечера я не просто познакомился с людьми, я вспомнил, 
                  каково это — общаться без фона, без спешки, просто быть с другими людьми.»
                </p>
                <p className="text-nature-brown font-medium">— Михаил</p>
              </CardContent>
            </Card>
            
            <Card className="bg-nature-cream/95 border-nature-brown/20">
              <CardContent className="p-8">
                <Icon name="Quote" size={32} className="text-nature-brown mb-4" />
                <p className="text-nature-forest/80 italic mb-6 leading-relaxed">
                  «Наша команда открыла друг друга заново. Мы стали не просто коллегами, 
                  а людьми, которые доверяют и понимают друг друга.»
                </p>
                <p className="text-nature-brown font-medium">— Елена</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 px-6 bg-nature-cream">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-light text-nature-forest mb-8">
            Готовы сделать шаг к настоящему?
          </h2>
          <p className="text-xl text-nature-forest/80 mb-12 max-w-2xl mx-auto leading-relaxed">
            Если мои слова отозвались в вас — напишите мне. Даже если вы ещё не готовы записаться. 
            Давайте просто поговорим.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg"
              className="bg-nature-brown hover:bg-nature-brown/90 text-nature-cream px-8 py-4 rounded-full transition-all duration-300 hover:scale-105"
            >
              <Icon name="MessageCircle" size={20} className="mr-2" />
              Написать в Telegram
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-nature-brown text-nature-brown hover:bg-nature-brown hover:text-nature-cream px-8 py-4 rounded-full transition-all duration-300 hover:scale-105"
            >
              <Icon name="Users" size={20} className="mr-2" />
              Обсудить тимбилдинг
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}