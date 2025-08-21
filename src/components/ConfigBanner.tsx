import { useMemo } from 'react';
import { validateConfig } from '@/lib/validateConfig';
import { AlertTriangle } from 'lucide-react';

export function ConfigBanner() {
  // In development show a non-blocking banner with validation warnings
  const { warnings } = useMemo(() => {
    try {
      // Do not throw in dev; in prod, validateConfig() in main will already fail-fast
      return validateConfig({ strict: false });
    } catch {
      // If something throws here (shouldn't in dev), fail silently to avoid render crashes
      return { errors: [], warnings: [] };
    }
  }, []);

  if (import.meta.env.PROD) return null;
  if (!warnings.length) return null;

  return (
    <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-yellow-900">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600" />
        <div>
          <p className="font-semibold">Configuration warnings (development)</p>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-yellow-700">
            These warnings do not block development. In production, missing/invalid configuration will block startup.
          </p>
        </div>
      </div>
    </div>
  );
}