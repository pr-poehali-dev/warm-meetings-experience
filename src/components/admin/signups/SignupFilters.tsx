import { FilterTab } from "./signupTypes";

interface SignupFiltersProps {
  tabs: FilterTab[];
  activeFilter: string;
  onFilterChange: (value: string) => void;
}

export default function SignupFilters({ tabs, activeFilter, onFilterChange }: SignupFiltersProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <h1 className="text-3xl font-bold text-gray-800">Записи на событие</h1>
      <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onFilterChange(tab.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeFilter === tab.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 opacity-70">{tab.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
