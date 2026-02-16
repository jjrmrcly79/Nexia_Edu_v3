"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Search, Book } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface Concept {
    domain_name: string;
    title: string;
    explanation: string;
}

export default function GlossaryPage() {
    const [concepts, setConcepts] = useState<Concept[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchConcepts() {
            const { data, error } = await supabase.rpc("get_all_concepts_rpc");
            if (data) setConcepts(data as Concept[]);
            setLoading(false);
        }
        fetchConcepts();
    }, []);

    const filtered = concepts.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.explanation.toLowerCase().includes(search.toLowerCase()) ||
        c.domain_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 h-16 flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="font-bold text-lg text-gray-900">Glosario</h1>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 py-6 space-y-6">

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Buscar concepto..."
                        className="pl-9 bg-white"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Content */}
                {loading ? (
                    <div className="text-center py-10 text-gray-500">Cargando glosario...</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">No se encontraron resultados.</div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map((concept, i) => (
                            <Card key={i} className="overflow-hidden">
                                <div className="h-1 bg-purple-500 w-full" />
                                <CardHeader className="pb-2 pt-4">
                                    <div className="flex justify-between items-start mb-1">
                                        <Badge variant="secondary" className="text-xs font-normal bg-purple-50 text-purple-700 hover:bg-purple-100 mb-2">
                                            {concept.domain_name}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Book className="h-4 w-4 text-gray-400" />
                                        {concept.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        {concept.explanation}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

            </main>
        </div>
    );
}
