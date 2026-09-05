"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { Coffee } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <Coffee className="h-6 w-6 text-brown-600" />
          <span>LocalRoast</span>
        </Link>

        <div className="flex items-center gap-4">
          {session ? (
            <>
              <Link href="/dashboard" className="text-sm font-medium hover:underline">
                Dashboard
              </Link>
              <Link href="/dashboard/devices" className="text-sm font-medium hover:underline">
                Geräte
              </Link>
              <button
                onClick={() => signOut()}
                className="text-sm font-medium text-red-600 hover:underline"
              >
                Sign Out
              </button>
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                {session.user?.name?.[0] || session.user?.email?.[0] || "U"}
              </div>
            </>
          ) : (
            <button
              onClick={() => signIn()}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
