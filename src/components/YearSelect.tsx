import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface YearSelectProps {
  value: number;
  onChange: (year: number) => void;
  from?: number;
  to?: number;
}

export function YearSelect({ value, onChange, from = 2020, to = new Date().getFullYear() + 1 }: YearSelectProps) {
  const years = Array.from({ length: to - from + 1 }, (_, i) => to - i);

  return (
    <Select value={String(value)} onValueChange={v => onChange(Number(v))}>
      <SelectTrigger className="w-[100px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {years.map(y => (
          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
