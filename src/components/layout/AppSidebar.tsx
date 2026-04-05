import React from "react";
import { LayoutDashboard, Mic2, Inbox, Settings, HelpCircle, PhoneCall } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
export function AppSidebar(): JSX.Element {
  const location = useLocation();
  const navItems = [
    { title: "Dashboard", icon: LayoutDashboard, path: "/" },
    { title: "Live Call", icon: Mic2, path: "/live-call" },
    { title: "Tickets", icon: Inbox, path: "/tickets" },
  ];
  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="h-16 flex items-center px-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-indigo-200 shadow-lg">
            <PhoneCall className="size-5" />
          </div>
          <span className="font-bold text-lg tracking-tight group-data-[collapsible=icon]:hidden">VoxCare</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-6 mb-2 group-data-[collapsible=icon]:hidden text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Main Menu
          </SidebarGroupLabel>
          <SidebarMenu className="px-3 gap-1">
            {navItems.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === item.path}
                  tooltip={item.title}
                  className={cn(
                    "h-11 px-3 rounded-md transition-all duration-200",
                    location.pathname === item.path 
                      ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 font-medium" 
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Link to={item.path}>
                    <item.icon className={cn("size-5", location.pathname === item.path && "text-indigo-600")} />
                    <span className="text-[15px]">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-border/40">
        <div className="flex flex-col gap-2 group-data-[collapsible=icon]:hidden">
           <SidebarMenuButton className="text-muted-foreground">
             <Settings className="size-4 mr-2" />
             <span>Settings</span>
           </SidebarMenuButton>
           <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-100">
             <p className="text-[10px] text-slate-400 font-medium uppercase mb-1">Status</p>
             <div className="flex items-center gap-2">
               <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-xs font-semibold text-slate-700">Agent Online</span>
             </div>
           </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}