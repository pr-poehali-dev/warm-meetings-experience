import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { userProfileApi, FavoriteItem } from "@/lib/user-api";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";

export default function FavoritesSection() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);

  useEffect(() => {
    userProfileApi.getFavorites()
      .then((d) => setFavorites(d.favorites))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (item: FavoriteItem) => {
    setRemoving(item.id);
    try {
      await userProfileApi.removeFavorite(item.item_type, item.item_id);
      setFavorites((prev) => prev.filter((f) => f.id !== item.id));
    } catch (_e) { /* ignore */ }
    setRemoving(null);
  };

  const baths = favorites.filter((f) => f.item_type === "bath");
  const masters = favorites.filter((f) => f.item_type === "master");

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <Icon name="Loader2" size={16} className="animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Загрузка...</span>
        </CardContent>
      </Card>
    );
  }

  if (favorites.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Icon name="Heart" size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">Избранное пусто</p>
          <p className="text-xs text-muted-foreground">Добавляйте бани и мастеров в избранное для быстрого доступа</p>
          <div className="flex gap-2 justify-center mt-4">
            <Link to="/baths" className="text-xs text-primary hover:underline">Посмотреть бани</Link>
            <span className="text-xs text-muted-foreground">·</span>
            <Link to="/masters" className="text-xs text-primary hover:underline">Найти мастера</Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {baths.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">Бани</h3>
          <div className="space-y-2">
            {baths.map((item) => (
              <FavoriteCard key={item.id} item={item} onRemove={handleRemove} removing={removing === item.id} linkPrefix="/baths" />
            ))}
          </div>
        </div>
      )}
      {masters.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">Мастера</h3>
          <div className="space-y-2">
            {masters.map((item) => (
              <FavoriteCard key={item.id} item={item} onRemove={handleRemove} removing={removing === item.id} linkPrefix="/masters" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FavoriteCard({ item, onRemove, removing, linkPrefix }: {
  item: FavoriteItem;
  onRemove: (item: FavoriteItem) => void;
  removing: boolean;
  linkPrefix: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted flex-shrink-0 overflow-hidden">
          {item.image ? (
            <img src={item.image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon name={item.item_type === "bath" ? "Waves" : "User"} size={18} className="text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Link to={`${linkPrefix}/${item.slug}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block">
            {item.name}
          </Link>
          {item.subtitle && (
            <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
          )}
        </div>
        <button
          onClick={() => onRemove(item)}
          disabled={removing}
          className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors flex-shrink-0"
        >
          {removing ? (
            <Icon name="Loader2" size={14} className="animate-spin text-muted-foreground" />
          ) : (
            <Icon name="HeartOff" size={14} className="text-muted-foreground hover:text-destructive transition-colors" />
          )}
        </button>
      </CardContent>
    </Card>
  );
}