import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Icon from "@/components/ui/icon";
import { signupsApi, SignupFromAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const AdminEventSignups = () => {
  const [signups, setSignups] = useState<SignupFromAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSignups = async () => {
    try {
      const data = await signupsApi.getAll();
      setSignups(data);
    } catch {
      toast({ title: "Ошибка загрузки заявок", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSignups(); }, []);

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await signupsApi.updateStatus(id, status);
      toast({ title: "Статус обновлён" });
      fetchSignups();
    } catch {
      toast({ title: "Ошибка обновления", variant: "destructive" });
    }
  };

  const statusLabels: Record<string, string> = {
    new: "Новая",
    confirmed: "Подтверждена",
    cancelled: "Отменена",
  };

  const statusColors: Record<string, string> = {
    new: "bg-blue-100 text-blue-800",
    confirmed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Icon name="Loader2" size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Заявки на события</h1>

      {signups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Icon name="Inbox" size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Заявок пока нет</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {signups.map((signup) => (
            <Card key={signup.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{signup.name}</div>
                  <div className="text-sm text-gray-500">
                    {signup.phone}
                    {signup.telegram && ` · ${signup.telegram}`}
                  </div>
                  {signup.event_title && (
                    <div className="text-xs text-gray-400 mt-1">
                      {signup.event_title} · {signup.event_date}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColors[signup.status] || "bg-gray-100 text-gray-800"}`}>
                    {statusLabels[signup.status] || signup.status}
                  </span>
                  <Select value={signup.status} onValueChange={(v) => handleStatusChange(signup.id, v)}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Новая</SelectItem>
                      <SelectItem value="confirmed">Подтверждена</SelectItem>
                      <SelectItem value="cancelled">Отменена</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminEventSignups;
