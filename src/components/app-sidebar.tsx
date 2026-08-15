"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Waypoints,
  Flame,
  Users2,
  Gauge,
  Radar,
  SlidersHorizontal,
  FileText,
  Database,
  Settings,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { EtchedWordmark } from "@/components/etched-logo";
import { useAppData } from "@/lib/app-data";
import { useFilters, windowDays, daysAgo } from "@/lib/filters";

const NAV_GROUPS: {
  label: string;
  items: { num: string; title: string; url: string; icon: typeof LayoutDashboard }[];
}[] = [
  {
    label: "Command",
    items: [
      { num: "01", title: "Overview", url: "/", icon: LayoutDashboard },
      { num: "02", title: "Workforce Plan", url: "/workforce-plan", icon: Target },
    ],
  },
  {
    label: "Recruiting",
    items: [
      { num: "03", title: "Hiring Funnel", url: "/hiring-funnel", icon: Waypoints },
      { num: "04", title: "Critical Searches", url: "/critical-searches", icon: Flame },
      { num: "05", title: "Candidate Pipeline", url: "/candidate-pipeline", icon: Users2 },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { num: "06", title: "Talent Quality", url: "/talent-quality", icon: Gauge },
      { num: "07", title: "Recruiting Analytics", url: "/recruiting-analytics", icon: Radar },
      { num: "08", title: "Scenario Planner", url: "/scenario-planner", icon: SlidersHorizontal },
    ],
  },
  {
    label: "Reporting",
    items: [{ num: "09", title: "Leadership Brief", url: "/leadership-brief", icon: FileText }],
  },
];

const FOOTER_ITEMS = [
  { title: "Data", url: "/data", icon: Database },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { functionFilter, locationFilter, timeRange } = useFilters();
  const { data } = useAppData();
  const maxDaysOpen = windowDays(timeRange);

  const badgeByUrl: Record<string, number> = {};
  if (data) {
    badgeByUrl["/critical-searches"] = data.requisitions.filter(
      (r) =>
        r.openings - r.filled > 0 &&
        r.daysOpen <= maxDaysOpen &&
        (functionFilter === "All" || r.function === functionFilter) &&
        (locationFilter === "All" || r.location === locationFilter),
    ).length;

    badgeByUrl["/candidate-pipeline"] = data.candidates.filter(
      (c) =>
        c.stage !== "Started" &&
        daysAgo(c.sourcedDate) <= maxDaysOpen &&
        (functionFilter === "All" || c.function === functionFilter) &&
        (locationFilter === "All" || c.location === locationFilter),
    ).length;
  }

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="gap-0 px-3 py-4">
        <div className="flex items-center gap-2 px-1 group-data-[collapsible=icon]:justify-center">
          <EtchedWordmark className="h-3.5 w-auto shrink-0 text-sidebar-foreground group-data-[collapsible=icon]:hidden" />
          <span className="hidden text-[10px] font-semibold tracking-wide text-sidebar-foreground group-data-[collapsible=icon]:block">
            E
          </span>
        </div>
        <div className="px-1 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden">
          Talent Command
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const badge = badgeByUrl[item.url];
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                        tooltip={
                          badge !== undefined ? `${item.title} — ${badge}` : item.title
                        }
                        className="data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium"
                      >
                        <Link href={item.url}>
                          <item.icon className="opacity-80" />
                          <span className="font-mono text-[10px] text-sidebar-foreground/35">
                            {item.num}
                          </span>
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {badge !== undefined ? (
                        <SidebarMenuBadge className="rounded-full bg-sidebar-accent font-mono text-sidebar-foreground/80">
                          {badge}
                        </SidebarMenuBadge>
                      ) : null}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-1 px-3 py-3">
        <SidebarMenu>
          {FOOTER_ITEMS.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title} size="sm">
                <Link href={item.url}>
                  <item.icon className="opacity-70" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        <div className="mt-1 px-2 text-[10px] uppercase tracking-wider text-sidebar-foreground/35 group-data-[collapsible=icon]:hidden">
          Demo Dataset
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
