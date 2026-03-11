"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart3, Settings, ShieldCheck, Construction, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
    { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { title: "User Progress", href: "/admin/users", icon: Users },
    { title: "Coverage Matrix", href: "/admin/coverage", icon: BarChart3 },
    { title: "Fill Gaps", href: "/admin/fill-gaps", icon: Construction },
    { title: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex-shrink-0 hidden md:flex flex-col">
                <div className="h-16 flex items-center px-6 border-b border-slate-800">
                    <ShieldCheck className="h-6 w-6 text-blue-500 mr-2" />
                    <span className="font-bold text-lg">Nexia Admin</span>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-blue-600 text-white"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                )}
                            >
                                <item.icon className="h-5 w-5 mr-3" />
                                {item.title}
                            </Link>
                        )
                    })}
                </nav>
            </aside>

            {/* Content */}
            <div className="flex-1 flex flex-col">
                {/* Mobile Header (simplified) */}
                <header className="md:hidden h-16 bg-slate-900 text-white flex items-center px-4">
                    <ShieldCheck className="h-6 w-6 text-blue-500 mr-2" />
                    <span className="font-bold">Nexia Admin</span>
                </header>

                <main className="flex-1 p-8 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
