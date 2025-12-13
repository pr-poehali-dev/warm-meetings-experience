import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="relative h-[400px] md:h-[500px]">
              <img 
                src="https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/6fd24a72-02fc-4cda-83de-446e40255358.jpg"
                alt="Банное сообщество"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              
              <div className="absolute top-6 left-6">
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <Icon name="Heart" size={28} className="text-orange-600" />
                    <span className="text-2xl font-bold text-gray-900">Банный клуб</span>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-3 md:mb-4 leading-tight">
                  Качественный банный отдых<br />для всех
                </h1>
                <p className="text-lg md:text-xl text-white/90 max-w-2xl">
                  Сообщество, где доступность встречается с традициями
                </p>
              </div>
            </div>

            <div className="p-6 md:p-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-10">
                <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-orange-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mb-4">
                    <Icon name="Users" size={24} className="text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">Делим аренду</h3>
                  <p className="text-gray-700 text-sm">
                    Участники клуба совместно арендуют лучшие бани — качественно и доступно
                  </p>
                </div>

                <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-orange-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mb-4">
                    <Icon name="Sparkles" size={24} className="text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">Мастера ритуалов</h3>
                  <p className="text-gray-700 text-sm">
                    Профессиональные парильщики проводят настоящие банные церемонии
                  </p>
                </div>

                <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-orange-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mb-4">
                    <Icon name="Heart" size={24} className="text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">Душевная атмосфера</h3>
                  <p className="text-gray-700 text-sm">
                    Здоровье, поддержка и новые друзья в тёплой компании единомышленников
                  </p>
                </div>
              </div>

              <div className="mb-10 bg-gradient-to-br from-gray-50 to-amber-50/30 rounded-2xl p-6 md:p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                  Что даёт членство в клубе
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { icon: 'Coins', text: 'Экономия до 70% на аренде бань' },
                    { icon: 'Shield', text: 'Безопасность и проверенные места' },
                    { icon: 'Star', text: 'Доступ к лучшим мастерам' },
                    { icon: 'Calendar', text: 'Регулярные банные встречи' },
                    { icon: 'Smile', text: 'Дружеское сообщество' },
                    { icon: 'TrendingUp', text: 'Забота о здоровье и настроении' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                        <Icon name={item.icon as any} size={16} className="text-white" />
                      </div>
                      <p className="text-gray-700 font-medium pt-1">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl p-6 md:p-10 mb-6">
                  <p className="text-lg md:text-xl text-gray-900 font-semibold mb-3">
                    Присоединяйтесь к сообществу
                  </p>
                  <p className="text-gray-700 mb-6">
                    Узнайте больше о ближайших встречах, мастерах и условиях участия
                  </p>
                  <a 
                    href="https://t.me/banya_live" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button 
                      size="lg" 
                      className="w-full md:w-auto bg-gradient-to-r from-[#229ED9] to-[#0088cc] hover:from-[#0088cc] hover:to-[#006699] text-white shadow-xl px-6 py-5 md:px-8 md:py-6 h-auto text-base md:text-lg"
                    >
                      <Icon name="Send" size={20} className="mr-2 md:mr-3" />
                      Перейти в Telegram-канал
                    </Button>
                  </a>
                </div>

                <p className="text-gray-500 text-sm px-4">
                  Банный клуб — место, где традиции живут в современном формате
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}