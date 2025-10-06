import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Icon from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Event {
  id?: number;
  title: string;
  short_description: string;
  full_description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  occupancy: string;
  image_url: string;
  is_visible: boolean;
  created_at?: string;
  updated_at?: string;
}

const API_URL = "https://functions.poehali.dev/0d9ea640-f2f5-4e63-8633-db26b10decc8";

const Admin = () => {
  const [currentView, setCurrentView] = useState<"overview" | "list" | "add">("overview");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOccupancy, setFilterOccupancy] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<number | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<Event>({
    title: "",
    short_description: "",
    full_description: "",
    event_date: "",
    start_time: "",
    end_time: "",
    occupancy: "low",
    image_url: "",
    is_visible: true,
  });

  useEffect(() => {
    if (currentView === "list" || currentView === "overview") {
      fetchEvents();
    }
  }, [currentView]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}?visible=false`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (filterOccupancy) url += `&occupancy=${filterOccupancy}`;

      const response = await fetch(url);
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить мероприятия",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, saveAndNew = false) => {
    e.preventDefault();
    setLoading(true);

    try {
      const method = formData.id ? "PUT" : "POST";
      const response = await fetch(API_URL, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save event");

      toast({
        title: "Успешно!",
        description: formData.id ? "Мероприятие обновлено" : "Мероприятие создано",
      });

      if (saveAndNew) {
        setFormData({
          title: "",
          short_description: "",
          full_description: "",
          event_date: "",
          start_time: "",
          end_time: "",
          occupancy: "low",
          image_url: "",
          is_visible: true,
        });
      } else {
        setCurrentView("list");
      }

      fetchEvents();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить мероприятие",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (event: Event) => {
    setFormData(event);
    setCurrentView("add");
  };

  const handleDelete = async () => {
    if (!eventToDelete) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?id=${eventToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete event");

      toast({
        title: "Успешно!",
        description: "Мероприятие удалено",
      });

      fetchEvents();
      setIsDeleteConfirmOpen(false);
      setEventToDelete(null);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить мероприятие",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = async (event: Event) => {
    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...event,
          is_visible: !event.is_visible,
        }),
      });

      if (!response.ok) throw new Error("Failed to update visibility");

      toast({
        title: "Успешно!",
        description: event.is_visible ? "Мероприятие скрыто" : "Мероприятие опубликовано",
      });

      fetchEvents();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось изменить видимость",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getOccupancyLabel = (occupancy: string) => {
    const labels: Record<string, string> = {
      low: "Низкая",
      medium: "Средняя",
      high: "Высокая",
      full: "Полная",
    };
    return labels[occupancy] || occupancy;
  };

  const getOccupancyColor = (occupancy: string) => {
    const colors: Record<string, string> = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      full: "bg-red-100 text-red-800",
    };
    return colors[occupancy] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen p-6">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800">Админ-панель</h2>
            <p className="text-sm text-gray-500">Управление мероприятиями</p>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setCurrentView("overview")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === "overview"
                  ? "bg-nature-moss text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon name="LayoutDashboard" size={20} />
              <span>Обзор</span>
            </button>

            <button
              onClick={() => setCurrentView("list")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === "list"
                  ? "bg-nature-moss text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon name="List" size={20} />
              <span>Все мероприятия</span>
            </button>

            <button
              onClick={() => {
                setFormData({
                  title: "",
                  short_description: "",
                  full_description: "",
                  event_date: "",
                  start_time: "",
                  end_time: "",
                  occupancy: "low",
                  image_url: "",
                  is_visible: true,
                });
                setCurrentView("add");
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === "add"
                  ? "bg-nature-moss text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon name="Plus" size={20} />
              <span>Добавить мероприятие</span>
            </button>

            <div className="pt-6 mt-6 border-t border-gray-200">
              <Link
                to="/events"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Icon name="ArrowLeft" size={20} />
                <span>На сайт</span>
              </Link>
            </div>
          </nav>
        </aside>

        <main className="flex-1 p-8">
          {currentView === "overview" && (
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-6">Обзор</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-gray-600">Всего мероприятий</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-gray-800">{events.length}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-gray-600">Опубликовано</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-600">
                      {events.filter((e) => e.is_visible).length}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-gray-600">Скрыто</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-gray-600">
                      {events.filter((e) => !e.is_visible).length}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Последние мероприятия</CardTitle>
                </CardHeader>
                <CardContent>
                  {events.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div>
                        <p className="font-medium text-gray-800">{event.title}</p>
                        <p className="text-sm text-gray-500">{event.event_date}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getOccupancyColor(
                          event.occupancy
                        )}`}
                      >
                        {getOccupancyLabel(event.occupancy)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {currentView === "list" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Все мероприятия</h1>
                <Button onClick={() => {
                  setFormData({
                    title: "",
                    short_description: "",
                    full_description: "",
                    event_date: "",
                    start_time: "",
                    end_time: "",
                    occupancy: "low",
                    image_url: "",
                    is_visible: true,
                  });
                  setCurrentView("add");
                }}>
                  <Icon name="Plus" size={16} className="mr-2" />
                  Добавить
                </Button>
              </div>

              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Поиск по названию..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Select value={filterOccupancy} onValueChange={setFilterOccupancy}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Загруженность" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=" ">Все</SelectItem>
                        <SelectItem value="low">Низкая</SelectItem>
                        <SelectItem value="medium">Средняя</SelectItem>
                        <SelectItem value="high">Высокая</SelectItem>
                        <SelectItem value="full">Полная</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={fetchEvents}>
                      <Icon name="Search" size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Загрузка...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.map((event) => (
                    <Card key={event.id} className="overflow-hidden">
                      {event.image_url && (
                        <img
                          src={event.image_url}
                          alt={event.title}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-bold text-lg text-gray-800">{event.title}</h3>
                          {!event.is_visible && (
                            <Icon name="EyeOff" size={16} className="text-gray-400" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{event.short_description}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                          <Icon name="Calendar" size={14} />
                          <span>{event.event_date}</span>
                        </div>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-4 ${getOccupancyColor(
                            event.occupancy
                          )}`}
                        >
                          {getOccupancyLabel(event.occupancy)}
                        </span>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedEvent(event);
                              setIsDetailOpen(true);
                            }}
                            className="flex-1"
                          >
                            Подробнее
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(event)}
                          >
                            <Icon name="Edit" size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleVisibility(event)}
                          >
                            <Icon name={event.is_visible ? "EyeOff" : "Eye"} size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEventToDelete(event.id!);
                              setIsDeleteConfirmOpen(true);
                            }}
                          >
                            <Icon name="Trash2" size={14} />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentView === "add" && (
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-6">
                {formData.id ? "Редактировать мероприятие" : "Добавить мероприятие"}
              </h1>

              <Card>
                <CardContent className="pt-6">
                  <form onSubmit={(e) => handleSubmit(e, false)}>
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="title">Название мероприятия *</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="short_description">
                          Краткое описание (до 200 символов)
                        </Label>
                        <Input
                          id="short_description"
                          value={formData.short_description}
                          onChange={(e) =>
                            setFormData({ ...formData, short_description: e.target.value })
                          }
                          maxLength={200}
                        />
                      </div>

                      <div>
                        <Label htmlFor="full_description">Полное описание</Label>
                        <Textarea
                          id="full_description"
                          value={formData.full_description}
                          onChange={(e) =>
                            setFormData({ ...formData, full_description: e.target.value })
                          }
                          rows={6}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="event_date">Дата мероприятия *</Label>
                          <Input
                            id="event_date"
                            type="date"
                            value={formData.event_date}
                            onChange={(e) =>
                              setFormData({ ...formData, event_date: e.target.value })
                            }
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="start_time">Время начала</Label>
                          <Input
                            id="start_time"
                            type="time"
                            value={formData.start_time}
                            onChange={(e) =>
                              setFormData({ ...formData, start_time: e.target.value })
                            }
                          />
                        </div>

                        <div>
                          <Label htmlFor="end_time">Время окончания</Label>
                          <Input
                            id="end_time"
                            type="time"
                            value={formData.end_time}
                            onChange={(e) =>
                              setFormData({ ...formData, end_time: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="occupancy">Загруженность</Label>
                        <Select
                          value={formData.occupancy}
                          onValueChange={(value) => setFormData({ ...formData, occupancy: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Низкая</SelectItem>
                            <SelectItem value="medium">Средняя</SelectItem>
                            <SelectItem value="high">Высокая</SelectItem>
                            <SelectItem value="full">Полная</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="image_url">URL изображения</Label>
                        <Input
                          id="image_url"
                          type="url"
                          value={formData.image_url}
                          onChange={(e) =>
                            setFormData({ ...formData, image_url: e.target.value })
                          }
                          placeholder="https://example.com/image.jpg"
                        />
                        {formData.image_url && (
                          <img
                            src={formData.image_url}
                            alt="Preview"
                            className="mt-4 w-full max-w-md h-48 object-cover rounded-lg"
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="is_visible"
                          checked={formData.is_visible}
                          onChange={(e) =>
                            setFormData({ ...formData, is_visible: e.target.checked })
                          }
                          className="w-4 h-4"
                        />
                        <Label htmlFor="is_visible" className="cursor-pointer">
                          Опубликовать мероприятие
                        </Label>
                      </div>

                      <div className="flex gap-3">
                        <Button type="submit" disabled={loading}>
                          {loading ? "Сохранение..." : "Сохранить"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => handleSubmit(e as any, true)}
                          disabled={loading}
                        >
                          Сохранить и добавить новое
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCurrentView("list")}
                        >
                          Отмена
                        </Button>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedEvent.title}</DialogTitle>
                <DialogDescription>
                  {selectedEvent.event_date} | {selectedEvent.start_time} - {selectedEvent.end_time}
                </DialogDescription>
              </DialogHeader>

              {selectedEvent.image_url && (
                <img
                  src={selectedEvent.image_url}
                  alt={selectedEvent.title}
                  className="w-full h-64 object-cover rounded-lg"
                />
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Краткое описание</h3>
                  <p className="text-gray-600">{selectedEvent.short_description}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Полное описание</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">
                    {selectedEvent.full_description}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-medium ${getOccupancyColor(
                      selectedEvent.occupancy
                    )}`}
                  >
                    Загруженность: {getOccupancyLabel(selectedEvent.occupancy)}
                  </span>

                  <span
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      selectedEvent.is_visible
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {selectedEvent.is_visible ? "Опубликовано" : "Скрыто"}
                  </span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтверждение удаления</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить это мероприятие? Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? "Удаление..." : "Удалить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
