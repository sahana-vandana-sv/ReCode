"use client";

import { useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import type { ProblemFilters } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Radix Select items can't have an empty value, so "all" means "no filter".
const ALL = "all";

type FilterChanges = Partial<Record<keyof ProblemFilters, string>>;

export function ProblemFilterBar({
  filters,
  topicTags,
  customTags,
}: {
  filters: ProblemFilters;
  topicTags: string[];
  customTags: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchInput = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Filters live in the URL. The server re-validates them on every request,
  // so here they're just strings.
  function apply(changes: FilterChanges) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...filters, ...changes })) {
      if (value) params.set(key, value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  // Wait until typing pauses for 300 ms, instead of reloading on every key.
  function onSearchChange(value: string) {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(
      () => apply({ q: value.trim() || undefined }),
      300,
    );
  }

  function clearAll() {
    clearTimeout(searchTimer.current);
    if (searchInput.current) searchInput.current.value = "";
    router.replace(pathname, { scroll: false });
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      <div className="relative col-span-2 sm:min-w-56 sm:flex-1">
        <Label htmlFor="problem-search" className="sr-only">
          Search problems
        </Label>
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchInput}
          id="problem-search"
          type="search"
          placeholder="Search by number or title"
          defaultValue={filters.q}
          onChange={(event) => onSearchChange(event.target.value)}
          className="pl-8"
        />
      </div>
      <FilterSelect
        label="Status"
        allLabel="All active"
        value={filters.status}
        options={[
          { value: "due", label: "Due" },
          { value: "upcoming", label: "Upcoming" },
          { value: "archived", label: "Archived" },
        ]}
        onChange={(status) => apply({ status })}
      />
      <FilterSelect
        label="Difficulty"
        allLabel="Any difficulty"
        value={filters.difficulty}
        options={[
          { value: "EASY", label: "Easy" },
          { value: "MEDIUM", label: "Medium" },
          { value: "HARD", label: "Hard" },
        ]}
        onChange={(difficulty) => apply({ difficulty })}
      />
      {topicTags.length > 0 && (
        <FilterSelect
          label="Topic"
          allLabel="Any topic"
          value={filters.topic}
          options={topicTags.map((tag) => ({ value: tag, label: tag }))}
          onChange={(topic) => apply({ topic })}
        />
      )}
      {customTags.length > 0 && (
        <FilterSelect
          label="Tag"
          allLabel="Any tag"
          value={filters.tag}
          options={customTags.map((tag) => ({ value: tag, label: tag }))}
          onChange={(tag) => apply({ tag })}
        />
      )}
      {Object.values(filters).some(Boolean) && (
        <Button variant="ghost" onClick={clearAll}>
          <X />
          Clear
        </Button>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  allLabel: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (value: string | undefined) => void;
}) {
  return (
    <Select
      value={value ?? ALL}
      onValueChange={(next) => onChange(next === ALL ? undefined : next)}
    >
      <SelectTrigger aria-label={label} className="w-full sm:w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}