import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { getConfig, saveConfig } from '@/lib/ritual-db';
import type { RitualFormat, RitualOption, RitualLocation, TimeSlot } from '@/lib/ritual-api';

export default function RitualAdmin() {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  const [formats, setFormats] = useState<RitualFormat[]>([]);
  const [options, setOptions] = useState<RitualOption[]>([]);
  const [locations, setLocations] = useState<RitualLocation[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthorized) {
      loadData();
    }
  }, [isAuthorized]);

  const loadData = () => {
    const config = getConfig();
    setFormats(config.formats);
    setOptions(config.options);
    setLocations(config.locations);
    setTimeSlots(config.timeSlots);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      setIsAuthorized(true);
      toast.success('Вход выполнен');
    }
  };

  const handleUpdateFormat = (id: number, field: string, value: string | number) => {
    const config = getConfig();
    const updated = config.formats.map(f => {
      if (f.id === id) {
        return { ...f, [field]: value };
      }
      return f;
    });
    saveConfig({ ...config, formats: updated });
    loadData();
    toast.success('Обновлено');
  };

  const handleUpdateOption = (id: number, field: string, value: string | number) => {
    const config = getConfig();
    const updated = config.options.map(o => {
      if (o.id === id) {
        return { ...o, [field]: value };
      }
      return o;
    });
    saveConfig({ ...config, options: updated });
    loadData();
    toast.success('Обновлено');
  };

  const handleUpdateLocation = (id: number, field: string, value: string | number) => {
    const config = getConfig();
    const updated = config.locations.map(l => {
      if (l.id === id) {
        return { ...l, [field]: value };
      }
      return l;
    });
    saveConfig({ ...config, locations: updated });
    loadData();
    toast.success('Обновлено');
  };

  const handleUpdateTimeSlot = (id: number, field: string, value: string | number) => {
    const config = getConfig();
    const updated = config.timeSlots.map(t => {
      if (t.id === id) {
        return { ...t, [field]: value };
      }
      return t;
    });
    saveConfig({ ...config, timeSlots: updated });
    loadData();
    toast.success('Обновлено');
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Админ-панель калькулятора</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">Войти</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-light text-amber-900">Управление калькулятором ритуалов</h1>
          <Button variant="outline" onClick={() => setIsAuthorized(false)}>
            <Icon name="LogOut" className="mr-2 h-4 w-4" />
            Выйти
          </Button>
        </div>

        <Tabs defaultValue="formats" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="formats">Форматы</TabsTrigger>
            <TabsTrigger value="options">Опции</TabsTrigger>
            <TabsTrigger value="locations">Локации</TabsTrigger>
            <TabsTrigger value="slots">Время</TabsTrigger>
          </TabsList>

          <TabsContent value="formats">
            <Card>
              <CardHeader>
                <CardTitle>Форматы ритуалов</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {formats.map((format) => (
                  <div key={format.id} className="border rounded-lg p-4 space-y-3">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Название</Label>
                        <Input
                          value={format.name}
                          onBlur={(e) => handleUpdateFormat(format.id, 'name', e.target.value)}
                          onChange={(e) => {
                            const updated = formats.map(f => 
                              f.id === format.id ? {...f, name: e.target.value} : f
                            );
                            setFormats(updated);
                          }}
                        />
                      </div>
                      <div>
                        <Label>Описание</Label>
                        <Input
                          value={format.description}
                          onBlur={(e) => handleUpdateFormat(format.id, 'description', e.target.value)}
                          onChange={(e) => {
                            const updated = formats.map(f => 
                              f.id === format.id ? {...f, description: e.target.value} : f
                            );
                            setFormats(updated);
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label>Длительность (часы)</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={format.duration_hours}
                          onBlur={(e) => handleUpdateFormat(format.id, 'duration_hours', e.target.value)}
                          onChange={(e) => {
                            const updated = formats.map(f => 
                              f.id === format.id ? {...f, duration_hours: parseFloat(e.target.value)} : f
                            );
                            setFormats(updated);
                          }}
                        />
                      </div>
                      <div>
                        <Label>Базовая цена (₽)</Label>
                        <Input
                          type="number"
                          value={format.base_price}
                          onBlur={(e) => handleUpdateFormat(format.id, 'base_price', e.target.value)}
                          onChange={(e) => {
                            const updated = formats.map(f => 
                              f.id === format.id ? {...f, base_price: parseInt(e.target.value)} : f
                            );
                            setFormats(updated);
                          }}
                        />
                      </div>
                      <div>
                        <Label>Порядок</Label>
                        <Input
                          type="number"
                          value={format.sort_order}
                          onBlur={(e) => handleUpdateFormat(format.id, 'sort_order', e.target.value)}
                          onChange={(e) => {
                            const updated = formats.map(f => 
                              f.id === format.id ? {...f, sort_order: parseInt(e.target.value)} : f
                            );
                            setFormats(updated);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="options">
            <Card>
              <CardHeader>
                <CardTitle>Дополнительные опции</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {options.map((option) => (
                  <div key={option.id} className="border rounded-lg p-4 grid md:grid-cols-3 gap-4">
                    <div>
                      <Label>Название</Label>
                      <Input
                        value={option.name}
                        onBlur={(e) => handleUpdateOption(option.id, 'name', e.target.value)}
                        onChange={(e) => {
                          const updated = options.map(o => 
                            o.id === option.id ? {...o, name: e.target.value} : o
                          );
                          setOptions(updated);
                        }}
                      />
                    </div>
                    <div>
                      <Label>Цена (₽)</Label>
                      <Input
                        type="number"
                        value={option.price}
                        onBlur={(e) => handleUpdateOption(option.id, 'price', e.target.value)}
                        onChange={(e) => {
                          const updated = options.map(o => 
                            o.id === option.id ? {...o, price: parseInt(e.target.value)} : o
                          );
                          setOptions(updated);
                        }}
                      />
                    </div>
                    <div>
                      <Label>Порядок</Label>
                      <Input
                        type="number"
                        value={option.sort_order}
                        onBlur={(e) => handleUpdateOption(option.id, 'sort_order', e.target.value)}
                        onChange={(e) => {
                          const updated = options.map(o => 
                            o.id === option.id ? {...o, sort_order: parseInt(e.target.value)} : o
                          );
                          setOptions(updated);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locations">
            <Card>
              <CardHeader>
                <CardTitle>Локации</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {locations.map((location) => (
                  <div key={location.id} className="border rounded-lg p-4 grid md:grid-cols-3 gap-4">
                    <div>
                      <Label>Название</Label>
                      <Input
                        value={location.name}
                        onBlur={(e) => handleUpdateLocation(location.id, 'name', e.target.value)}
                        onChange={(e) => {
                          const updated = locations.map(l => 
                            l.id === location.id ? {...l, name: e.target.value} : l
                          );
                          setLocations(updated);
                        }}
                      />
                    </div>
                    <div>
                      <Label>Цена за час (₽)</Label>
                      <Input
                        type="number"
                        value={location.price_per_hour}
                        onBlur={(e) => handleUpdateLocation(location.id, 'price_per_hour', e.target.value)}
                        onChange={(e) => {
                          const updated = locations.map(l => 
                            l.id === location.id ? {...l, price_per_hour: parseInt(e.target.value)} : l
                          );
                          setLocations(updated);
                        }}
                      />
                    </div>
                    <div>
                      <Label>Порядок</Label>
                      <Input
                        type="number"
                        value={location.sort_order}
                        onBlur={(e) => handleUpdateLocation(location.id, 'sort_order', e.target.value)}
                        onChange={(e) => {
                          const updated = locations.map(l => 
                            l.id === location.id ? {...l, sort_order: parseInt(e.target.value)} : l
                          );
                          setLocations(updated);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="slots">
            <Card>
              <CardHeader>
                <CardTitle>Временные слоты</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {timeSlots.map((slot) => (
                  <div key={slot.id} className="border rounded-lg p-4 grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Время</Label>
                      <Input
                        value={slot.time_label}
                        onBlur={(e) => handleUpdateTimeSlot(slot.id, 'time_label', e.target.value)}
                        onChange={(e) => {
                          const updated = timeSlots.map(t => 
                            t.id === slot.id ? {...t, time_label: e.target.value} : t
                          );
                          setTimeSlots(updated);
                        }}
                      />
                    </div>
                    <div>
                      <Label>Порядок</Label>
                      <Input
                        type="number"
                        value={slot.sort_order}
                        onBlur={(e) => handleUpdateTimeSlot(slot.id, 'sort_order', e.target.value)}
                        onChange={(e) => {
                          const updated = timeSlots.map(t => 
                            t.id === slot.id ? {...t, sort_order: parseInt(e.target.value)} : t
                          );
                          setTimeSlots(updated);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}