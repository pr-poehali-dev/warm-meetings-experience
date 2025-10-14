import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

const Philosophy = () => {
  return (
    <div className="min-h-screen bg-nature-cream/30">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-8 text-nature-forest hover:text-nature-brown">
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            На главную
          </Button>
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-serif text-nature-forest mb-6">
              Философия доверия
            </h1>
            <p className="text-xl text-nature-forest/70 italic">
              Почему "Тёплые встречи" остаются личным пространством
            </p>
          </div>

          <div className="space-y-12 text-nature-forest/80 leading-relaxed">
            <section>
              <h2 className="text-3xl font-serif text-nature-forest mb-4">1. Мы бережём тишину</h2>
              <p className="mb-4">
                Каждая "Тёплая встреча" — это момент интимного доверия.
                Мы не снимаем и не публикуем фотографии или видео с участием гостей.
                То, что происходит в парной, остаётся между людьми, паром и теплом.
              </p>
              
              <p className="text-center italic text-nature-brown text-lg my-6">
                Здесь нет наблюдателей.<br />
                Только присутствие.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-serif text-nature-forest mb-4">2. Вместо лиц — смыслы</h2>
              <p className="mb-4">
                Все визуальные образы проекта создаются с помощью искусственного интеллекта.
                Это не реальные люди, а символы состояний — тепла, нежности, внимания, дыхания.
                Так мы сохраняем конфиденциальность участников и при этом передаём атмосферу бренда.
              </p>
              
              <p className="text-center italic text-nature-brown text-lg my-6">
                Мы не показываем лиц,<br />
                потому что чувства не нуждаются в доказательствах.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-serif text-nature-forest mb-4">3. Приватность и уважение</h2>
              <p className="mb-4">
                Мы не собираем личные фото, видео или интимные данные гостей.
                Любая информация, которую вы доверяете нам при бронировании,
                используется только для организации вашей встречи — и не передаётся третьим лицам.
              </p>
              
              <p className="mt-4">
                Ваше присутствие в "Тёплых встречах" всегда остаётся личным.
                Бережность к вашим границам — часть нашей культуры.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-serif text-nature-forest mb-4">4. Этичная визуализация</h2>
              <p>
                AI-образы, используемые в фото и видео проекта, создаются вручную, с вниманием к эстетике бренда:
                мягкий свет, природные текстуры, тепло дерева и пара.
                Они передают чувства, а не конкретных людей.
                Это наше видение красоты: в атмосфере, а не в лице.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-serif text-nature-forest mb-4">5. Контакт и доверие</h2>
              <p className="mb-4">
                Если у вас есть вопросы о конфиденциальности, визуальных материалах или вы хотите обсудить использование вашего опыта в проекте —
                пишите нам лично:
              </p>
              
              <div className="space-y-2 ml-4 mb-6">
                <p className="flex items-center gap-2">
                  <Icon name="Mail" size={18} className="text-nature-brown" />
                  <a href="mailto:info@sparcom.ru" className="hover:text-nature-brown transition-colors">info@sparcom.ru</a>
                </p>
                <p className="flex items-center gap-2">
                  <Icon name="Send" size={18} className="text-nature-brown" />
                  Telegram: 
                  <a href="https://t.me/banya_live" target="_blank" rel="noopener noreferrer" className="hover:text-nature-brown transition-colors">@banya_live</a>
                </p>
              </div>
              
              <p>
                Мы открыты к диалогу и всегда отвечаем с теплом.
              </p>
            </section>

            <div className="bg-nature-cream/50 rounded-lg p-8 my-8">
              <blockquote className="text-center space-y-4">
                <p className="text-xl italic text-nature-forest leading-relaxed">
                  «Баня — это не про жар, это про людей.<br />
                  Тело — проводник к душе,<br />
                  а тепло — мост между сердцами.»
                </p>
                <p className="text-nature-brown font-medium">
                  — Дмитрий Чикин
                </p>
              </blockquote>
            </div>

            <div className="border-t border-nature-forest/20 pt-8 text-center">
              <p className="text-xl text-nature-forest mb-4">💭 Эта страница — не политика. Это обещание.</p>
              <div className="space-y-2 text-lg">
                <p>Быть бережными.</p>
                <p>Сохранять доверие.</p>
                <p>Оставаться настоящими — даже в невидимости.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Philosophy;
