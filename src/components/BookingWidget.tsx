import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import FUNC_URLS from '../../backend/func2url.json';

interface BookingWidgetProps {
  packageId: string;
  serviceAreaId: string;
  packageName: string;
}

const BookingWidget: React.FC<BookingWidgetProps> = ({ packageId, serviceAreaId, packageName }) => {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState({
    persons: 2,
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    notes: ''
  });
  const [holdData, setHoldData] = useState<any>(null);
  const [timer, setTimer] = useState<number>(0);

  useEffect(() => {
    if (selectedDate && step === 2) {
      loadAvailability();
    }
  }, [selectedDate]);

  useEffect(() => {
    let interval: any;
    if (holdData && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [holdData, timer]);

  const loadAvailability = async () => {
    setLoading(true);
    try {
      const response = await fetch(FUNC_URLS['calendar-availability'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package_id: packageId,
          service_area_id: serviceAreaId,
          date_from: selectedDate
        })
      });
      
      const data = await response.json();
      setAvailableSlots(data.available_slots || []);
    } catch (error) {
      console.error('Error loading availability:', error);
    }
    setLoading(false);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setStep(2);
  };

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot);
    setStep(3);
  };

  const handleCreateHold = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(FUNC_URLS['booking-manage'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package_id: packageId,
          service_area_id: serviceAreaId,
          start_at: selectedSlot,
          persons: bookingData.persons,
          customer_name: bookingData.customer_name,
          customer_phone: bookingData.customer_phone,
          customer_email: bookingData.customer_email,
          notes: bookingData.notes,
          addons: [],
          promo_code: ''
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setHoldData(data);
        const expiresAt = new Date(data.hold_expires_at);
        const now = new Date();
        const diff = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
        setTimer(diff);
        setStep(4);
      } else {
        alert(data.error || 'Ошибка при создании брони');
      }
    } catch (error) {
      console.error('Error creating hold:', error);
      alert('Ошибка при создании брони');
    }
    setLoading(false);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const response = await fetch(FUNC_URLS['booking-manage'], {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: holdData.booking_id,
          token: holdData.token
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStep(5);
      } else {
        alert(data.error || 'Ошибка при подтверждении');
      }
    } catch (error) {
      console.error('Error confirming:', error);
      alert('Ошибка при подтверждении');
    }
    setLoading(false);
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Moscow' });
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  if (step === 1) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-6">
          <h3 className="text-2xl font-serif text-nature-forest mb-4">Выберите дату</h3>
          <div className="grid grid-cols-3 gap-3">
            {generateDateOptions().map(date => (
              <Button
                key={date}
                variant="outline"
                onClick={() => handleDateSelect(date)}
                className="h-auto py-3 flex flex-col items-center hover:bg-nature-sage/20 border-nature-brown/20"
              >
                <span className="text-lg font-semibold">{new Date(date).getDate()}</span>
                <span className="text-xs text-gray-600">
                  {new Date(date).toLocaleDateString('ru-RU', { month: 'short' })}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 2) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-6">
          <Button
            variant="ghost"
            onClick={() => setStep(1)}
            className="mb-4"
          >
            <Icon name="ChevronLeft" size={20} className="mr-2" />
            Назад
          </Button>
          <h3 className="text-2xl font-serif text-nature-forest mb-2">Выберите время</h3>
          <p className="text-gray-600 mb-4">{formatDate(selectedDate)}</p>
          
          {loading ? (
            <div className="text-center py-12">
              <Icon name="Loader2" className="animate-spin mx-auto mb-2" size={32} />
              <p>Загрузка доступных слотов...</p>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="CalendarX" className="mx-auto mb-2 text-gray-400" size={48} />
              <p className="text-gray-600">На эту дату нет доступных слотов</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {availableSlots.map(slot => (
                <Button
                  key={slot}
                  variant="outline"
                  onClick={() => handleSlotSelect(slot)}
                  className="hover:bg-nature-sage/20 border-nature-brown/20 font-semibold"
                >
                  {formatTime(slot)}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (step === 3) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-6">
          <Button
            variant="ghost"
            onClick={() => setStep(2)}
            className="mb-4"
          >
            <Icon name="ChevronLeft" size={20} className="mr-2" />
            Назад
          </Button>
          <h3 className="text-2xl font-serif text-nature-forest mb-2">Данные для бронирования</h3>
          <p className="text-gray-600 mb-6">
            {packageName} • {formatDate(selectedDate)} • {formatTime(selectedSlot)}
          </p>
          
          <form onSubmit={handleCreateHold} className="space-y-4">
            <div>
              <Label>Ваше имя *</Label>
              <Input
                required
                value={bookingData.customer_name}
                onChange={e => setBookingData({ ...bookingData, customer_name: e.target.value })}
                placeholder="Анна"
              />
            </div>
            
            <div>
              <Label>Телефон *</Label>
              <Input
                required
                type="tel"
                value={bookingData.customer_phone}
                onChange={e => setBookingData({ ...bookingData, customer_phone: e.target.value })}
                placeholder="+7 999 123 45 67"
              />
            </div>
            
            <div>
              <Label>Email (необязательно)</Label>
              <Input
                type="email"
                value={bookingData.customer_email}
                onChange={e => setBookingData({ ...bookingData, customer_email: e.target.value })}
                placeholder="anna@example.com"
              />
            </div>
            
            <div>
              <Label>Комментарий</Label>
              <Input
                value={bookingData.notes}
                onChange={e => setBookingData({ ...bookingData, notes: e.target.value })}
                placeholder="Особые пожелания..."
              />
            </div>
            
            <Button
              type="submit"
              size="lg"
              className="w-full bg-nature-brown hover:bg-nature-forest text-white"
              disabled={loading}
            >
              {loading ? 'Создание...' : 'Забронировать слот (20 минут)'}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (step === 4) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <Icon name="Clock" className="mx-auto mb-4 text-nature-brown" size={64} />
            <h3 className="text-2xl font-serif text-nature-forest mb-2">Слот зарезервирован!</h3>
            <p className="text-4xl font-bold text-nature-brown mb-2">{formatTimer(timer)}</p>
            <p className="text-gray-600">Время на подтверждение бронирования</p>
          </div>
          
          <div className="bg-nature-cream/30 p-4 rounded-lg mb-6">
            <h4 className="font-semibold mb-2">Детали бронирования:</h4>
            <p>• Пакет: {packageName}</p>
            <p>• Дата: {formatDate(selectedSlot)}</p>
            <p>• Время: {formatTime(selectedSlot)}</p>
            <p>• Стоимость: {holdData?.final_price?.toLocaleString('ru-RU')} ₽</p>
            <p>• Депозит: {holdData?.deposit_amount?.toLocaleString('ru-RU')} ₽ (30%)</p>
          </div>
          
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full bg-nature-brown hover:bg-nature-forest text-white"
              onClick={handleConfirm}
              disabled={loading || timer === 0}
            >
              Подтвердить бронь
            </Button>
            
            <p className="text-sm text-center text-gray-600">
              Менеджер свяжется с вами для подтверждения оплаты депозита
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 5) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-6 text-center">
          <Icon name="CheckCircle" className="mx-auto mb-4 text-green-600" size={64} />
          <h3 className="text-2xl font-serif text-nature-forest mb-2">Бронь подтверждена!</h3>
          <p className="text-gray-600 mb-6">
            Мы отправили детали на {bookingData.customer_phone}
          </p>
          
          <div className="bg-nature-cream/30 p-4 rounded-lg mb-6">
            <h4 className="font-semibold mb-2">Ваше бронирование:</h4>
            <p>• {packageName}</p>
            <p>• {formatDate(selectedSlot)}, {formatTime(selectedSlot)}</p>
            <p>• {bookingData.customer_name}</p>
          </div>
          
          <Button
            size="lg"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Закрыть
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default BookingWidget;
