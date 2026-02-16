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
import { AlertCircle, CheckCircle2, PlayCircle } from "lucide-react";

interface DomainCoverage {
    domain_id: string;
    domain_name: string;
    items_count: number;
}

export default function CoveragePage() {
    const [coverage, setCoverage] = useState<DomainCoverage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCoverage();
    }, []);

    const fetchCoverage = async () => {
        setLoading(true);
        const { data, error } = await supabase.rpc("get_domain_coverage_rpc");
        if (data) setCoverage(data as DomainCoverage[]);
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Coverage Matrix</h1>
                    <p className="text-muted-foreground mt-1">
                        Status of assessment item generation across all domains.
                    </p>
                </div>
                <Button variant="outline" onClick={fetchCoverage}>
                    Refresh Data
                </Button>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Domain Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Items Generated</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    Loading coverage data...
                                </TableCell>
                            </TableRow>
                        ) : coverage.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No domains found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            coverage.map((row) => (
                                <TableRow key={row.domain_id}>
                                    <TableCell className="font-medium">{row.domain_name}</TableCell>
                                    <TableCell>
                                        {row.items_count > 0 ? (
                                            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200">
                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                Ready
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                                                <AlertCircle className="h-3 w-3 mr-1" />
                                                Empty
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-gray-700">
                                        {row.items_count}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" className="text-blue-600">
                                            <PlayCircle className="h-4 w-4 mr-1" />
                                            Generate
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
