import Link from "next/link";
import { Camera as CameraIcon } from "lucide-react";

// Placeholder cameras. In v1 these become real camera IDs pre-seeded in the
// Relay account that owns this deployment.
const cameras = [
  { id: "demo-front", name: "Front Door", location: "Reception" },
  { id: "demo-floor", name: "Assembly Floor", location: "Manufacturing" },
  { id: "demo-warehouse", name: "Warehouse Gate", location: "Loading Bay" },
  { id: "demo-parking", name: "Parking Lot", location: "West Side" },
];

export default function ShowcaseGrid() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-medium">Your cameras</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Click any camera to open a live view. Streams start on demand — nothing is on until you press play.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cameras.map((c) => (
          <Link
            key={c.id}
            href={`/showcase/watch/${c.id}`}
            className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors group"
          >
            <div className="aspect-video bg-neutral-100 dark:bg-neutral-900 relative flex items-center justify-center">
              <CameraIcon className="w-8 h-8 text-neutral-400" />
              <span className="absolute top-2 left-2 text-xs rounded bg-black/70 text-white px-2 py-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                idle
              </span>
            </div>
            <div className="p-4">
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{c.location}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
