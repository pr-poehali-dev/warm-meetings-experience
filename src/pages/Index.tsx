import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

export default function Index() {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Первый экран */}
      <div className="relative h-screen">
        <img 
          src="https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/f124df2d-155a-4e4b-b44a-0835994f0319.jpg"
          alt="SPARCOM"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              SPARCOM — банный клуб<br />с жёстким регламентом
            </h1>
            <p className="text-xl md:text-2xl text-neutral-200 mb-8">
              Регулярные офлайн-встречи по фиксированным правилам.
            </p>
            <p className="text-sm text-neutral-300 border border-neutral-400 inline-block px-4 py-2 rounded">
              Этот сайт описывает устройство системы. Не является приглашением.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 max-w-5xl">
        
        {/* Что такое SPARCOM */}
        <section className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-8">
            Что такое SPARCOM
          </h2>
          <div className="space-y-4 text-lg text-neutral-700 leading-relaxed">
            <p>
              SPARCOM — это офлайн-клуб с регулярными банными встречами.
              Он устроен как повторяемая система, а не как сервис или сообщество по интересам.
            </p>
            <p className="font-medium text-neutral-900 mt-6">В системе заранее определены:</p>
            <ul className="space-y-2 ml-6">
              <li className="flex items-start gap-3">
                <span className="text-neutral-400 mt-1">•</span>
                <span>форматы встреч</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-neutral-400 mt-1">•</span>
                <span>правила участия</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-neutral-400 mt-1">•</span>
                <span>порядок проведения</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-neutral-400 mt-1">•</span>
                <span>ограничения</span>
              </li>
            </ul>
            <p className="mt-6">
              Импровизация и подстройка под ожидания участников исключены.
            </p>
          </div>
        </section>

        {/* Чего здесь нет */}
        <section className="mb-20 bg-neutral-100 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-8">
            Чего здесь нет
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              'развлекательная программа',
              'знакомства как цель',
              'ведущие и анимация',
              'тосты, музыка, событийный формат',
              'гибкие договорённости'
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3 text-lg text-neutral-700">
                <Icon name="X" size={20} className="text-neutral-400 flex-shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <p className="mt-8 text-lg text-neutral-700 font-medium">
            Тишина и порядок являются частью регламента.
          </p>
        </section>

        {/* Форматы встреч */}
        <section className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
            Форматы встреч
          </h2>
          <p className="text-lg text-neutral-700 mb-12 leading-relaxed">
            В SPARCOM используется несколько фиксированных форматов.
            Формат определяет состав участников, правила поведения и порядок проведения.
          </p>

          <div className="space-y-8">
            {/* Мужской пар */}
            <div className="border-l-4 border-neutral-800 pl-6">
              <h3 className="text-2xl font-bold text-neutral-900 mb-2">Мужской пар</h3>
              <p className="text-neutral-600 mb-4">Состав: только мужчины.</p>
              
              <p className="font-medium text-neutral-900 mb-3">Особенности:</p>
              <ul className="space-y-2 mb-4">
                {[
                  'ограниченное количество участников',
                  'равные условия для всех',
                  'отсутствие развлекательных элементов',
                  'разговоры допустимы, но не обязательны'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-neutral-700">
                    <span className="text-neutral-400 mt-1">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p className="font-medium text-neutral-900 mb-3">Формат не предполагает:</p>
              <ul className="space-y-2">
                {[
                  'групповых практик',
                  'психологических сессий',
                  'ведущих кругов общения'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-neutral-700">
                    <span className="text-neutral-400 mt-1">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Совместная сессия */}
            <div className="border-l-4 border-neutral-800 pl-6">
              <h3 className="text-2xl font-bold text-neutral-900 mb-2">Совместная сессия</h3>
              <p className="text-neutral-600 mb-4">Состав: мужчины и женщины.</p>
              
              <p className="font-medium text-neutral-900 mb-3">Особенности:</p>
              <ul className="space-y-2 mb-4">
                {[
                  'фиксированный регламент',
                  'стандартный порядок парений',
                  'общий темп для всех участников'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-neutral-700">
                    <span className="text-neutral-400 mt-1">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p className="font-medium text-neutral-900 mb-3">Формат не предназначен для:</p>
              <ul className="space-y-2">
                {[
                  'знакомств как цели',
                  'свободного общения без правил',
                  'событийного формата'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-neutral-700">
                    <span className="text-neutral-400 mt-1">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Женская сессия */}
            <div className="border-l-4 border-neutral-800 pl-6">
              <h3 className="text-2xl font-bold text-neutral-900 mb-2">Женская сессия</h3>
              <p className="text-neutral-600 mb-4">Состав: только женщины.</p>
              
              <p className="font-medium text-neutral-900 mb-3">Особенности:</p>
              <ul className="space-y-2 mb-4">
                {[
                  'ограниченный состав',
                  'спокойный ритм',
                  'отсутствие смешанных групп'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-neutral-700">
                    <span className="text-neutral-400 mt-1">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p className="font-medium text-neutral-900 mb-3">Формат не включает:</p>
              <ul className="space-y-2">
                {[
                  'терапевтические практики',
                  'обещания детокса или восстановления'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-neutral-700">
                    <span className="text-neutral-400 mt-1">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Сессия с пармастером */}
            <div className="border-l-4 border-neutral-800 pl-6">
              <h3 className="text-2xl font-bold text-neutral-900 mb-2">Сессия с пармастером</h3>
              <p className="text-neutral-600 mb-4">Состав: определяется регламентом конкретной встречи.</p>
              
              <p className="font-medium text-neutral-900 mb-3">Особенности:</p>
              <ul className="space-y-2 mb-4">
                {[
                  'заданный сценарий',
                  'работа с техникой парения',
                  'минимальное количество отвлекающих факторов'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-neutral-700">
                    <span className="text-neutral-400 mt-1">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p className="font-medium text-neutral-900 mb-3">Формат не является:</p>
              <ul className="space-y-2">
                {[
                  'обучающим курсом',
                  'индивидуальной услугой',
                  'шоу или представлением'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-neutral-700">
                    <span className="text-neutral-400 mt-1">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Как проходят встречи */}
        <section className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-8">
            Как проходят встречи
          </h2>
          <p className="text-lg text-neutral-700 mb-6 leading-relaxed">
            Каждая встреча проходит по одному принципу:
          </p>
          <div className="space-y-4">
            {[
              { num: '1', text: 'Сбор участников в назначенное время' },
              { num: '2', text: 'Краткий инструктаж' },
              { num: '3', text: 'Парения по таймеру' },
              { num: '4', text: 'Завершение без продлений' }
            ].map((item) => (
              <div key={item.num} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-neutral-900 text-white rounded-lg flex items-center justify-center font-bold">
                  {item.num}
                </div>
                <p className="text-lg text-neutral-700 pt-2">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 space-y-2 text-lg text-neutral-700">
            <p>Начало и окончание фиксированы.</p>
            <p>Опоздания не компенсируются.</p>
          </div>
        </section>

        {/* Правила участия */}
        <section className="mb-20 bg-neutral-900 text-white rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Правила участия
          </h2>
          <p className="text-lg text-neutral-200 mb-8 leading-relaxed">
            Участие возможно только при полном согласии с регламентом.
          </p>
          
          <p className="font-medium text-xl mb-6">Ключевые принципы:</p>
          <div className="space-y-4">
            {[
              'пунктуальность обязательна',
              'соблюдение инструкций организатора',
              'уважение к пространству и другим участникам',
              'отсутствие давления на общение'
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 text-lg text-neutral-200">
                <Icon name="Check" size={24} className="text-white flex-shrink-0 mt-1" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          
          <p className="mt-8 text-lg text-neutral-300 font-medium">
            Нарушения правил не обсуждаются и не компенсируются.
          </p>
        </section>

        {/* Экономическая модель */}
        <section className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-8">
            Экономическая модель
          </h2>
          <p className="text-lg text-neutral-700 mb-6 leading-relaxed">
            SPARCOM работает в формате складчины.
          </p>
          
          <p className="font-medium text-neutral-900 mb-4 text-lg">Это означает:</p>
          <div className="space-y-3 text-lg text-neutral-700">
            <div className="flex items-start gap-3">
              <span className="text-neutral-400 mt-1">•</span>
              <span>участники совместно покрывают аренду пространства</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-neutral-400 mt-1">•</span>
              <span>клуб не продаёт услугу</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-neutral-400 mt-1">•</span>
              <span>стоимость делится между участниками конкретной встречи</span>
            </div>
          </div>
          
          <p className="mt-6 text-lg text-neutral-700">
            Формат исключает индивидуальные ожидания сервиса.
          </p>
        </section>

        {/* Кому формат подходит */}
        <section className="mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-8">
            Кому формат подходит
          </h2>
          <p className="text-lg text-neutral-700 mb-6 leading-relaxed">
            SPARCOM подходит тем, кто:
          </p>
          <div className="space-y-4 mb-8">
            {[
              'ценит порядок выше впечатлений',
              'предпочитает правила договорённостям',
              'комфортно чувствует себя в тишине'
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 text-lg text-neutral-700">
                <Icon name="Circle" size={8} className="text-neutral-900 flex-shrink-0 mt-3" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <p className="text-lg text-neutral-700">
            Если важны эмоции, внимание и гибкость — формат, скорее всего, не подойдёт.
          </p>
        </section>

        {/* Завершение */}
        <section className="text-center py-12">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
              Завершение
            </h2>
            <p className="text-lg text-neutral-700 leading-relaxed mb-4">
              После ознакомления с системой решение о дальнейшем участии принимается самостоятельно.
            </p>
            <p className="text-lg text-neutral-700">
              Сайт выполняет свою функцию на этом этапе.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
