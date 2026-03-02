"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TopicSummaryModalProps {
    type: 'concept' | 'skill' | 'tool' | 'formula' | 'procedure';
    id: string; // UUID
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    contextData?: any; // Allow passing specific context (e.g. from Mock Data)
}

interface SummaryData {
    title: string;
    description: string;
    domain_name?: string;
    evidence?: { quote: string; source: string; page?: string }[];
    metadata?: any;
}

// Helper to format text with headers and bold
const FormattedText = ({ text }: { text: string }) => {
    if (!text) return null;

    // Split by double newlines to paragraphs
    const paragraphs = text.split(/\n\n+/);

    return (
        <div className="space-y-4 text-gray-800">
            {paragraphs.map((para, i) => {
                // Header detection (###)
                if (para.trim().startsWith("###")) {
                    const content = para.replace(/^###\s*/, "");
                    return (
                        <h3 key={i} className="text-lg font-bold text-indigo-800 mt-4 mb-2">
                            {content}
                        </h3>
                    );
                }

                // Bold detection (**text**) within paragraph
                const parts = para.split(/(\*\*.*?\*\*)/g);
                return (
                    <p key={i} className="leading-relaxed text-base">
                        {parts.map((part, j) => {
                            if (part.startsWith("**") && part.endsWith("**")) {
                                return <strong key={j} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
                            }
                            return part;
                        })}
                    </p>
                );
            })}
        </div>
    );
};

export default function TopicSummaryModal({ type, id, trigger, open, onOpenChange, contextData }: TopicSummaryModalProps) {
    const [data, setData] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(false);
    const [internalOpen, setInternalOpen] = useState(false);

    const [researchResult, setResearchResult] = useState<string>("");
    const [isResearching, setIsResearching] = useState(false);

    // Determines effective open state
    const isOpen = open !== undefined ? open : internalOpen;

    const handleOpenChange = (newOpen: boolean) => {
        setInternalOpen(newOpen);
        if (onOpenChange) {
            onOpenChange(newOpen);
        }
    };

    useEffect(() => {
        if (isOpen) {
            // Optional: If contextData is title/desc, we could set data immediately? 
            // But we likely still want to fetch DB data for completeness if possible.
            fetchSummary();
            setResearchResult(""); // Reset research on open
        }
    }, [isOpen, type, id]);

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const { data: terms, error } = await supabase.rpc("get_term_details_rpc", {
                _id: id,
                _type: type
            });

            if (terms && terms.length > 0) {
                const term = terms[0];
                setData({
                    title: term.name,
                    description: term.definition || term.purpose || term.description || "Sin descripción disponible.",
                    domain_name: term.domain_name,
                    evidence: term.evidence,
                    metadata: term.metadata
                });
            }
        } catch (err) {
            console.error("Failed to fetch summary", err);
        } finally {
            setLoading(false);
        }
    };

    const handleResearch = async () => {
        // Allow research if we have either DB data OR contextData
        const effectiveTitle = contextData?.title || data?.title;
        const effectiveDomain = contextData?.domain || data?.domain_name;

        if (!effectiveTitle && !effectiveDomain) return;

        setIsResearching(true);
        setResearchResult("");

        // Construct context from metadata or contextData
        const contextParts = [];

        // 1. Prioritize contextData (what user sees on screen)
        if (contextData) {
            if (contextData.title) contextParts.push(`Título: ${contextData.title}`);
            if (contextData.description) contextParts.push(`Definición: ${contextData.description}`);
            // Handle "concepts" array from MOCK_DATA
            if (contextData.concepts) contextParts.push(`Conceptos Clave: ${JSON.stringify(contextData.concepts)}`);
            if (contextData.checklist) contextParts.push(`Lista de Verificación: ${JSON.stringify(contextData.checklist)}`);
            // Fallback for general metadata
            if (contextData.variables) contextParts.push(`Variables: ${JSON.stringify(contextData.variables)}`);
            if (contextData.steps) contextParts.push(`Pasos: ${JSON.stringify(contextData.steps)}`);
        }

        // 2. Append DB data if not already covered (or purely additive)
        if (data?.metadata) {
            // Avoid duplicating if we already added concepts/checklist from contextData
            if (!contextData?.concepts && data.metadata.variables) contextParts.push(`Variables/Conceptos (DB): ${JSON.stringify(data.metadata.variables)}`);
            if (!contextData?.checklist && data.metadata.checklist) contextParts.push(`Lista de Verificación (DB): ${JSON.stringify(data.metadata.checklist)}`);

            if (data.metadata.steps) contextParts.push(`Pasos (DB): ${JSON.stringify(data.metadata.steps)}`);
            if (data.metadata.common_mistakes) contextParts.push(`Errores Comunes: ${JSON.stringify(data.metadata.common_mistakes)}`);
            if (data.metadata.outputs) contextParts.push(`Salidas: ${JSON.stringify(data.metadata.outputs)}`);
        }

        const contextStr = contextParts.join("\n\n");

        try {
            const response = await fetch("/api/research-domain", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    // Prioritize the specific concept/title over the domain for deep research
                    slug: (effectiveTitle || effectiveDomain || "").toLowerCase().replace(/\s+/g, '-'),
                    domainName: effectiveTitle || effectiveDomain,
                    context: contextStr
                }),
            });

            if (!response.ok || !response.body) {
                throw new Error("Error starting research");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                setResearchResult((prev) => prev + chunk);
            }
        } catch (error) {
            console.error(error);
            setResearchResult("Hubo un error al generar la investigación.");
        } finally {
            setIsResearching(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="max-w-3xl max-h-[90vh] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-gray-50/50">
                <DialogHeader className="px-6 py-4 bg-white border-b shrink-0">
                    {data?.domain_name && (
                        <Badge variant="outline" className="w-fit mb-2 text-xs">
                            {data.domain_name}
                        </Badge>
                    )}
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        {data?.title || "Cargando..."}
                    </DialogTitle>
                    <DialogDescription>
                        Información obtenida de documentos certificados de Lean Six Sigma.
                    </DialogDescription>

                    {/* Fixed Header Action Area */}
                    <div className="flex items-center justify-between mt-4 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                        <h3 className="text-sm font-semibold text-indigo-700 flex items-center gap-2">
                            <Lightbulb className="h-4 w-4" />
                            Investigación Profunda (AI con Citas)
                        </h3>
                        {!isResearching && (
                            <Button
                                onClick={handleResearch}
                                variant="default"
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                            >
                                {researchResult ? "Regenerar Resumen" : "Generar Resumen con Fuentes"}
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto bg-white p-6">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="h-10 w-10 animate-spin text-indigo-600 opacity-50" />
                        </div>
                    ) : data ? (
                        <div className="flex flex-col pb-10">
                            {isResearching && !researchResult && (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-4 animate-in fade-in duration-500">
                                    <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                                    <p className="italic text-lg font-medium text-indigo-900/60">Analizando documentos certificados...</p>
                                    <p className="text-sm">Esto puede tomar unos segundos.</p>
                                </div>
                            )}

                            {researchResult && (
                                <div className="prose prose-indigo max-w-none animate-in slide-in-from-bottom-2 duration-500">
                                    <FormattedText text={researchResult} />
                                    {isResearching && <span className="inline-block w-2 h-5 bg-indigo-500 ml-1 animate-pulse align-middle" />}
                                </div>
                            )}

                            {!isResearching && !researchResult && (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-300 border-2 border-dashed border-gray-100 rounded-xl m-4 bg-gray-50/30">
                                    <BookOpen className="h-16 w-16 mb-4 opacity-10" />
                                    <p className="text-center max-w-xs text-gray-400">
                                        Utiliza el botón superior para generar una investigación profunda basada en el contexto actual.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-20 text-center text-gray-400">
                            No se encontró información detallada.
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
