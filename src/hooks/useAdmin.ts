import { useState, useEffect, useCallback } from "react";
import { AdminEvent, ViewType, emptyEvent } from "@/types/admin";
import { eventsApi, EventFromAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function useAdmin() {
  const [token, setToken] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>("master-calendar");
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [formData, setFormData] = useState<AdminEvent>({ ...emptyEvent });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const savedToken = localStorage.getItem("admin_token");
    const expires = localStorage.getItem("admin_token_expires");
    if (savedToken && expires && new Date(expires) > new Date()) {
      setToken(savedToken);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const data = await eventsApi.getAll(false);
      setEvents(data.map((e: EventFromAPI) => ({
        id: e.id,
        title: e.title,
        short_description: e.short_description || "",
        full_description: e.full_description || "",
        event_date: e.event_date,
        start_time: e.start_time?.slice(0, 5) || "19:00",
        end_time: e.end_time?.slice(0, 5) || "23:00",
        occupancy: e.occupancy || "low",
        price: e.price || e.price_label || "",
        event_type: e.event_type || "знакомство",
        event_type_icon: e.event_type_icon || "Users",
        image_url: e.image_url || "",
        is_visible: e.is_visible ?? true,
        slug: e.slug,
        bath_name: e.bath_name || "",
        bath_address: e.bath_address || "",
        description: e.description || "",
        program: e.program || [],
        rules: e.rules || [],
        price_amount: e.price_amount || 0,
        price_label: e.price_label || "",
        total_spots: e.total_spots || 0,
        spots_left: e.spots_left || 0,
        featured: e.featured || false,
        created_at: e.created_at,
        updated_at: e.updated_at,
      })));
    } catch {
      toast({ title: "Ошибка загрузки событий", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    if (token) fetchEvents();
  }, [token, fetchEvents]);

  const handleSubmit = async (e: React.FormEvent, saveAndNew: boolean) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (formData.id) {
        await eventsApi.update({
          id: formData.id,
          title: formData.title,
          short_description: formData.short_description,
          full_description: formData.full_description,
          description: formData.description || formData.short_description,
          event_date: formData.event_date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          event_type: formData.event_type,
          event_type_icon: formData.event_type_icon,
          occupancy: formData.occupancy,
          bath_name: formData.bath_name || "",
          bath_address: formData.bath_address || "",
          image_url: formData.image_url,
          price: formData.price,
          price_amount: formData.price_amount || 0,
          price_label: formData.price_label || formData.price,
          total_spots: formData.total_spots || 0,
          spots_left: formData.spots_left || 0,
          featured: formData.featured || false,
          is_visible: formData.is_visible,
          program: formData.program || [],
          rules: formData.rules || [],
        } as Partial<EventFromAPI> & { id: number });
        toast({ title: "Событие обновлено" });
      } else {
        await eventsApi.create({
          title: formData.title,
          short_description: formData.short_description,
          full_description: formData.full_description,
          description: formData.description || formData.short_description,
          event_date: formData.event_date,
          start_time: formData.start_time || "19:00",
          end_time: formData.end_time || "23:00",
          event_type: formData.event_type,
          event_type_icon: formData.event_type_icon,
          occupancy: formData.occupancy,
          bath_name: formData.bath_name || "",
          bath_address: formData.bath_address || "",
          image_url: formData.image_url,
          price: formData.price,
          price_amount: formData.price_amount || 0,
          price_label: formData.price_label || formData.price,
          total_spots: formData.total_spots || 0,
          spots_left: formData.spots_left || 0,
          featured: formData.featured || false,
          is_visible: formData.is_visible,
          program: formData.program || [],
          rules: formData.rules || [],
        } as Partial<EventFromAPI>);
        toast({ title: "Событие создано" });
      }
      await fetchEvents();
      if (saveAndNew) {
        setFormData({ ...emptyEvent });
      } else {
        setCurrentView("list");
      }
    } catch {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (event: AdminEvent) => {
    setFormData({ ...event });
    setCurrentView("add");
  };

  const handleDuplicate = (event: AdminEvent) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];
    setFormData({
      ...event,
      id: undefined,
      title: `${event.title} (копия)`,
      event_date: dateStr,
      is_visible: false,
      slug: undefined,
      spots_left: event.total_spots || 0,
    });
    setCurrentView("add");
    toast({ title: "Мероприятие скопировано — отредактируйте и сохраните" });
  };

  const handleRepeat = async (
    event: AdminEvent,
    dates: string[]
  ) => {
    setLoading(true);
    let created = 0;
    for (const date of dates) {
      try {
        await eventsApi.create({
          title: event.title,
          short_description: event.short_description,
          full_description: event.full_description,
          description: event.description || event.short_description,
          event_date: date,
          start_time: event.start_time || "19:00",
          end_time: event.end_time || "23:00",
          event_type: event.event_type,
          event_type_icon: event.event_type_icon,
          occupancy: event.occupancy,
          bath_name: event.bath_name || "",
          bath_address: event.bath_address || "",
          image_url: event.image_url,
          price: event.price,
          price_amount: event.price_amount || 0,
          price_label: event.price_label || event.price,
          total_spots: event.total_spots || 0,
          spots_left: event.total_spots || 0,
          featured: event.featured || false,
          is_visible: event.is_visible,
          program: event.program || [],
          rules: event.rules || [],
        } as Partial<EventFromAPI>);
        created++;
      } catch {
        /* skip failed */
      }
    }
    await fetchEvents();
    setLoading(false);
    toast({
      title: `Создано ${created} из ${dates.length} мероприятий`,
    });
  };

  const handleDelete = async (id: number) => {
    try {
      await eventsApi.remove(id);
      toast({ title: "Событие скрыто" });
      await fetchEvents();
    } catch {
      toast({ title: "Ошибка удаления", variant: "destructive" });
    }
  };

  const handleToggleVisibility = async (event: AdminEvent) => {
    if (!event.id) return;
    try {
      await eventsApi.update({ id: event.id, is_visible: !event.is_visible } as Partial<EventFromAPI> & { id: number });
      await fetchEvents();
    } catch {
      toast({ title: "Ошибка", variant: "destructive" });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_token_expires");
    setToken(null);
  };

  const resetFormData = () => {
    setFormData({ ...emptyEvent });
  };

  return {
    token,
    setToken,
    currentView,
    setCurrentView,
    events,
    formData,
    setFormData,
    loading,
    handleSubmit,
    handleEdit,
    handleDuplicate,
    handleRepeat,
    handleDelete,
    handleToggleVisibility,
    handleLogout,
    resetFormData,
  };
}