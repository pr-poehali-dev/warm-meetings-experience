import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import FUNC_URLS from '../../backend/func2url.json';

interface Booking {
  id: string;
  package_id: string;
  service_area_id: string;
  persons: number;
  start_at: string;
  duration_minutes: number;
  status: string;
  price: number;
  deposit_amount: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  notes: string;
  hold_expires_at: string | null;
  confirmed_at: string | null;
  created_at: string;
}

const AdminBookings = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    status: 'all',
    search: '',
    date_from: '',
    date_to: ''
  });
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_auth');
    if (saved === 'true') {
      setAuthenticated(true);
      loadBookings();
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(FUNC_URLS['admin-auth'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      if (response.ok) {
        sessionStorage.setItem('admin_auth', 'true');
        setAuthenticated(true);
        loadBookings();
      } else {
        alert('Неверный пароль');
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert('Ошибка авторизации');
    }
  };

  const loadBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status !== 'all') params.append('status', filter.status);
      if (filter.search) params.append('search', filter.search);
      if (filter.date_from) params.append('date_from', filter.date_from);
      if (filter.date_to) params.append('date_to', filter.date_to);
      
      const response = await fetch(`${FUNC_URLS['bookings-list']}?${params.toString()}`);
      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
    setLoading(false);
  };

  const handleConfirm = async (bookingId: string) => {
    if (!confirm('Подтвердить эту бронь?')) return;
    
    setLoading(true);
    try {
      const response = await fetch(FUNC_URLS['booking-manage'], {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, admin_override: true })
      });
      
      if (response.ok) {
        alert('Бронь подтверждена');
        loadBookings();
        setSelectedBooking(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Ошибка при подтверждении');
      }
    } catch (error) {
      console.error('Error confirming:', error);
      alert('Ошибка при подтверждении');
    }
    setLoading(false);
  };

  const handleCancel = async (bookingId: string) => {
    const reason = prompt('Причина отмены:');
    if (!reason) return;
    
    setLoading(true);
    try {
      const response = await fetch(FUNC_URLS['booking-manage'], {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, reason })
      });
      
      if (response.ok) {
        alert('Бронь отменена');
        loadBookings();
        setSelectedBooking(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Ошибка при отмене');
      }
    } catch (error) {
      console.error('Error cancelling:', error);
      alert('Ошибка при отмене');
    }
    setLoading(false);
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('ru-RU', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Europe/Moscow'
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'HOLD': 'bg-amber-100 text-amber-800 border-amber-300',
      'CONFIRMED': 'bg-green-100 text-green-800 border-green-300',
      'CANCELLED': 'bg-gray-100 text-gray-800 border-gray-300',
      'COMPLETED': 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return colors[status] || 'bg-gray-100';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'HOLD': 'Резерв',
      'CONFIRMED': 'Подтверждено',
      'CANCELLED': 'Отменено',
      'COMPLETED': 'Завершено'
    };
    return labels[status] || status;
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-nature-cream flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-serif text-nature-forest">Админ-панель бронирований</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <Label>Пароль</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Введите пароль"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-nature-brown hover:bg-nature-forest">
                Войти
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nature-cream p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-serif text-nature-forest">Бронирования</h1>
          <Button
            variant="outline"
            onClick={() => {
              sessionStorage.removeItem('admin_auth');
              setAuthenticated(false);
            }}
          >
            <Icon name="LogOut" size={16} className="mr-2" />
            Выйти
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Статус</Label>
                <select
                  value={filter.status}
                  onChange={e => setFilter({ ...filter, status: e.target.value })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="all">Все</option>
                  <option value="HOLD">Резерв</option>
                  <option value="CONFIRMED">Подтверждено</option>
                  <option value="CANCELLED">Отменено</option>
                  <option value="COMPLETED">Завершено</option>
                </select>
              </div>
              
              <div>
                <Label>Поиск</Label>
                <Input
                  value={filter.search}
                  onChange={e => setFilter({ ...filter, search: e.target.value })}
                  placeholder="Имя или телефон"
                />
              </div>
              
              <div>
                <Label>Дата от</Label>
                <Input
                  type="date"
                  value={filter.date_from}
                  onChange={e => setFilter({ ...filter, date_from: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Дата до</Label>
                <Input
                  type="date"
                  value={filter.date_to}
                  onChange={e => setFilter({ ...filter, date_to: e.target.value })}
                />
              </div>
            </div>
            
            <Button
              onClick={loadBookings}
              className="mt-4 bg-nature-brown hover:bg-nature-forest"
              disabled={loading}
            >
              {loading ? 'Загрузка...' : 'Применить фильтры'}
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {loading && bookings.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="Loader2" className="animate-spin mx-auto mb-2" size={32} />
              <p>Загрузка бронирований...</p>
            </div>
          ) : bookings.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Icon name="Calendar" className="mx-auto mb-4 text-gray-400" size={64} />
                <p className="text-gray-600">Бронирований не найдено</p>
              </CardContent>
            </Card>
          ) : (
            bookings.map(booking => (
              <Card key={booking.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(booking.status)}`}>
                          {getStatusLabel(booking.status)}
                        </span>
                        <span className="text-lg font-semibold text-nature-forest">
                          {formatDateTime(booking.start_at)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-gray-600">Клиент</p>
                          <p className="font-medium">{booking.customer_name}</p>
                          <p className="text-sm">{booking.customer_phone}</p>
                          {booking.customer_email && (
                            <p className="text-sm text-gray-600">{booking.customer_email}</p>
                          )}
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600">Детали</p>
                          <p className="font-medium">Пакет: {booking.package_id}</p>
                          <p className="text-sm">Длительность: {booking.duration_minutes} мин</p>
                          <p className="text-sm">Гости: {booking.persons} чел</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600">Стоимость</p>
                          <p className="font-medium">{booking.price.toLocaleString('ru-RU')} ₽</p>
                          <p className="text-sm">Депозит: {booking.deposit_amount?.toLocaleString('ru-RU')} ₽</p>
                        </div>
                        
                        {booking.notes && (
                          <div>
                            <p className="text-sm text-gray-600">Комментарий</p>
                            <p className="text-sm">{booking.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 min-w-[140px]">
                      {booking.status === 'HOLD' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleConfirm(booking.id)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Icon name="Check" size={16} className="mr-1" />
                            Подтвердить
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancel(booking.id)}
                          >
                            <Icon name="X" size={16} className="mr-1" />
                            Отменить
                          </Button>
                        </>
                      )}
                      
                      {booking.status === 'CONFIRMED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancel(booking.id)}
                        >
                          <Icon name="X" size={16} className="mr-1" />
                          Отменить
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <Icon name="Eye" size={16} className="mr-1" />
                        Детали
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {selectedBooking && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedBooking(null)}
        >
          <Card 
            className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Детали брони</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedBooking(null)}
                >
                  <Icon name="X" size={20} />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(selectedBooking, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminBookings;
