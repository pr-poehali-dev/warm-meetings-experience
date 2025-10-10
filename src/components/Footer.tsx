import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

const Footer = () => {
  return (
    <footer className="bg-nature-forest text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Контакты */}
          <div>
            <h3 className="text-xl font-serif mb-4">Контакты</h3>
            <div className="space-y-3">
              <a 
                href="https://t.me/banya_live" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-nature-sand transition-colors"
              >
                <Icon name="Send" size={20} />
                <span>Telegram</span>
              </a>
              <a 
                href="mailto:info@sparcom.ru"
                className="flex items-center gap-2 hover:text-nature-sand transition-colors"
              >
                <Icon name="Mail" size={20} />
                <span>info@sparcom.ru</span>
              </a>
            </div>
          </div>

          {/* Правовая информация */}
          <div>
            <h3 className="text-xl font-serif mb-4">Правовая информация</h3>
            <div className="space-y-3">
              <a 
                href="https://disk.yandex.ru/i/NnDao-8RmPiocA" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block hover:text-nature-sand transition-colors"
              >
                Обработка персональных данных
              </a>
              <a 
                href="https://disk.yandex.ru/i/xa3Ep9y2MGEbsw" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block hover:text-nature-sand transition-colors"
              >
                Положение о конфиденциальности
              </a>
            </div>
          </div>

          {/* О проекте */}
          <div>
            <h3 className="text-xl font-serif mb-4">О проекте</h3>
            <p className="text-gray-300 leading-relaxed">
              Место, где рождается близость через банные ритуалы и атмосферу тепла
            </p>
          </div>
        </div>

        {/* Разделитель */}
        <div className="border-t border-white/20 pt-6">
          <p className="text-center text-gray-300">
            ©️ Теплые Встречи. Место, где рождается близость.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
