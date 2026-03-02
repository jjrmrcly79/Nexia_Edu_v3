"use client";

import { useEffect, useState } from "react";
import PracticeEngine from "@/components/PracticeEngine";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import TopicSummaryModal from "@/components/TopicSummaryModal";

export default function DailyReviewPage() {
    const [concept, setConcept] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadDailyConcept() {
            setLoading(true);
            try {
                // Get a practice item to find a relevant concept
                const { data } = await supabase.rpc("get_practice_items_rpc", { _domain_slug: "flujo", _limit: 1 });
                if (data && data.length > 0 && data[0].concept_id) {
                    const { data: cData } = await supabase.rpc("get_term_details_rpc", { _id: data[0].concept_id, _type: "concept" });
                    if (cData && cData.length > 0) {
                        setConcept(cData[0]);
                    }
                }
            } catch (error) {
                console.error("Failed to load daily concept", error);
            } finally {
                setLoading(false);
            }
        }
        loadDailyConcept();
    }, []);

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
                    <h1 className="font-bold text-lg text-gray-900">Repaso Diario</h1>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 py-6 space-y-6">
                <div className="bg-green-600 rounded-xl p-6 text-white shadow-lg mb-6">
                    <h2 className="text-xl font-bold mb-2">¡Hora de repasar! 🧠</h2>
                    <p className="text-green-100 text-sm mb-4">
                        Dedica 3 minutos a reforzar lo que has aprendido. Respondamos algunas preguntas.
                    </p>

                    {loading ? (
                        <div className="flex items-center gap-2 text-green-100/70 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Cargando concepto del día...</span>
                        </div>
                    ) : concept ? (
                        <div className="bg-green-700/50 p-4 rounded-lg border border-green-500/30">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <BookOpen className="h-4 w-4" />
                                    Concepto del Día: {concept.name}
                                </h3>
                                <TopicSummaryModal
                                    type="concept"
                                    id={concept.id}
                                    trigger={<Button variant="ghost" size="sm" className="h-8 text-xs bg-white/10 hover:bg-white/20 text-white">Repasar a fondo</Button>}
                                />
                            </div>
                            <p className="text-sm text-green-50 line-clamp-2 italic">"{concept.definition}"</p>
                        </div>
                    ) : null}
                </div>

                <PracticeEngine domainSlug="flujo" />

            </main>
        </div>
    );
}
