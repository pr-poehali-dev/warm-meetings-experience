import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";

export interface AdminMaster {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  bio: string;
  city: string;
  phone: string;
  telegram: string;
  instagram: string;
  avatar: string;
  rating: number;
  reviews_count: number;
  price_from: number;
  experience_years: number;
  specializations?: { id: number; name: string; slug: string }[];
  baths?: { id: number; name: string; city: string; address: string }[];
  photos?: string[];
  portfolio?: string[];
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

interface MasterCardProps {
  master: AdminMaster;
  processing: number | null;
  onOpen: (master: AdminMaster) => void;
  onVerify: (id: number, is_verified: boolean) => void;
  onToggleActive: (id: number, is_active: boolean) => void;
}

export default function MasterCard({
  master,
  processing,
  onOpen,
  onVerify,
  onToggleActive,
}: MasterCardProps) {
  return (
    <Card key={master.id} className={!master.is_active ? "opacity-60" : ""}>
      <CardContent className="py-4 px-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-muted flex-shrink-0 overflow-hidden">
            {master.avatar ? (
              <img src={master.avatar} alt={master.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon name="User" size={20} className="text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{master.name}</span>
              {master.is_verified && (
                <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-600">
                  <Icon name="ShieldCheck" size={11} className="mr-1" />
                  Верифицирован
                </Badge>
              )}
              {!master.is_active && (
                <Badge variant="secondary" className="text-xs">Скрыт</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
              {master.city && <span>{master.city}</span>}
              {master.phone && <span>{master.phone}</span>}
              {master.telegram && <span>@{master.telegram.replace("@", "")}</span>}
              {master.price_from > 0 && <span>от {master.price_from.toLocaleString("ru")} ₽</span>}
              {master.rating > 0 && (
                <span className="flex items-center gap-0.5">
                  <Icon name="Star" size={11} className="text-amber-400" />
                  {master.rating.toFixed(1)} ({master.reviews_count})
                </span>
              )}
            </div>
            {master.tagline && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{master.tagline}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              Добавлен: {new Date(master.created_at).toLocaleDateString("ru-RU")}
            </p>
          </div>

          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8"
              onClick={() => onOpen(master)}
            >
              <Icon name="Eye" size={13} className="mr-1" />
              Открыть
            </Button>
            {!master.is_verified ? (
              <Button
                size="sm"
                className="text-xs h-8"
                onClick={() => onVerify(master.id, true)}
                disabled={processing === master.id}
              >
                {processing === master.id ? (
                  <Icon name="Loader2" size={13} className="animate-spin mr-1" />
                ) : (
                  <Icon name="ShieldCheck" size={13} className="mr-1" />
                )}
                Верифицировать
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 text-muted-foreground"
                onClick={() => onVerify(master.id, false)}
                disabled={processing === master.id}
              >
                <Icon name="ShieldOff" size={13} className="mr-1" />
                Снять
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-8 text-muted-foreground"
              onClick={() => onToggleActive(master.id, !master.is_active)}
              disabled={processing === master.id}
            >
              <Icon name={master.is_active ? "EyeOff" : "Eye"} size={13} className="mr-1" />
              {master.is_active ? "Скрыть" : "Показать"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
