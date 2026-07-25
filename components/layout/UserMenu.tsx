"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  ChevronDown,
  Calendar,
  Settings,
  LogOut,
  LayoutDashboard,
} from "lucide-react";

interface UserMenuProps {
  name: string | null | undefined;
  isProvider: boolean;
}

export function UserMenu({ name, isProvider }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const firstName = name?.split(" ")[0] ?? "Account";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex items-center cursor-pointer gap-1.5 text-sm font-medium text-neutral-200 hover:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-card px-2 py-1.5"
      >
        <span className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-semibold">
          {firstName.charAt(0).toUpperCase()}
        </span>
        <span className="hidden sm:inline">{firstName}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 bg-surface-raised border border-surface-border rounded-card shadow-card-hover py-1.5 z-50"
        >
          <Link
            href="/dashboard"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-200 hover:bg-surface hover:text-neutral-50 transition-colors"
          >
            <Calendar size={16} aria-hidden="true" />
            My Bookings
          </Link>

          {isProvider && (
            <Link
              href="/provider"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-200 hover:bg-surface hover:text-neutral-50 transition-colors"
            >
              <LayoutDashboard size={16} aria-hidden="true" />
              Provider Dashboard
            </Link>
          )}

          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-200 hover:bg-surface hover:text-neutral-50 transition-colors"
          >
            <Settings size={16} aria-hidden="true" />
            Account Settings
          </Link>

          <div className="my-1.5 border-t border-surface-border" />

          <button
            role="menuitem"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-accent-rose hover:bg-surface transition-colors"
          >
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
