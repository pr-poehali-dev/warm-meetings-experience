import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

const FloatingMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { 
      title: 'Услуги', 
      items: [
        { name: 'Индивидуальные консультации', path: '/individual-consultations', icon: 'User' },
        { name: 'Групповые программы', path: '/group-programs', icon: 'Users' },
        { name: 'Онлайн-курсы', path: '/online-courses', icon: 'Monitor' }
      ]
    },
    { 
      title: 'Форматы встреч', 
      items: [
        { name: 'Тёплые Знакомства', path: '/warm-meetings', icon: 'Users' },
        { name: 'Тёплый Тимбилдинг', path: '/warm-team-building', icon: 'HandHeart' },
        { name: 'Тёплые Свидания', path: '/warm-dates', icon: 'Heart' }
      ]
    },
    { 
      title: 'Мероприятия', 
      items: [
        { name: 'Ближайшие события', path: '/events', icon: 'Calendar' }
      ]
    }
  ];

  return (
    <div className="fixed top-6 left-6 z-50">
      {/* Main Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-nature-brown hover:bg-nature-brown/90 text-nature-cream shadow-xl hover:shadow-2xl transition-all duration-300 rounded-full px-6 py-3 text-lg font-serif"
        size="lg"
      >
        <Icon 
          name={isOpen ? "X" : "Menu"} 
          size={20} 
          className={`mr-2 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} 
        />
        Тёплые Встречи
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-16 left-0 min-w-[320px] bg-nature-cream/98 backdrop-blur-sm rounded-2xl shadow-2xl border border-nature-brown/20 overflow-hidden animate-in slide-in-from-top-2 duration-300">
          {menuItems.map((section, sectionIndex) => (
            <div key={section.title} className={sectionIndex > 0 ? 'border-t border-nature-brown/10' : ''}>
              <div className="px-4 py-3 bg-nature-sage/20">
                <h3 className="text-sm font-medium text-nature-forest uppercase tracking-wide">
                  {section.title}
                </h3>
              </div>
              <div className="py-2">
                {section.items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center px-4 py-3 text-nature-forest hover:bg-nature-sage/20 transition-colors duration-200 group"
                  >
                    <Icon 
                      name={item.icon as any} 
                      size={18} 
                      className="text-nature-brown mr-3 group-hover:scale-110 transition-transform duration-200" 
                    />
                    <span className="text-sm group-hover:text-nature-brown transition-colors">
                      {item.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          
          {/* Contact Section */}
          <div className="border-t border-nature-brown/10 px-4 py-4 bg-nature-brown/5">
            <a 
              href="https://t.me/banya_live" 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center text-nature-brown hover:text-nature-forest transition-colors duration-200"
            >
              <Icon name="MessageCircle" size={18} className="mr-2" />
              <span className="text-sm font-medium">Связаться в Telegram</span>
            </a>
          </div>
        </div>
      )}

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/10 backdrop-blur-[1px] -z-10" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default FloatingMenu;