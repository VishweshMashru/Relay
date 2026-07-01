import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export default function Landing() {
  return (
    <div className="flex flex-1 flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
        <Link href="/" className="font-mono font-semibold text-lg">
          relay
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/showcase"
            className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
          >
            Showcase
          </Link>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="text-sm rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="text-sm rounded-md bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 px-3 py-1.5">
                Sign up
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="text-sm rounded-md bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 px-3 py-1.5"
            >
              Dashboard
            </Link>
            <UserButton />
          </Show>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-3xl w-full py-24 flex flex-col gap-6">
          <span className="inline-flex self-start items-center gap-2 rounded-full bg-neutral-100 dark:bg-neutral-900 px-3 py-1 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            in beta
          </span>
          <h1 className="text-5xl font-medium tracking-tight leading-tight">
            Stream a private camera to anyone,
            <br />
            <span className="text-neutral-500">without a public IP.</span>
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-xl">
            One API call, one edge agent. Your camera stays on its LAN. Your users watch on
            demand. You pay per minute streamed — nothing when idle.
          </p>
          <div className="flex gap-3 mt-2">
            <Show when="signed-out">
              <SignUpButton mode="modal">
                <button className="h-11 px-5 rounded-md bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 text-sm font-medium">
                  Get an API key
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="h-11 px-5 rounded-md bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 text-sm font-medium inline-flex items-center"
              >
                Open dashboard
              </Link>
            </Show>
            <Link
              href="/showcase"
              className="h-11 px-5 rounded-md border border-neutral-300 dark:border-neutral-700 text-sm font-medium inline-flex items-center"
            >
              See it live →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
