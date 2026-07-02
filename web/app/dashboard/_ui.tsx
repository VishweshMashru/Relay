// Tiny shared UI primitives for the dashboard. Kept in a `_ui` file so
// Next.js doesn't treat it as a route.
import Link from "next/link";

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-neutral-500">{subtitle}</p>}
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col gap-1">
      <span className="text-xs text-neutral-500 uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-medium">{value}</span>
      {hint && <span className="text-xs text-neutral-400">{hint}</span>}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-10 flex flex-col items-center text-center gap-3">
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-sm text-neutral-500 max-w-md">{body}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-2 inline-flex h-9 items-center rounded-md bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 px-4 text-sm font-medium"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}

export function Badge({ tone, children }: { tone: "green" | "neutral" | "amber"; children: React.ReactNode }) {
  const tones = {
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    neutral: "bg-neutral-500/10 text-neutral-500",
  } as const;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-xs text-neutral-500">
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">{children}</tbody>
      </table>
    </div>
  );
}

export function PrimaryButton({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className="h-9 inline-flex items-center rounded-md bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 px-4 text-sm font-medium disabled:opacity-60"
    >
      {children}
    </button>
  );
}
