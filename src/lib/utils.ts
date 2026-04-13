export function formatPrice(min: number | null, max: number | null): string {
  if (min === null && max === null) return 'TBD';
  const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (min === null) return fmt(max!);
  if (max === null) return fmt(min);
  if (min === max) return fmt(min);
  return `${fmt(min)} – ${fmt(max)}`;
}

export function calcTotal(min: number | null, max: number | null): { low: number; high: number } {
  return { low: min ?? 0, high: max ?? min ?? 0 };
}
