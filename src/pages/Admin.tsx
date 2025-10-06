import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminEventsList from "@/components/admin/AdminEventsList";
import AdminEventForm from "@/components/admin/AdminEventForm";
import EventDetailDialog from "@/components/admin/EventDetailDialog";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";

interface Event {
  id?: number;
  title: string;
  short_description: string;
  full_description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  occupancy: string;
  price: string;
  event_type: string;
  event_type_icon: string;
  image_url: string;
  is_visible: boolean;
  created_at?: string;
  updated_at?: string;
}

const API_URL = "https://functions.poehali.dev/0d9ea640-f2f5-4e63-8633-db26b10decc8";

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
    price: "",
    event_type: "знакомство",
    event_type_icon: "Users",
    image_url: "",
    is_visible: true,
  });

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const expires = localStorage.getItem("admin_token_expires");
    
    if (token && expires) {
      const expiresDate = new Date(expires);
      if (expiresDate > new Date()) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_token_expires");
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && (currentView === "list" || currentView === "overview")) {
      fetchEvents();
    }
  }, [currentView, isAuthenticated]);

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

  const resetForm = () => {
    setFormData({
      title: "",
      short_description: "",
      full_description: "",
      event_date: "",
      start_time: "",
      end_time: "",
      occupancy: "low",
      price: "",
      event_type: "знакомство",
      event_type_icon: "Users",
      image_url: "",
      is_visible: true,
    });
  };

  const handleLoginSuccess = (token: string) => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_token_expires");
    setIsAuthenticated(false);
    toast({
      title: "Выход выполнен",
      description: "Вы вышли из админ-панели",
    });
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

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <AdminSidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          onNewEvent={resetForm}
          onLogout={handleLogout}
        />

        <main className="flex-1 p-8">
          {currentView === "overview" && (
            <AdminOverview
              events={events}
              getOccupancyLabel={getOccupancyLabel}
              getOccupancyColor={getOccupancyColor}
            />
          )}

          {currentView === "list" && (
            <AdminEventsList
              events={events}
              loading={loading}
              searchTerm={searchTerm}
              filterOccupancy={filterOccupancy}
              onSearchChange={setSearchTerm}
              onFilterChange={setFilterOccupancy}
              onSearch={fetchEvents}
              onNewEvent={() => {
                resetForm();
                setCurrentView("add");
              }}
              onEdit={handleEdit}
              onToggleVisibility={toggleVisibility}
              onDeleteRequest={(id) => {
                setEventToDelete(id);
                setIsDeleteConfirmOpen(true);
              }}
              onViewDetails={(event) => {
                setSelectedEvent(event);
                setIsDetailOpen(true);
              }}
              getOccupancyLabel={getOccupancyLabel}
              getOccupancyColor={getOccupancyColor}
            />
          )}

          {currentView === "add" && (
            <AdminEventForm
              formData={formData}
              loading={loading}
              onFormChange={setFormData}
              onSubmit={handleSubmit}
              onCancel={() => setCurrentView("list")}
            />
          )}
        </main>
      </div>

      <EventDetailDialog
        open={isDetailOpen}
        event={selectedEvent}
        onOpenChange={setIsDetailOpen}
        getOccupancyLabel={getOccupancyLabel}
        getOccupancyColor={getOccupancyColor}
      />

      <DeleteConfirmDialog
        open={isDeleteConfirmOpen}
        loading={loading}
        onOpenChange={setIsDeleteConfirmOpen}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default Admin;