import React from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Search, User, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
export function MainLayout(): JSX.Element {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-slate-50/50">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <header className="h-16 border-b border-border/40 bg-white/80 backdrop-blur-md sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <SidebarTrigger className="-ml-1 text-slate-500 hover:text-slate-900" />
              <div className="relative max-w-md w-full hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input 
                  placeholder="Search tickets, customers, or calls..." 
                  className="pl-9 bg-slate-100/50 border-transparent focus:bg-white focus:ring-1 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <ThemeToggle className="static" />
              <Button variant="ghost" size="icon" className="relative text-slate-500">
                <Bell className="size-5" />
                <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500 border-2 border-white" />
              </Button>
              <div className="h-8 w-px bg-border/60 mx-1 hidden sm:block" />
              <Button variant="ghost" className="gap-2 px-2 hover:bg-slate-100">
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                  JD
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-semibold leading-none">Jane Doe</p>
                  <p className="text-[10px] text-muted-foreground">Senior Agent</p>
                </div>
              </Button>
            </div>
          </header>
          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-12">
              <Outlet />
            </div>
            {/* AI Warning Footer Note */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800">
                <p className="font-medium">Note on AI Usage</p>
                <p className="mt-1 opacity-90">
                  This project features AI capabilities. Please note that there is a limit on the number of requests that can be made to the AI servers across all user apps in a given time period.
                </p>
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}