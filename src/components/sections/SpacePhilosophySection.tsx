export default function SpacePhilosophySection() {
  return (
    <section className="py-20 px-6 bg-nature-cream">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-serif font-light text-nature-forest text-center mb-16">
          Пространство — это соучастник вашей встречи.
        </h2>
        
        {/* Image Gallery */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <img 
              src="/img/793ab544-a037-461e-be0d-1a0f001c917c.jpg"
              alt="Уютная деревянная баня на природе"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <img 
              src="/img/137b686f-1265-406b-8de8-9e99169ca7bb.jpg"
              alt="Современная городская сауна"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <img 
              src="/img/8771c2a3-1f4d-4f37-aa4a-37274ca567ac.jpg"
              alt="Вид из окна бани на лес"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Philosophy Text */}
        <div className="max-w-4xl mx-auto">
          <div className="text-lg text-nature-forest/80 leading-relaxed space-y-6">
            <p>
              «Я не работаю в одной локации. Я убеждён, что атмосфера места — это не просто декорация, 
              а важнейший участник диалога.
            </p>
            <p>Поэтому я лично подбираю баню под характер каждой встречи:</p>
            
            <div className="bg-nature-beige/50 p-6 rounded-xl space-y-4 my-8">
              <p>
                <span className="font-medium text-nature-forest">Для глубокого погружения в себя и тихих диалогов</span> — 
                я выбираю уединённые загородные пространства, где слышно только треск поленьев и пение птиц.
              </p>
              <p>
                <span className="font-medium text-nature-forest">Для динамичного бизнес-нетворкинга</span> — 
                мы встречаемся в современных, удобно расположенных банных клубах в городе, где всё под рукой.
              </p>
              <p>
                <span className="font-medium text-nature-forest">Для интимных романтических свиданий</span> — 
                я нахожу только самые уютные и эстетичные места, где каждая деталь работает на создание вашей общей истории.
              </p>
            </div>

            <p>
              Ваш комфорт и ваша задача — главный ориентир. Стоимость аренды уже включена в ценность всего ритуала. 
              Моя задача — предложить вам именно ту среду, которая раскроет вас наилучшим образом, 
              будь то эко-домик у озера или премиальный лаунж-клуб.
            </p>
            <p className="text-nature-brown font-medium italic">
              Каждое место я проверяю лично на энергетику, чистоту и соответствие моим стандартам глубокого присутствия.»
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}