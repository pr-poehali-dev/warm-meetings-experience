import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { Link } from "react-router-dom";

export default function GroupPrograms() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-nature-cream to-nature-sage">
      {/* Header */}
      <header className="py-6 px-4">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Icon name="ArrowLeft" size={20} />
            <span className="text-nature-brown font-medium">На главную</span>
          </Link>
          <h1 className="text-2xl font-bold text-nature-brown">Групповые программы</h1>
          <div className="w-24" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold text-nature-brown mb-6">
              Групповая
              <span className="block text-nature-sage">терапия</span>
            </h2>
            <p className="text-xl text-nature-brown/80 max-w-3xl mx-auto leading-relaxed">
              Работа в группе единомышленников для взаимной поддержки, 
              обмена опытом и совместного роста под руководством психолога.
            </p>
          </div>

          {/* Programs */}
          <div className="space-y-12 mb-16">
            {/* Program 1 */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-nature-sage rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon name="Users" size={28} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-nature-brown mb-4">
                    "Путь к себе" - группа личностного роста
                  </h3>
                  <p className="text-nature-brown/80 mb-6">
                    8-недельная программа для тех, кто хочет лучше понять себя, 
                    найти внутренние ресурсы и научиться строить гармоничные отношения с собой и окружающими.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-2 text-nature-brown">
                      <Icon name="Clock" size={16} className="text-nature-sage" />
                      <span>8 встреч по 2 часа</span>
                    </div>
                    <div className="flex items-center gap-2 text-nature-brown">
                      <Icon name="Users" size={16} className="text-nature-sage" />
                      <span>До 8 участников</span>
                    </div>
                    <div className="flex items-center gap-2 text-nature-brown">
                      <Icon name="Calendar" size={16} className="text-nature-sage" />
                      <span>Еженедельно</span>
                    </div>
                    <div className="flex items-center gap-2 text-nature-brown">
                      <Icon name="Ruble" size={16} className="text-nature-sage" />
                      <span>15 000 ₽ за курс</span>
                    </div>
                  </div>
                  <div className="bg-nature-sage/10 rounded-2xl p-4">
                    <h4 className="font-semibold text-nature-brown mb-2">Что вы получите:</h4>
                    <ul className="text-nature-brown/80 space-y-1">
                      <li>• Понимание своих эмоций и потребностей</li>
                      <li>• Навыки саморегуляции и управления стрессом</li>
                      <li>• Улучшение коммуникативных способностей</li>
                      <li>• Поддержку группы единомышленников</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Program 2 */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-nature-sage rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon name="Heart" size={28} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-nature-brown mb-4">
                    "Здоровые отношения" - терапия для пар
                  </h3>
                  <p className="text-nature-brown/80 mb-6">
                    6-недельная программа для пар, которые хотят укрепить отношения, 
                    научиться лучше понимать друг друга и решать конфликты конструктивно.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-2 text-nature-brown">
                      <Icon name="Clock" size={16} className="text-nature-sage" />
                      <span>6 встреч по 1.5 часа</span>
                    </div>
                    <div className="flex items-center gap-2 text-nature-brown">
                      <Icon name="Users" size={16} className="text-nature-sage" />
                      <span>До 6 пар</span>
                    </div>
                    <div className="flex items-center gap-2 text-nature-brown">
                      <Icon name="Calendar" size={16} className="text-nature-sage" />
                      <span>Еженедельно</span>
                    </div>
                    <div className="flex items-center gap-2 text-nature-brown">
                      <Icon name="Ruble" size={16} className="text-nature-sage" />
                      <span>18 000 ₽ за пару</span>
                    </div>
                  </div>
                  <div className="bg-nature-sage/10 rounded-2xl p-4">
                    <h4 className="font-semibold text-nature-brown mb-2">Что вы получите:</h4>
                    <ul className="text-nature-brown/80 space-y-1">
                      <li>• Техники эффективного общения</li>
                      <li>• Способы решения конфликтов</li>
                      <li>• Понимание потребностей партнера</li>
                      <li>• Укрепление эмоциональной связи</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Program 3 */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-nature-sage rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon name="Shield" size={28} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-nature-brown mb-4">
                    "Преодоление тревоги" - группа поддержки
                  </h3>
                  <p className="text-nature-brown/80 mb-6">
                    10-недельная программа для людей, страдающих от тревожных расстройств. 
                    Изучение техник управления тревогой и взаимная поддержка участников.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-2 text-nature-brown">
                      <Icon name="Clock" size={16} className="text-nature-sage" />
                      <span>10 встреч по 1.5 часа</span>
                    </div>
                    <div className="flex items-center gap-2 text-nature-brown">
                      <Icon name="Users" size={16} className="text-nature-sage" />
                      <span>До 10 участников</span>
                    </div>
                    <div className="flex items-center gap-2 text-nature-brown">
                      <Icon name="Calendar" size={16} className="text-nature-sage" />
                      <span>Еженедельно</span>
                    </div>
                    <div className="flex items-center gap-2 text-nature-brown">
                      <Icon name="Ruble" size={16} className="text-nature-sage" />
                      <span>12 000 ₽ за курс</span>
                    </div>
                  </div>
                  <div className="bg-nature-sage/10 rounded-2xl p-4">
                    <h4 className="font-semibold text-nature-brown mb-2">Что вы получите:</h4>
                    <ul className="text-nature-brown/80 space-y-1">
                      <li>• Техники дыхания и релаксации</li>
                      <li>• Когнитивные стратегии работы с тревогой</li>
                      <li>• Поддержку людей с похожим опытом</li>
                      <li>• Практические навыки самопомощи</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg mb-16">
            <h3 className="text-3xl font-bold text-nature-brown mb-8 text-center">
              Преимущества групповой терапии
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-nature-sage rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="DollarSign" size={24} className="text-white" />
                </div>
                <h4 className="text-xl font-semibold text-nature-brown mb-2">Доступность</h4>
                <p className="text-nature-brown/80">
                  Стоимость групповых занятий значительно ниже индивидуальной терапии
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-nature-sage rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Users" size={24} className="text-white" />
                </div>
                <h4 className="text-xl font-semibold text-nature-brown mb-2">Поддержка</h4>
                <p className="text-nature-brown/80">
                  Взаимная поддержка участников и понимание того, что вы не одни
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-nature-sage rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Lightbulb" size={24} className="text-white" />
                </div>
                <h4 className="text-xl font-semibold text-nature-brown mb-2">Новые идеи</h4>
                <p className="text-nature-brown/80">
                  Различные точки зрения и подходы к решению проблем
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <h3 className="text-3xl font-bold text-nature-brown mb-6">
              Присоединяйтесь к группе
            </h3>
            <p className="text-xl text-nature-brown/80 mb-8 max-w-2xl mx-auto">
              Узнайте о ближайших наборах в группы и найдите программу, 
              которая подходит именно вам.
            </p>
            <Button 
              size="lg"
              className="bg-nature-brown hover:bg-nature-brown/90 text-nature-cream px-8 py-4 rounded-full transition-all duration-300 hover:scale-105"
              asChild
            >
              <a href="https://t.me/DmitryChikin" target="_blank" rel="noopener noreferrer">
                <Icon name="MessageCircle" size={20} className="mr-2" />
                Узнать о наборе в группы
              </a>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}