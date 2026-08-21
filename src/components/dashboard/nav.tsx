"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/dashboard", label: "总览" },
  { href: "/pool", label: "候选岗位池" },
  { href: "/applications", label: "投递记录" },
  { href: "/compare", label: "Offer 对比" },
  { href: "/companies", label: "企业名录" },
  { href: "/resumes", label: "简历版本" },
  { href: "/settings", label: "账号设置" },
];

export function DashboardNav({ userLabel }: { userLabel: string }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col justify-between p-4">
      <div className="space-y-6">
        <div className="px-2 text-lg font-semibold">秋招追踪</div>
        <nav className="space-y-1">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="space-y-2 border-t pt-4">
        <p className="truncate px-2 text-xs text-muted-foreground">{userLabel}</p>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          退出登录
        </Button>
      </div>
    </div>
  );
}
