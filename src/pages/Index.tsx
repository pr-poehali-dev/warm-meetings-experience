import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden">
          <div className="relative h-64 md:h-96">
            <img 
              src="https://cdn.poehali.dev/projects/b2cfdb9f-e5f2-4dd1-84cb-905733c4941c/files/b235e67d-b3fd-42a8-bb56-65c319f87c0e.jpg"
              alt="Банный комплекс"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>

          <div className="p-8 md:p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full mb-6 shadow-lg">
              <Icon name="Flame" size={40} className="text-white" />
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
              Скоро открытие
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-700 mb-8 max-w-2xl mx-auto">
              Готовим для вас особенное пространство тепла и заботы
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="p-6 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl">
                <Icon name="Droplets" size={32} className="text-amber-700 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Настоящий пар</h3>
                <p className="text-sm text-gray-700">Аутентичные банные традиции</p>
              </div>

              <div className="p-6 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl">
                <Icon name="Heart" size={32} className="text-amber-700 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">С душой</h3>
                <p className="text-sm text-gray-700">Атмосфера уюта и заботы</p>
              </div>

              <div className="p-6 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl">
                <Icon name="Sparkles" size={32} className="text-amber-700 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Новый опыт</h3>
                <p className="text-sm text-gray-700">Современный подход к традициям</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600 font-medium">
                Оставьте контакт, и мы сообщим о запуске первыми
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <a 
                  href="https://t.me/your_contact" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto"
                >
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg"
                  >
                    <Icon name="Send" size={20} className="mr-2" />
                    Написать в Telegram
                  </Button>
                </a>

                <a 
                  href="tel:+79000000000"
                  className="w-full sm:w-auto"
                >
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="w-full sm:w-auto border-2 border-amber-600 text-amber-700 hover:bg-amber-50"
                  >
                    <Icon name="Phone" size={20} className="mr-2" />
                    Позвонить
                  </Button>
                </a>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-gray-200">
              <p className="text-gray-500 text-sm">
                Следите за новостями в наших социальных сетях
              </p>
              <div className="flex justify-center gap-4 mt-4">
                <a href="#" className="text-gray-400 hover:text-amber-600 transition-colors">
                  <Icon name="Instagram" size={24} />
                </a>
                <a href="#" className="text-gray-400 hover:text-amber-600 transition-colors">
                  <Icon name="Facebook" size={24} />
                </a>
                <a href="#" className="text-gray-400 hover:text-amber-600 transition-colors">
                  <Icon name="Youtube" size={24} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
