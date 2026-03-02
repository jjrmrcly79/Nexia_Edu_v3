"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Copy, Terminal } from "lucide-react";

interface DomainGap {
    slug: string;
    name: string;
    missing_skills_count: number;
}

export default function FillGapsPage() {
    const [gaps, setGaps] = useState<DomainGap[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState<string | null>(null);

    useEffect(() => {
        fetchGaps();
    }, []);

    const fetchGaps = async () => {
        setLoading(true);
        const { data, error } = await supabase.rpc("get_domain_gaps_summary_rpc");
        if (data) setGaps(data as DomainGap[]);
        setLoading(false);
    };

    const copyCommand = (cmd: string, id: string) => {
        navigator.clipboard.writeText(cmd);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const globalCmd = "python pipeline/Poblar.py --mode 4 --target all";

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Fill Coverage Gaps</h1>
                    <p className="text-muted-foreground mt-1">
                        Identify domains with missing assessment items and generate them.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchGaps}>
                        Refresh
                    </Button>
                    <Button
                        className="bg-slate-900 hover:bg-slate-800 text-white"
                        onClick={() => copyCommand(globalCmd, "global")}
                    >
                        {copied === "global" ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Terminal className="mr-2 h-4 w-4" />}
                        Copy Global Fix Command
                    </Button>
                </div>
            </div>

            {/* Global Command Banner */}
            <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 font-mono text-sm flex justify-between items-center">
                <code className="text-slate-700">{globalCmd}</code>
                <Button variant="ghost" size="sm" onClick={() => copyCommand(globalCmd, "global_banner")}>
                    {copied === "global_banner" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-slate-500" />}
                </Button>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Domain</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Missing Skills</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">Loading gaps analysis...</TableCell>
                            </TableRow>
                        ) : gaps.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">No gaps found! All skills have items.</TableCell>
                            </TableRow>
                        ) : (
                            gaps.map((row) => {
                                const cmd = `python pipeline/Poblar.py --mode 4 --target ${row.slug}`;
                                return (
                                    <TableRow key={row.slug}>
                                        <TableCell className="font-medium">
                                            {row.name} <span className="text-xs text-gray-400 ml-1">({row.slug})</span>
                                        </TableCell>
                                        <TableCell>
                                            {row.missing_skills_count > 0 ? (
                                                <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                                    Needs Attention
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                    Complete
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-gray-700">
                                            {row.missing_skills_count}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {row.missing_skills_count > 0 && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => copyCommand(cmd, row.slug)}
                                                >
                                                    {copied === row.slug ? (
                                                        <>
                                                            <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                                                            Copied
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Terminal className="h-3 w-3 mr-1 text-gray-500" />
                                                            Copy Fix
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
