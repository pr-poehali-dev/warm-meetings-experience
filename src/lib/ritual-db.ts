import { RitualConfig, RitualBooking } from './ritual-api';

const mockConfig: RitualConfig = {
  formats: [
    { id: 1, name: 'Ритуал «Ближе»', description: '2 часа', duration_hours: 2.0, base_price: 12000, is_active: true, sort_order: 1 },
    { id: 2, name: 'Тепло в тишине', description: '2 часа', duration_hours: 2.0, base_price: 15000, is_active: true, sort_order: 2 },
    { id: 3, name: 'Парный ритуал обучения парению', description: '2.5 часа', duration_hours: 2.5, base_price: 18000, is_active: true, sort_order: 3 },
    { id: 4, name: 'Свидание с ужином и чаем', description: '3 часа', duration_hours: 3.0, base_price: 22000, is_active: true, sort_order: 4 },
    { id: 5, name: 'Свадебный пар', description: '3 часа', duration_hours: 3.0, base_price: 28000, is_active: true, sort_order: 5 },
  ],
  options: [
    { id: 1, name: 'Букет цветов', price: 3000, is_active: true, sort_order: 1 },
    { id: 2, name: 'Фруктовая тарелка / сырная тарелка', price: 2500, is_active: true, sort_order: 2 },
    { id: 3, name: 'Фото-съемка (мини-сессия до 30 мин)', price: 5000, is_active: true, sort_order: 3 },
    { id: 4, name: 'Ароматические свечи / ритуальные травы', price: 1500, is_active: true, sort_order: 4 },
    { id: 5, name: 'Расширение времени на 30 минут', price: 2000, is_active: true, sort_order: 5 },
  ],
  locations: [
    { id: 1, name: 'Баня №1', price_per_hour: 3000, is_active: true, sort_order: 1 },
    { id: 2, name: 'Баня №2', price_per_hour: 4000, is_active: true, sort_order: 2 },
    { id: 3, name: 'Выезд в другую баню', price_per_hour: 2000, is_active: true, sort_order: 3 },
  ],
  timeSlots: [
    { id: 1, time_label: '10:00', is_active: true, sort_order: 1 },
    { id: 2, time_label: '13:00', is_active: true, sort_order: 2 },
    { id: 3, time_label: '17:00', is_active: true, sort_order: 3 },
    { id: 4, time_label: '20:00', is_active: true, sort_order: 4 },
  ],
};

const STORAGE_KEY = 'ritual_config';

export function getConfig(): RitualConfig {
  if (typeof window === 'undefined') return mockConfig;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return mockConfig;
    }
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mockConfig));
  return mockConfig;
}

export function saveConfig(config: RitualConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export async function createBooking(booking: RitualBooking): Promise<{ bookingId: number; message: string }> {
  const config = getConfig();
  
  const format = config.formats.find(f => f.id === booking.ritualFormatId);
  const location = config.locations.find(l => l.id === booking.locationId);
  const timeSlot = config.timeSlots.find(t => t.id === booking.timeSlotId);
  const options = config.options.filter(o => booking.selectedOptions.includes(o.id));
  
  const optionsText = options.length > 0 ? options.map(o => `  • ${o.name}`).join('\n') : '  Нет';
  
  const telegramMessage = `🔥 Новый запрос на ритуал!

Имя: ${booking.clientName}
Телефон: ${booking.clientPhone}
Email: ${booking.clientEmail}

Ритуал: ${format?.name || 'Неизвестно'}
Длительность: ${format?.duration_hours || 0} часа
Локация: ${location?.name || 'Неизвестно'}
Дата: ${booking.selectedDate}
Время: ${timeSlot?.time_label || 'Неизвестно'}

Дополнительные опции:
${optionsText}

Итоговая стоимость: ${booking.totalPrice.toLocaleString()} ₽

Комментарий: ${booking.comment || 'Нет'}`;
  
  const TELEGRAM_BOT_TOKEN = '7877864092:AAFbbgv1YuCBE0wr5m7Ib6vDDuVrjhvICW0';
  const TELEGRAM_CHAT_ID = '-4524074558';
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: telegramMessage,
        parse_mode: 'HTML',
      }),
    });
    
    if (!response.ok) {
      console.error('Telegram API error:', await response.text());
    }
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
  }
  
  const bookingId = Math.floor(Math.random() * 10000);
  
  if (typeof window !== 'undefined') {
    const bookings = JSON.parse(localStorage.getItem('ritual_bookings') || '[]');
    bookings.push({ ...booking, id: bookingId, createdAt: new Date().toISOString() });
    localStorage.setItem('ritual_bookings', JSON.stringify(bookings));
  }
  
  return {
    bookingId,
    message: 'Ваш запрос на ритуал принят. Мы свяжемся для подтверждения',
  };
}