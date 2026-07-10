import { AdminListHeader } from '../../../components/crud/list-header';
import { ErrorAlert } from '../../../components/crud/error-alert';
import { SlotCard } from '../../../components/appearance/slot-card';
import { apiErrorMessage } from '../../../lib/api/error';
import {
  listSiteSlots,
  type AdminSiteSlot,
} from '../../../lib/appearance/data';

/**
 * Appearance — the brand-chrome image slots of the public web (home hero, About
 * story, …), grouped by page. Each slot uploads straight to Cloudinary and PUTs
 * a replace-all set; an unmanaged slot means the web renders its built-in default.
 */
export default async function AppearancePage() {
  let slots: AdminSiteSlot[] = [];
  let error: string | null = null;
  try {
    slots = await listSiteSlots();
  } catch (e) {
    error = apiErrorMessage(e);
  }

  const groups = [...new Set(slots.map((s) => s.group))];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <AdminListHeader
        title="Appearance"
        description="The site's brand imagery — page backdrops and hero photos. Replace any slot, or reset it to the built-in default; the public site picks changes up within a few minutes."
      />

      {error ? (
        <ErrorAlert>
          Couldn&apos;t load the appearance slots: {error}. Check that the API
          is running and your admin session is valid.
        </ErrorAlert>
      ) : (
        groups.map((group) => (
          <section key={group} className="space-y-3">
            <h2 className="font-heading text-lg font-semibold">{group}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {slots
                .filter((s) => s.group === group)
                .map((slot) => (
                  <SlotCard key={slot.key} slot={slot} />
                ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
