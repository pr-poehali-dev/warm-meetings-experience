import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";

type FilterType = "all" | "unverified" | "verified";

interface MastersToolbarProps {
  search: string;
  setSearch: (v: string) => void;
  filter: FilterType;
  setFilter: (v: FilterType) => void;
  unverifiedCount: number;
  onSearch: (e: React.FormEvent) => void;
}

export default function MastersToolbar({
  search,
  setSearch,
  filter,
  setFilter,
  unverifiedCount,
  onSearch,
}: MastersToolbarProps) {
  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Мастера</h2>
          {filter === "unverified" && unverifiedCount > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {unverifiedCount} ожидают верификации
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={onSearch} className="flex gap-2 flex-1">
          <Input
            placeholder="Поиск по имени, городу, телефону..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="outline" size="icon">
            <Icon name="Search" size={16} />
          </Button>
        </form>
        <div className="flex gap-1.5">
          {(["unverified", "all", "verified"] as FilterType[]).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
            >
              {f === "unverified" ? "На проверке" : f === "verified" ? "Верифицированные" : "Все"}
            </Button>
          ))}
        </div>
      </div>
    </>
  );
}
