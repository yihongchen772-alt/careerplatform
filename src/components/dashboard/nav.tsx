"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Building2,
  CalendarDays,
  FileText,
  LayoutDashboard,
  ListChecks,
  Scale,
  Search,
  Send,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GlobalSearchDialog } from "@/components/search/global-search-dialog";

type NavLink = { href: string; label: string; icon: LucideIcon };

const overview: NavLink = { href: "/dashboard", label: "总览", icon: LayoutDashboard };

const groups: { label: string; links: NavLink[] }[] = [
  {
    label: "求职工具",
    links: [
      { href: "/pool", label: "候选岗位池", icon: ListChecks },
      { href: "/applications", label: "投递记录", icon: Send },
      { href: "/calendar", label: "日历视图", icon: CalendarDays },
      { href: "/compare", label: "Offer 对比", icon: Scale },
    ],
  },
  {
    label: "资源",
    links: [
      { href: "/companies", label: "企业名录", icon: Building2 },
      { href: "/resumes", label: "简历版本", icon: FileText },
    ],
  },
  {
    label: "账号",
    links: [{ href: "/settings", label: "账号设置", icon: Settings }],
  },
];

function NavItem({ link, active }: { link: NavLink; active: boolean }) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" />
      {link.label}
    </Link>
  );
}

export function DashboardNav({ userLabel }: { userLabel: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname.startsWith(href);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex h-full flex-col justify-between p-4">
      <div className="space-y-5">
        <div className="flex items-center gap-2 px-2 text-lg font-semibold">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            秋
          </span>
          秋招追踪
        </div>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Search className="size-4 shrink-0" />
          搜索...
          <span className="ml-auto text-xs text-muted-foreground/70">
            ⌘/Ctrl K
          </span>
        </button>
        <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

        <nav className="space-y-1">
          <NavItem link={overview} active={isActive(overview.href)} />
        </nav>

        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 text-xs font-medium text-muted-foreground/70">
              {group.label}
            </p>
            <nav className="space-y-1">
              {group.links.map((link) => (
                <NavItem key={link.href} link={link} active={isActive(link.href)} />
              ))}
            </nav>
          </div>
        ))}
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
