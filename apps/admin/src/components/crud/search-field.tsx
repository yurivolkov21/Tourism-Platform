import { Search } from 'lucide-react';

import { Input } from '@tourism/ui';

/**
 * Shared admin list search — a GET form that submits on Enter (no separate button). `hidden`
 * preserves other active params (e.g. status); paging resets because `page` is intentionally dropped.
 */
export function AdminSearchField({
  action,
  defaultValue,
  placeholder = 'Search…',
  hidden,
}: {
  action: string;
  defaultValue?: string;
  placeholder?: string;
  hidden?: Record<string, string>;
}) {
  return (
    <form action={action} method="get" className="relative w-full sm:max-w-xs">
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
      <Input
        type="search"
        name="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className="bg-background pl-8"
      />
    </form>
  );
}

export default AdminSearchField;
