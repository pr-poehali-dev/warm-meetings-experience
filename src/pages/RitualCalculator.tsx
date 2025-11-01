import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { getConfig, createBooking } from '@/lib/ritual-db';
import type { RitualFormat, RitualOption, RitualLocation, TimeSlot, RitualConfig } from '@/lib/ritual-api';

export default function RitualCalculator() {
  const [config, setConfig] = useState<RitualConfig | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<number | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<number | null>(null);
  
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [comment, setComment] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadedConfig = getConfig();
    setConfig(loadedConfig);
  }, []);

  const calculateTotal = () => {
    if (!config || !selectedFormat || !selectedLocation) return 0;
    
    const format = config.formats.find(f => f.id === selectedFormat);
    const location = config.locations.find(l => l.id === selectedLocation);
    
    if (!format || !location) return 0;
    
    let total = format.base_price;
    
    total += location.price_per_hour * format.duration_hours;
    
    selectedOptions.forEach(optionId => {
      const option = config.options.find(o => o.id === optionId);
      if (option) total += option.price;
    });
    
    return total;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFormat || !selectedLocation || !selectedDate || !selectedTimeSlot) {
      toast.error('Пожалуйста, заполните все обязательные поля');
      return;
    }
    
    if (!agreed) {
      toast.error('Необходимо согласиться с условиями сервиса');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const data = await createBooking({
        clientName,
        clientPhone,
        clientEmail,
        ritualFormatId: selectedFormat,
        locationId: selectedLocation,
        selectedDate: format(selectedDate, 'yyyy-MM-dd'),
        timeSlotId: selectedTimeSlot,
        selectedOptions,
        totalPrice: calculateTotal(),
        comment,
      });
      
      toast.success(data.message);
      
      setSelectedFormat(null);
      setSelectedOptions([]);
      setSelectedLocation(null);
      setSelectedDate(undefined);
      setSelectedTimeSlot(null);
      setClientName('');
      setClientPhone('');
      setClientEmail('');
      setComment('');
      setAgreed(false);
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Ошибка при отправке запроса');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-amber-800">Загрузка...</p>
        </div>
      </div>
    );
  }

  const total = calculateTotal();
  const selectedFormatData = config.formats.find(f => f.id === selectedFormat);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-light text-amber-900 mb-4">
            Калькулятор стоимости ритуала
          </h1>
          <p className="text-lg text-amber-700 max-w-2xl mx-auto">
            Выберите формат ритуала, дополнительные опции и удобное время. 
            Мы свяжемся с вами для подтверждения.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-12 space-y-8">
          <div className="space-y-4">
            <Label className="text-xl font-light text-amber-900">Формат ритуала *</Label>
            <RadioGroup value={selectedFormat?.toString()} onValueChange={(val) => setSelectedFormat(Number(val))}>
              {config.formats.map(format => (
                <div key={format.id} className="flex items-start space-x-3 p-4 rounded-xl hover:bg-amber-50 transition-colors border border-transparent hover:border-amber-200">
                  <RadioGroupItem value={format.id.toString()} id={`format-${format.id}`} />
                  <div className="flex-1">
                    <Label htmlFor={`format-${format.id}`} className="cursor-pointer">
                      <div className="font-medium text-amber-900">{format.name}</div>
                      <div className="text-sm text-amber-600">{format.description}</div>
                    </Label>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-amber-900">{format.base_price.toLocaleString()} ₽</div>
                    <div className="text-xs text-amber-600">{format.duration_hours} ч</div>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <Label className="text-xl font-light text-amber-900">Дополнительные опции</Label>
            <div className="space-y-2">
              {config.options.map(option => (
                <div key={option.id} className="flex items-center space-x-3 p-4 rounded-xl hover:bg-amber-50 transition-colors">
                  <Checkbox
                    id={`option-${option.id}`}
                    checked={selectedOptions.includes(option.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedOptions([...selectedOptions, option.id]);
                      } else {
                        setSelectedOptions(selectedOptions.filter(id => id !== option.id));
                      }
                    }}
                  />
                  <Label htmlFor={`option-${option.id}`} className="flex-1 cursor-pointer text-amber-800">
                    {option.name}
                  </Label>
                  <span className="font-medium text-amber-900">+ {option.price.toLocaleString()} ₽</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-xl font-light text-amber-900">Локация *</Label>
              <Select value={selectedLocation?.toString()} onValueChange={(val) => setSelectedLocation(Number(val))}>
                <SelectTrigger className="border-amber-200 focus:ring-amber-500">
                  <SelectValue placeholder="Выберите локацию" />
                </SelectTrigger>
                <SelectContent>
                  {config.locations.map(location => (
                    <SelectItem key={location.id} value={location.id.toString()}>
                      {location.name} — {location.price_per_hour.toLocaleString()} ₽/час
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-xl font-light text-amber-900">Дата *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left border-amber-200 hover:bg-amber-50">
                    <Icon name="Calendar" className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'dd MMMM yyyy', { locale: ru }) : 'Выберите дату'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} locale={ru} disabled={(date) => date < new Date()} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xl font-light text-amber-900">Время *</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {config.timeSlots.map(slot => (
                <Button
                  key={slot.id}
                  type="button"
                  variant={selectedTimeSlot === slot.id ? 'default' : 'outline'}
                  onClick={() => setSelectedTimeSlot(slot.id)}
                  className={selectedTimeSlot === slot.id ? 'bg-amber-600 hover:bg-amber-700' : 'border-amber-200 hover:bg-amber-50'}
                >
                  {slot.time_label}
                </Button>
              ))}
            </div>
          </div>

          {selectedFormat && selectedLocation && (
            <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl p-6 space-y-3">
              <h3 className="text-xl font-light text-amber-900 mb-4">Итоговая стоимость</h3>
              <div className="space-y-2 text-amber-800">
                <div className="flex justify-between">
                  <span>Ритуал:</span>
                  <span className="font-medium">{selectedFormatData?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Продолжительность:</span>
                  <span className="font-medium">{selectedFormatData?.duration_hours} часа</span>
                </div>
                <div className="flex justify-between">
                  <span>Локация:</span>
                  <span className="font-medium">{config.locations.find(l => l.id === selectedLocation)?.name}</span>
                </div>
                {selectedDate && selectedTimeSlot && (
                  <div className="flex justify-between">
                    <span>Дата и время:</span>
                    <span className="font-medium">
                      {format(selectedDate, 'dd.MM.yyyy', { locale: ru })} в {config.timeSlots.find(t => t.id === selectedTimeSlot)?.time_label}
                    </span>
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-amber-300 flex justify-between items-center">
                <span className="text-2xl font-light text-amber-900">Итого:</span>
                <span className="text-3xl font-semibold text-amber-900">{total.toLocaleString()} ₽</span>
              </div>
            </div>
          )}

          <div className="space-y-4 pt-6">
            <h3 className="text-xl font-light text-amber-900">Контактные данные</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Имя *</Label>
                <Input
                  id="name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                  className="border-amber-200 focus:ring-amber-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Телефон *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  required
                  className="border-amber-200 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                required
                className="border-amber-200 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">Комментарий</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="border-amber-200 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox id="agree" checked={agreed} onCheckedChange={(checked) => setAgreed(checked as boolean)} />
              <Label htmlFor="agree" className="text-sm text-amber-700 cursor-pointer">
                Я соглашаюсь с условиями сервиса и политикой конфиденциальности
              </Label>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-6 text-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl shadow-lg"
          >
            {isSubmitting ? 'Отправка...' : 'Записаться на ритуал'}
          </Button>
        </form>
      </div>
    </div>
  );
}