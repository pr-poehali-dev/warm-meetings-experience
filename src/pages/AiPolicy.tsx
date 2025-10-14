import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

const AiPolicy = () => {
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
          <div className="mb-8">
            <h1 className="text-4xl font-serif text-nature-forest mb-4 flex items-center gap-3">Политика использования AI-контента</h1>
            <p className="text-nature-forest/60">Обновлено: 14 октября 2025</p>
            <p className="text-nature-forest/80 mt-2">Проект "Тёплые встречи" основан пармастером Дмитрием Чикиным.</p>
          </div>

          <div className="space-y-8 text-nature-forest/80 leading-relaxed">
            <section>
              <h2 className="text-2xl font-serif text-nature-forest mb-4">1. Общие положения</h2>
              <p>
                Проект "Тёплые встречи" использует технологии искусственного интеллекта (AI) для создания визуальных и текстовых материалов, сопровождающих коммуникацию бренда.
                AI применяется исключительно в целях эстетического оформления, передачи атмосферы и раскрытия философии проекта, без отображения реальных участников встреч.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-nature-forest mb-4">2. Цель использования AI-контента</h2>
              <p className="mb-4">Использование AI-контента продиктовано двумя ключевыми принципами философии проекта:</p>
              
              <div className="space-y-4 ml-4">
                <div>
                  <h3 className="font-semibold text-nature-forest mb-2">Бережность и конфиденциальность:</h3>
                  <p>Личное пространство гостей остаётся неприкосновенным. Мы не используем фотографии, видео или изображения реальных людей.</p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-nature-forest mb-2">Эмоциональная символика:</h3>
                  <p>Искусственный интеллект помогает выразить чувства, состояния и смысл — без нарушения приватности. Образы, создаваемые AI, — это метафоры тепла, доверия и присутствия.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-nature-forest mb-4">3. Формы AI-контента</h2>
              <p className="mb-4">AI-технологии применяются в следующих форматах:</p>
              
              <ul className="list-disc ml-6 space-y-2">
                <li>Генерация изображений и видеоматериалов для сайта, социальных сетей и презентаций;</li>
                <li>Создание текстов, сопровождающих визуальные материалы (описания, подписи, афоризмы, сценарии);</li>
                <li>Разработка концептуальных визуальных метафор (пар, тепло, дерево, дыхание, прикосновение).</li>
              </ul>
              
              <p className="mt-4">Все материалы проходят ручную редактуру, чтобы сохранить человеческое ощущение тепла и смысла.</p>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-nature-forest mb-4">4. Этические принципы</h2>
              <p className="mb-4">Мы придерживаемся принципов осознанного и ответственного использования AI:</p>
              
              <div className="space-y-4 ml-4">
                <div>
                  <h3 className="font-semibold text-nature-forest mb-2">Без имитации реальных людей.</h3>
                  <p>Мы не создаём образы, которые можно спутать с конкретными гостями или персоной.</p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-nature-forest mb-2">Без искажений человеческого достоинства.</h3>
                  <p>Все визуалы созданы в духе уважения, мягкости и внутренней гармонии.</p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-nature-forest mb-2">Без манипуляции и дезинформации.</h3>
                  <p>AI используется как инструмент искусства, а не подмена реальности.</p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-nature-forest mb-2">Человеческое участие в каждом этапе.</h3>
                  <p>Все решения о контенте принимаются вручную, с вниманием и доверием к философии бренда.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-nature-forest mb-4">5. Авторство и права</h2>
              <p>
                Все AI-изображения и тексты, созданные для "Тёплых встреч", являются интеллектуальной собственностью проекта.
                Их использование вне контекста бренда возможно только с письменного разрешения автора — Дмитрия Чикина или уполномоченных представителей.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-nature-forest mb-4">6. Прозрачность и доверие</h2>
              <p className="mb-4">
                Мы открыто заявляем, где используется AI, чтобы сохранить прозрачность коммуникации.
                Если вы видите визуал или текст, созданный искусственным интеллектом, — это всегда отражение атмосферы, а не реального события.
              </p>
              
              <p className="italic text-nature-brown text-center text-lg my-6">
                Мы не прячем реальность — мы выражаем её через смысл.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif text-nature-forest mb-4">7. Контакты</h2>
              <p className="mb-4">Если у вас есть вопросы об использовании AI-контента, обратная связь доступна по адресу:</p>
              
              <div className="space-y-2 ml-4">
                <p className="flex items-center gap-2">
                  <Icon name="Mail" size={18} className="text-nature-brown" />
                  <a href="mailto:info@sparcom.ru" className="hover:text-nature-brown transition-colors">info@sparcom.ru</a>
                </p>
                <p className="flex items-center gap-2">
                  <Icon name="Send" size={18} className="text-nature-brown" />
                  или через Telegram: 
                  <a href="https://t.me/banya_live" target="_blank" rel="noopener noreferrer" className="hover:text-nature-brown transition-colors">@banya_live</a>
                </p>
              </div>
            </section>

            <div className="bg-nature-cream/50 rounded-lg p-6 mt-8">
              <p className="text-center italic text-nature-forest">
                "Тёплые встречи" — это пространство, где технологии служат не для подмены реальности,<br />
                а для того, чтобы сохранить её сокровенную тишину.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiPolicy;