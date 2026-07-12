import {
  cn,
  FieldLegend,
  FieldSet,
  ToggleGroup,
  ToggleGroupItem,
} from '@tourism/ui';

// Pill-style choice chips, built on the design-system ToggleGroup (keeps the primary-filled look
// while gaining real toggle semantics + keyboard support over plain native buttons). Shared by
// PlanTripForm (duration/budget/interests) and the Contact form (budgetTier).
const chipItem = cn(
  'rounded-full border border-border bg-background px-3.5 text-sm font-medium text-muted-foreground',
  'hover:border-foreground/30 hover:bg-background hover:text-foreground',
  'aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground',
  'aria-pressed:hover:border-primary aria-pressed:hover:bg-primary aria-pressed:hover:text-primary-foreground',
);

export function ChoiceChips({
  legend,
  options,
  value,
  multiple,
  onChange,
}: {
  legend: string;
  options: readonly string[];
  value: string[];
  multiple?: boolean;
  onChange: (value: string[]) => void;
}) {
  return (
    <FieldSet className="gap-2">
      <FieldLegend variant="label">{legend}</FieldLegend>
      <ToggleGroup
        multiple={multiple}
        value={value}
        onValueChange={(next) => onChange(next as string[])}
        className="w-full flex-wrap"
      >
        {options.map((opt) => (
          <ToggleGroupItem key={opt} value={opt} className={chipItem}>
            {opt}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </FieldSet>
  );
}

export default ChoiceChips;
