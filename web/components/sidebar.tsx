"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { LayoutDashboard, Key, Server, Camera, PlayCircle, Film, Settings, BookOpen } from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/keys", label: "API keys", icon: Key },
  { href: "/dashboard/edges", label: "Edges", icon: Server },
  { href: "/dashboard/cameras", label: "Cameras", icon: Camera },
  { href: "/dashboard/sessions", label: "Sessions", icon: PlayCircle },
  { href: "/dashboard/clips", label: "Clips", icon: Film },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/docs", label: "Docs", icon: BookOpen },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-60 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
      <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
        <Link href="/" className="font-mono font-semibold text-lg">relay</Link>
      </div>
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        {nav.map((item) => {
          const active = path === item.href || (item.href !== "/dashboard" && path.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm ${
                active
                  ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 font-medium"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
        <UserButton />
        <span className="text-xs text-neutral-500">Signed in</span>
      </div>
    </aside>
  );
}
