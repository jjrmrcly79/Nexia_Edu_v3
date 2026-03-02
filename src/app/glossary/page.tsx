"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Book, FlaskConical, PenTool, ClipboardList, Info, Loader2, PlayCircle, Quote, X, BookOpen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TopicSummaryModal from "@/components/TopicSummaryModal";

// --- Types ---
interface Term {
    name: string;
    definitions: string[]; // array of unique definitions
    domains: { id: string; name: string; slug: string }[];
    ids: string[]; // array of IDs for this term
    type: 'concept' | 'tool' | 'formula' | 'procedure';
}

interface TermDetail {
    id: string;
    domain_id: string;
    name: string;
    definition: string;
    metadata: any;
    evidence: EvidenceLink[];
}

interface EvidenceLink {
    quote: string;
    chunk_id: string;
    source: string;
    page?: string;
}

interface Domain {
    id: string;
    name: string;
}

// --- Components ---

function TermCard({ term, onClick }: { term: Term; onClick: (id: string) => void }) {
    const iconMap = {
        concept: Book,
        tool: PenTool,
        formula: FlaskConical,
        procedure: ClipboardList
    };
    const Icon = iconMap[term.type] || Info;

    // Use the first definition as summary
    const summary = term.definitions[0] || "Procedimiento detallado";

    return (
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onClick(term.ids[0])}>
            <CardHeader className="p-4 pb-2">
                <div className="flex flex-wrap gap-1 mb-2">
                    {term.domains.map(d => (
                        <Badge key={d.id} variant="outline" className="text-[10px] font-normal">
                            {d.name}
                        </Badge>
                    ))}
                </div>
                <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="h-4 w-4 text-purple-600" />
                    {term.name}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <p className="text-sm text-gray-500 line-clamp-2">
                    {summary}
                </p>
                {term.ids.length > 1 && (
                    <p className="text-xs text-purple-600 mt-2 font-medium">
                        + {term.ids.length - 1} definiciones alternativas
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

function DetailModal({ termId, type, onClose }: { termId: string; type: string; onClose: () => void }) {
    const [detail, setDetail] = useState<TermDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function fetchDetail() {
            setLoading(true);
            const { data, error } = await supabase.rpc("get_term_details_rpc", { _id: termId, _type: type });
            if (data && data.length > 0) {
                setDetail(data[0]);
            }
            setLoading(false);
        }
        fetchDetail();
    }, [termId, type]);

    if (!termId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto relative shadow-xl">
                <Button variant="ghost" size="icon" className="absolute right-2 top-2" onClick={onClose}>
                    <X className="h-5 w-5" />
                </Button>

                {loading ? (
                    <div className="p-10 flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                    </div>
                ) : detail ? (
                    <div className="space-y-6 p-6">
                        {/* Header */}
                        <div>
                            <Badge className="mb-2 bg-purple-100 text-purple-700 hover:bg-purple-200 uppercase tracking-wider text-[10px]">
                                {type}
                            </Badge>
                            <h2 className="text-2xl font-bold text-gray-900">{detail.name}</h2>
                            <p className="text-lg text-gray-700 mt-2 italic border-l-4 border-purple-500 pl-4 py-1 bg-gray-50 rounded-r">
                                "{detail.definition}"
                            </p>
                        </div>

                        {/* Metadata (Type Specific) */}
                        {type === 'formula' && detail.metadata.variables && (
                            <div className="bg-slate-50 p-4 rounded-lg border">
                                <h3 className="font-semibold text-sm mb-2">Variables:</h3>
                                <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                                    {JSON.stringify(detail.metadata.variables, null, 2)}
                                </pre>
                            </div>
                        )}
                        {type === 'procedure' && detail.metadata.steps && (
                            <div className="space-y-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <ClipboardList className="h-4 w-4" /> Pasos:
                                </h3>
                                <div className="space-y-2">
                                    {/* Simple list if it's an array, or JSON dump */}
                                    {Array.isArray(detail.metadata.steps) ? (
                                        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                                            {detail.metadata.steps.map((step: any, i: number) => (
                                                <li key={i}>{typeof step === 'string' ? step : JSON.stringify(step)}</li>
                                            ))}
                                        </ol>
                                    ) : (
                                        <pre className="text-xs">{JSON.stringify(detail.metadata.steps, null, 2)}</pre>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Evidence */}
                        {detail.evidence && detail.evidence.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                                    <Quote className="h-4 w-4" /> Evidencia y Fuente
                                </h3>
                                {detail.evidence.map((ev, i) => (
                                    <div key={i} className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm">
                                        <p className="text-gray-800 mb-2">"{ev.quote}"</p>
                                        <div className="text-xs text-amber-700 font-medium flex items-center gap-1">
                                            <span>📄 {ev.source || "Documento desconocido"}</span>
                                            {ev.page && <span>(Pág. {ev.page})</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="pt-4 border-t flex justify-end gap-3 items-center">
                            <TopicSummaryModal
                                type={type as any}
                                id={termId}
                                trigger={
                                    <Button variant="ghost" className="text-gray-600 gap-2">
                                        <BookOpen className="h-4 w-4" />
                                        Ver Resumen Extenso
                                    </Button>
                                }
                            />
                            <Button variant="outline" onClick={onClose}>Cerrar</Button>
                            <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => {
                                // Close modal and navigate strictly to practice
                                router.push(`/practice?context_type=${type}&context_id=${termId}&domainId=${detail.domain_id}`);
                            }}>
                                <PlayCircle className="mr-2 h-4 w-4" />
                                Practicar este término
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="p-10 text-center text-gray-500">No se encontraron detalles.</div>
                )}
            </Card>
        </div>
    );
}


export default function GlossaryPage() {
    const [terms, setTerms] = useState<Term[]>([]);
    const [loading, setLoading] = useState(true);
    const [domains, setDomains] = useState<Domain[]>([]);

    // Filters
    const [activeTab, setActiveTab] = useState("concept");
    const [search, setSearch] = useState("");
    const [selectedDomain, setSelectedDomain] = useState<string>("all");

    // Selection
    const [selectedTerm, setSelectedTerm] = useState<{ id: string; type: string } | null>(null);

    // Fetch Domains
    useEffect(() => {
        supabase.rpc('get_all_domains_rpc')
            .then(({ data }) => { if (data) setDomains(data); });
    }, []);

    // Fetch Terms
    useEffect(() => {
        async function fetchTerms() {
            setLoading(true);
            const domainId = selectedDomain === "all" ? null : selectedDomain;

            const { data, error } = await supabase.rpc("get_glossary_terms_rpc", {
                _type: activeTab,
                _search: search,
                _domain_id: domainId,
                _limit: 50
            });

            if (error) console.error(error);
            if (data) setTerms(data as Term[]);
            setLoading(false);
        }

        // Debounce search slightly
        const timer = setTimeout(fetchTerms, 300);
        return () => clearTimeout(timer);
    }, [activeTab, search, selectedDomain]);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="font-bold text-lg text-gray-900">Glosario</h1>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

                {/* Search & Filter */}
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar..."
                            className="pl-9 bg-white"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:w-[200px]"
                        value={selectedDomain}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedDomain(e.target.value)}
                    >
                        <option value="all">Todos los Dominios</option>
                        {domains.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-gray-200/50">
                        <TabsTrigger value="concept">Conceptos</TabsTrigger>
                        <TabsTrigger value="tool">Herramientas</TabsTrigger>
                        <TabsTrigger value="formula">Fórmulas</TabsTrigger>
                        <TabsTrigger value="procedure">Procesos</TabsTrigger>
                    </TabsList>

                    <div className="mt-6">
                        {loading ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
                            </div>
                        ) : terms.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 bg-white rounded-lg border border-dashed">
                                No se encontraron resultados.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {terms.map((term) => (
                                    <TermCard
                                        key={term.ids[0]}
                                        term={term}
                                        onClick={(id) => setSelectedTerm({ id, type: term.type })}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </Tabs>
            </main>

            {/* Detail Modal */}
            {selectedTerm && (
                <DetailModal
                    termId={selectedTerm.id}
                    type={selectedTerm.type}
                    onClose={() => setSelectedTerm(null)}
                />
            )}
        </div>
    );
}
