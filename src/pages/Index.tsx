export default function Index() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="relative h-screen">
        <img 
          src="https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/248a9bc4-58d3-4fe1-91bf-87b900ec084a.jpg"
          alt="СПАРКОМ"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/70" />
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h1 className="text-5xl md:text-7xl font-semibold text-white mb-8 leading-tight tracking-tight">
              СПАРКОМ — закрытый<br />банный клуб
            </h1>
            <p className="text-xl md:text-2xl text-neutral-200 mb-12 font-light">
              Регулярные офлайн-встречи по фиксированному регламенту.
            </p>
            <p className="text-xs text-neutral-400 uppercase tracking-widest">
              Этот сайт описывает устройство системы. Не является приглашением.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-32">
        
        <section className="mb-32">
          <h2 className="text-4xl font-semibold text-neutral-900 mb-12 tracking-tight">
            Что такое СПАРКОМ
          </h2>
          <div className="space-y-6 text-lg text-neutral-700 leading-relaxed">
            <p>
              СПАРКОМ — это повторяемый формат банных встреч.
            </p>
            <p>
              Он построен как система с заранее заданными правилами, а не как услуга или событие.
            </p>
            <p className="font-medium text-neutral-900 mt-10 mb-4">В формате определены:</p>
            <ul className="space-y-3 pl-6">
              <li className="text-neutral-700">порядок проведения</li>
              <li className="text-neutral-700">допустимое поведение</li>
              <li className="text-neutral-700">экономическая модель</li>
            </ul>
          </div>
        </section>

        <section className="mb-32 py-16 border-y border-neutral-300">
          <h2 className="text-4xl font-semibold text-neutral-900 mb-12 tracking-tight">
            Чего здесь нет
          </h2>
          <div className="space-y-4 text-lg text-neutral-700">
            <p>В СПАРКОМ отсутствует:</p>
            <ul className="space-y-3 pl-6 mt-6">
              <li>сервисное обслуживание</li>
              <li>развлекательные элементы</li>
              <li>нетворкинг</li>
              <li>гибкие договорённости</li>
            </ul>
            <p className="mt-10 font-medium text-neutral-900">
              Формат не адаптируется под участника.
            </p>
          </div>
        </section>

        <section className="mb-32">
          <h2 className="text-4xl font-semibold text-neutral-900 mb-12 tracking-tight">
            Как проходит встреча
          </h2>
          <p className="text-lg text-neutral-700 mb-10">
            Каждая встреча проходит по одному алгоритму:
          </p>
          <div className="space-y-1 text-lg text-neutral-700">
            <p>1. Сбор участников в назначенное время</p>
            <p>2. Инструктаж</p>
            <p>3. Парения по таймеру</p>
            <p>4. Завершение без продлений</p>
          </div>
          <p className="mt-10 text-lg text-neutral-700">
            Начало и окончание фиксированы.
          </p>
        </section>

        <section className="mb-32">
          <h2 className="text-4xl font-semibold text-neutral-900 mb-12 tracking-tight">
            Форматы встреч
          </h2>
          <p className="text-lg text-neutral-700 mb-12">
            Формат определяет состав участников и правила.
          </p>

          <div className="space-y-10">
            <div>
              <h3 className="text-2xl font-medium text-neutral-900 mb-2">Мужской пар</h3>
              <p className="text-neutral-600">Состав: только мужчины.</p>
            </div>

            <div>
              <h3 className="text-2xl font-medium text-neutral-900 mb-2">Совместная сессия</h3>
              <p className="text-neutral-600">Состав: мужчины и женщины.</p>
            </div>

            <div>
              <h3 className="text-2xl font-medium text-neutral-900 mb-2">Женская сессия</h3>
              <p className="text-neutral-600">Состав: только женщины.</p>
            </div>

            <div>
              <h3 className="text-2xl font-medium text-neutral-900 mb-2">Сессия с пармастером</h3>
              <p className="text-neutral-600">Состав определяется регламентом встречи.</p>
            </div>
          </div>

          <p className="mt-12 text-lg text-neutral-700">
            Форматы не меняются в процессе.
          </p>
        </section>

        <section className="mb-32 bg-neutral-900 text-white -mx-6 px-6 md:-mx-0 md:px-16 py-16">
          <h2 className="text-4xl font-semibold mb-12 tracking-tight">
            Правила участия
          </h2>
          <p className="text-lg text-neutral-200 mb-10">
            Участие возможно только при согласии с регламентом.
          </p>
          
          <p className="font-medium text-lg mb-6">Ключевые правила:</p>
          <ul className="space-y-3 text-lg text-neutral-200 pl-6">
            <li>пунктуальность обязательна</li>
            <li>инструкции организатора обязательны</li>
            <li>давление на общение исключено</li>
          </ul>
          
          <p className="mt-10 text-lg text-neutral-300">
            Нарушения не обсуждаются.
          </p>
        </section>

        <section className="mb-32">
          <h2 className="text-4xl font-semibold text-neutral-900 mb-12 tracking-tight">
            Экономическая модель
          </h2>
          <p className="text-lg text-neutral-700 mb-8">
            СПАРКОМ работает в формате складчины.
          </p>
          <p className="text-lg text-neutral-700 mb-8">
            Участники совместно покрывают аренду пространства. Клуб не продаёт услугу.
          </p>
          <p className="text-lg text-neutral-700">
            Индивидуальные ожидания сервиса исключены.
          </p>
        </section>

        <section className="mb-32 py-16 border-y border-neutral-300">
          <h2 className="text-4xl font-semibold text-neutral-900 mb-12 tracking-tight">
            Кому формат подходит
          </h2>
          
          <p className="text-lg text-neutral-700 mb-6">Подходит тем, кто:</p>
          <ul className="space-y-3 text-lg text-neutral-700 pl-6 mb-12">
            <li>ценит порядок</li>
            <li>не ищет сервиса</li>
            <li>комфортно чувствует себя в тишине</li>
          </ul>

          <p className="text-lg text-neutral-700 mb-6">Не подходит тем, кто:</p>
          <ul className="space-y-3 text-lg text-neutral-700 pl-6">
            <li>ожидает внимания</li>
            <li>ищет эмоции</li>
          </ul>
        </section>

        <section className="text-center py-16">
          <h2 className="text-4xl font-semibold text-neutral-900 mb-10 tracking-tight">
            Завершение
          </h2>
          <p className="text-lg text-neutral-700 mb-6">
            Ознакомление с системой завершено.
          </p>
          <p className="text-lg text-neutral-700 mb-6">
            Дальнейшие шаги описываются отдельно.
          </p>
          <p className="text-lg text-neutral-700">
            Решение принимается самостоятельно.
          </p>
        </section>

      </div>
    </div>
  );
}
