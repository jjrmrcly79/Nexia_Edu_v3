"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Book, CheckCircle, Database } from "lucide-react";

interface AdminStats {
    total_domains: number;
    total_items: number;
    total_chunks: number;
    processed_chunks: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            const { data, error } = await supabase.rpc('get_admin_stats_rpc');
            if (data) setStats(data as AdminStats);
            setLoading(false);
        }
        loadStats();
    }, []);

    const statsCards = [
        {
            title: "Total Domains",
            value: stats?.total_domains || 0,
            icon: Book,
            desc: "Active knowledge areas",
        },
        {
            title: "Assessment Items",
            value: stats?.total_items || 0,
            icon: Database,
            desc: "Questions generated",
        },
        {
            title: "Processed Chunks",
            value: stats?.processed_chunks || 0,
            total: stats?.total_chunks || 0,
            icon: CheckCircle,
            desc: "Source documents parsed",
        },
        {
            title: "System Health",
            value: "98%",
            icon: Activity,
            desc: "Operational",
        },
    ];

    if (loading) return <div>Loading dashboard...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard Overview</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statsCards.map((stat) => (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {stat.title}
                            </CardTitle>
                            <stat.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stat.value}
                                {stat.total ? <span className="text-sm text-gray-400 font-normal"> / {stat.total}</span> : null}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {stat.desc}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
