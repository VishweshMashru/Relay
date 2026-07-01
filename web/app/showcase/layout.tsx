import Link from "next/link";

// This is a REFERENCE APP — an example of what a customer built on Relay
// might look like. Not our developer dashboard. Feel free to fork.
export const metadata = {
  title: "SentryCam — powered by Relay",
};

export default function ShowcaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
        <Link href="/showcase" className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-red-500 flex items-center justify-center text-white text-xs font-bold">S</span>
          <span className="font-semibold">SentryCam</span>
        </Link>
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50">
          powered by relay ↗
        </Link>
      </nav>
      <main className="flex-1">{children}</main>
    </div>
  );
}
