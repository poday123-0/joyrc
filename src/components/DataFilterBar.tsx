import { useState, useMemo, useCallback } from "react";
import { Search, X, Calendar as CalendarIcon, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from "date-fns";

export type PeriodFilter = "all" | "today" | "week" | "month" | "year" | "custom";

interface StatusOption {
  value: string;
  label: string;
  color?: string;
}

interface DataFilterBarProps {
  searchPlaceholder?: string;
  statusOptions?: StatusOption[];
  statusLabel?: string;
  onFiltersChange: (filters: FilterState) => void;
}

export interface FilterState {
  search: string;
  period: PeriodFilter;
  status: string;
  customDateRange: { from: Date | undefined; to: Date | undefined };
}

const periodOptions: { value: PeriodFilter; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "custom", label: "Custom" },
];

export function useDataFilter<T>(
  data: T[],
  getDate: (item: T) => string,
  getSearchText: (item: T) => string,
  getStatus?: (item: T) => string,
) {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    period: "all",
    status: "all",
    customDateRange: { from: undefined, to: undefined },
  });

  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Search filter
    if (filters.search.trim()) {
      const search = filters.search.toLowerCase().trim();
      filtered = filtered.filter(item => getSearchText(item).toLowerCase().includes(search));
    }

    // Status filter
    if (filters.status !== "all" && getStatus) {
      filtered = filtered.filter(item => getStatus(item) === filters.status);
    }

    // Period filter
    if (filters.period !== "all") {
      const now = new Date();
      let start: Date;
      let end: Date;

      switch (filters.period) {
        case "today":
          start = startOfDay(now);
          end = endOfDay(now);
          break;
        case "week":
          start = startOfWeek(now, { weekStartsOn: 1 });
          end = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case "month":
          start = startOfMonth(now);
          end = endOfMonth(now);
          break;
        case "year":
          start = startOfYear(now);
          end = endOfYear(now);
          break;
        case "custom":
          if (filters.customDateRange.from && filters.customDateRange.to) {
            start = startOfDay(filters.customDateRange.from);
            end = endOfDay(filters.customDateRange.to);
          } else {
            return filtered;
          }
          break;
        default:
          return filtered;
      }

      filtered = filtered.filter(item => {
        const itemDate = new Date(getDate(item));
        return isWithinInterval(itemDate, { start, end });
      });
    }

    return filtered;
  }, [data, filters, getSearchText, getStatus, getDate]);

  return { filters, setFilters, filteredData };
}

export const DataFilterBar = ({
  searchPlaceholder = "Search...",
  statusOptions,
  statusLabel = "Status",
  onFiltersChange,
}: DataFilterBarProps) => {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [status, setStatus] = useState("all");
  const [showPeriodOptions, setShowPeriodOptions] = useState(false);
  const [showStatusOptions, setShowStatusOptions] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const emitChange = useCallback((updates: Partial<FilterState>) => {
    const newFilters = {
      search,
      period,
      status,
      customDateRange,
      ...updates,
    };
    onFiltersChange(newFilters);
  }, [search, period, status, customDateRange, onFiltersChange]);

  const hasActiveFilters = period !== "all" || status !== "all" || search.trim() !== "";

  const clearFilters = () => {
    setSearch("");
    setPeriod("all");
    setStatus("all");
    setCustomDateRange({ from: undefined, to: undefined });
    onFiltersChange({ search: "", period: "all", status: "all", customDateRange: { from: undefined, to: undefined } });
  };

  return (
    <div className="mb-4 p-3 bg-muted/30 rounded-xl border border-border/50 space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            emitChange({ search: e.target.value });
          }}
          placeholder={searchPlaceholder}
          className="pl-9 h-9 text-sm"
        />
        {search && (
          <button
            onClick={() => {
              setSearch("");
              emitChange({ search: "" });
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Time Period */}
      <div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setShowPeriodOptions(!showPeriodOptions)}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
              period === "all"
                ? "bg-muted/50 text-muted-foreground hover:bg-muted"
                : "bg-primary text-primary-foreground"
            )}
          >
            {periodOptions.find(o => o.value === period)?.label || "All Time"}
            {showPeriodOptions ? <ChevronUp className="w-3 h-3 ml-1 inline" /> : <ChevronDown className="w-3 h-3 ml-1 inline" />}
          </button>
          {showPeriodOptions && periodOptions.filter(o => o.value !== period).map(option => (
            <button
              key={option.value}
              onClick={() => {
                setPeriod(option.value);
                setShowPeriodOptions(false);
                if (option.value !== "custom") {
                  setCustomDateRange({ from: undefined, to: undefined });
                }
                emitChange({ period: option.value, customDateRange: option.value !== "custom" ? { from: undefined, to: undefined } : customDateRange });
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors bg-muted/50 text-muted-foreground hover:bg-muted"
            >
              {option.label}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg text-xs">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {customDateRange.from ? format(customDateRange.from, "MMM d, yyyy") : "Start date"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customDateRange.from}
                  onSelect={(date) => {
                    const newRange = { ...customDateRange, from: date };
                    setCustomDateRange(newRange);
                    emitChange({ customDateRange: newRange });
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">to</span>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg text-xs">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {customDateRange.to ? format(customDateRange.to, "MMM d, yyyy") : "End date"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customDateRange.to}
                  onSelect={(date) => {
                    const newRange = { ...customDateRange, to: date };
                    setCustomDateRange(newRange);
                    emitChange({ customDateRange: newRange });
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Status Filter */}
      {statusOptions && statusOptions.length > 0 && (
        <div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setShowStatusOptions(!showStatusOptions)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                status === "all"
                  ? "bg-muted/50 text-muted-foreground hover:bg-muted"
                  : statusOptions.find(o => o.value === status)?.color || "bg-primary text-primary-foreground"
              )}
            >
              {statusOptions.find(o => o.value === status)?.label || "All Status"}
            </button>
            {showStatusOptions && statusOptions.filter(o => o.value !== status).map(option => (
              <button
                key={option.value}
                onClick={() => {
                  setStatus(option.value);
                  setShowStatusOptions(false);
                  emitChange({ status: option.value });
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors bg-muted/50 text-muted-foreground hover:bg-muted"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors"
        >
          <X className="w-3 h-3" />
          Clear filters
        </button>
      )}
    </div>
  );
};
