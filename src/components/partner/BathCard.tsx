import { Link } from "react-router-dom";
import { PartnerBath, partnerApi } from "@/lib/partner-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface BathCardProps {
  bath: PartnerBath;
  onEdit: (bath: PartnerBath) => void;
  onChanged: () => void;
}

export default function BathCard({ bath, onEdit, onChanged }: BathCardProps) {
  const [toggling, setToggling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();

  const handleToggleActive = async () => {
    setToggling(true);
    try {
      await partnerApi.setActive(bath.id, !bath.is_active);
      onChanged();
    } catch (e: unknown) {
      toast({ title: "Ошибка", description: e instanceof Error ? e.message : "Не удалось изменить статус", variant: "destructive" });
    }
    setToggling(false);
  };

  const handleRequestVerify = async () => {
    setVerifying(true);
    try {
      const res = await partnerApi.requestVerify(bath.id);
      toast({ title: "Заявка отправлена", description: res.message });
      onChanged();
    } catch (e: unknown) {
      toast({ title: "Ошибка", description: e instanceof Error ? e.message : "Не удалось отправить", variant: "destructive" });
    }
    setVerifying(false);
  };

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className="flex gap-0">
        {/* Обложка */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 bg-muted relative">
          {bath.cover_photo ? (
            <img src={String(bath.cover_photo)} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon name="Building2" size={28} className="text-muted-foreground/40" />
            </div>
          )}
          {/* Статус */}
          <div className={`absolute top-1.5 left-1.5 w-2 h-2 rounded-full ${bath.is_active ? "bg-emerald-500" : "bg-gray-400"}`} />
        </div>

        <CardContent className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate leading-tight">{bath.name}</h3>
              <p className="text-xs text-muted-foreground truncate">{bath.address || bath.city || "Адрес не указан"}</p>
            </div>
            {bath.is_verified ? (
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 flex-shrink-0">
                <Icon name="BadgeCheck" size={11} />
                Верифицирована
              </div>
            ) : bath.verification_requested_at ? (
              <div className="flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 rounded-full px-2 py-0.5 flex-shrink-0">
                <Icon name="Clock" size={11} />
                На проверке
              </div>
            ) : null}
          </div>

          {/* Метрики */}
          <div className="flex items-center gap-3 mb-2.5">
            {bath.price_from > 0 && (
              <span className="text-xs text-muted-foreground">от {bath.price_from.toLocaleString()} ₽</span>
            )}
            {bath.views_30d !== undefined && (
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <Icon name="Eye" size={11} />
                {bath.views_30d} за 30 дн.
              </span>
            )}
            {(bath.reviews_count ?? 0) > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <Icon name="Star" size={11} className="text-amber-500" />
                {bath.rating?.toFixed(1)}
              </span>
            )}
          </div>

          {/* Действия */}
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" className="h-7 text-xs px-2.5" onClick={() => onEdit(bath)}>
              <Icon name="Pencil" size={12} className="mr-1" />
              Редактировать
            </Button>
            <Link to={`/baths/${bath.slug}`} target="_blank">
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2">
                <Icon name="ExternalLink" size={12} />
              </Button>
            </Link>
            <Button
              size="sm"
              variant="ghost"
              className={`h-7 text-xs px-2.5 ${bath.is_active ? "text-muted-foreground" : "text-emerald-600"}`}
              onClick={handleToggleActive}
              disabled={toggling}
            >
              {toggling ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name={bath.is_active ? "EyeOff" : "Eye"} size={12} />}
            </Button>
            {!bath.is_verified && !bath.verification_requested_at && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs px-2.5 text-blue-600"
                onClick={handleRequestVerify}
                disabled={verifying}
              >
                {verifying ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name="BadgeCheck" size={12} className="mr-1" />}
                Верифицировать
              </Button>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
