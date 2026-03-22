export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-green-100 text-green-800",
    canceled: "bg-red-100 text-red-800",
    completed: "bg-gray-100 text-gray-800",
    no_show: "bg-orange-100 text-orange-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: "Ожидает",
    confirmed: "Подтверждена",
    canceled: "Отменена",
    completed: "Завершена",
    no_show: "Неявка",
  };
  return labels[status] || status;
};

export const formatDateTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}`;
};

export const formatPrice = (price: number): string => {
  return price.toLocaleString("ru-RU") + " \u20BD";
};

export interface BookingFormData {
  client_name: string;
  client_phone: string;
  client_email: string;
  service_id: string;
  date: string;
  time_start: string;
  time_end: string;
  price: string;
  comment: string;
}

export const emptyForm: BookingFormData = {
  client_name: "",
  client_phone: "",
  client_email: "",
  service_id: "",
  date: "",
  time_start: "10:00",
  time_end: "11:00",
  price: "",
  comment: "",
};
