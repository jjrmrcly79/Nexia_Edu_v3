"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, BookOpen, CheckSquare, Dumbbell, Quote } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PracticeEngine from "@/components/PracticeEngine";
import TopicSummaryModal from "@/components/TopicSummaryModal";

// Mock data for MVP
const MOCK_DATA = {
    title: "Flujo Continuo (Flow)",
    domain: "Lean Manufacturing",
    description: "El flujo continuo busca producir y mover una pieza a la vez, reduciendo el inventario en proceso y exponiendo problemas.",
    concepts: [
        { title: "WIP (Work In Process)", text: "Cantidad de inventario entre el inicio y el final de un proceso. Limitar el WIP mejora el flujo." },
        { title: "One Piece Flow", text: "Procesar una unidad a la vez en lugar de lotes grandes para reducir tiempos de espera." },
        { title: "Takt Time", text: "El ritmo al que se debe producir para satisfacer la demanda del cliente (Tiempo Disponible / Demanda)." }
    ],
    checklist: [
        "Identificar cuellos de botella en el proceso actual.",
        "Eliminar acumulaciones de inventario entre estaciones.",
        "Balancear las cargas de trabajo para igualar al Takt Time.",
        "Implementar señales visuales para detener la línea si hay problemas."
    ],
    evidence: [
        { source: "The Toyota Way, Cap. 4", quote: "El flujo expone problemas que permanecen ocultos en los lotes grandes. Es la clave para el Kaizen." },
        { source: "Lean Thinking", quote: "El flujo continuo reduce el tiempo de entrega de semanas a horas." }
    ]
};

export default function SkillPage() {
    const params = useParams();
    const [skillId, setSkillId] = useState<string | null>(null);
    const [correctAnswers, setCorrectAnswers] = useState<number>(0);
    const [domainData, setDomainData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params?.slug) {
            async function fetchSkillData() {
                setLoading(true);
                // 1. Fetch full domain data
                const { data: dData } = await supabase.rpc('get_domain_full_data_rpc', {
                    _slug: params.slug
                });

                if (dData) {
                    setDomainData(dData);

                    // 2. Fetch skill ID if needed for TopicSummaryModal (fallback to domain ID)
                    const { data: sData } = await supabase.rpc('get_skill_id_by_slug_rpc', {
                        _slug: params.slug
                    });

                    if (sData && sData.length > 0) {
                        setSkillId(sData[0].skill_id);
                    }

                    // 3. Fetch specific correct answers for this domain to mark checklist
                    const { count } = await supabase
                        .from('user_progress')
                        .select('id', { count: 'exact', head: true })
                        .eq('user_id', 'juan-123')
                        .eq('is_correct', true)
                        .filter('item_id', 'in', `(select id from learning.items where domain_id = '${dData.id}')`);

                    if (count !== null) {
                        setCorrectAnswers(count);
                    }
                }
                setLoading(false);
            }
            fetchSkillData();
        }
    }, [params?.slug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
                    <p className="text-gray-500 animate-pulse">Cargando material de estudio...</p>
                </div>
            </div>
        );
    }

    const currentData = domainData || MOCK_DATA;

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
                    <h1 className="font-bold text-lg text-gray-900 truncate">{currentData.title}</h1>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 py-6 space-y-6">

                {/* Intro */}
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-3">
                            <h2 className="text-xl font-bold text-gray-900 pr-2">{currentData.title}</h2>
                            <TopicSummaryModal
                                type={skillId ? "skill" : "concept"}
                                id={skillId || currentData.id}
                                contextData={currentData}
                                trigger={
                                    <Button variant="outline" size="sm" className="gap-2 shrink-0 text-blue-600 border-blue-100 hover:bg-blue-50">
                                        <BookOpen className="h-4 w-4" />
                                        <span className="hidden sm:inline">Lectura IA</span>
                                        <span className="sm:hidden">IA</span>
                                    </Button>
                                }
                            />
                        </div>
                        <ScrollArea className="h-[120px] w-full rounded-md pr-4">
                            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{currentData.description}</p>
                        </ScrollArea>
                    </div>
                </div>

                {/* Content Tabs */}
                <Tabs defaultValue="learn" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="learn"><BookOpen className="h-4 w-4" /></TabsTrigger>
                        <TabsTrigger value="check"><CheckSquare className="h-4 w-4" /></TabsTrigger>
                        <TabsTrigger value="evidence"><Quote className="h-4 w-4" /></TabsTrigger>
                        <TabsTrigger value="practice"><Dumbbell className="h-4 w-4" /></TabsTrigger>
                    </TabsList>

                    {/* 1. Concepts */}
                    <TabsContent value="learn" className="space-y-4 mt-4">
                        <div className="flex items-center justify-between text-sm text-gray-500 px-1">
                            <span>Conceptos Clave</span>
                            <span>{currentData.concepts.length} items</span>
                        </div>
                        <Accordion type="single" collapsible className="w-full bg-white rounded-lg border px-2">
                            {currentData.concepts.map((c: any, i: number) => (
                                <AccordionItem value={`item-${i}`} key={i} className="border-b-0">
                                    <AccordionTrigger className="hover:no-underline font-medium text-gray-800">{c.title}</AccordionTrigger>
                                    <AccordionContent className="text-gray-600 text-sm pb-4">
                                        {c.text}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </TabsContent>

                    {/* 2. Checklist */}
                    <TabsContent value="check" className="space-y-4 mt-4">
                        <div className="flex items-center justify-between text-sm text-gray-500 px-1">
                            <span>Lista de Verificación</span>
                            <span className="font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">
                                {Math.min(correctAnswers, currentData.checklist.length)} / {currentData.checklist.length}
                            </span>
                        </div>
                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                {currentData.checklist.length > 0 ? (
                                    currentData.checklist.map((item: string, i: number) => {
                                        const isCompleted = i < correctAnswers;
                                        return (
                                            <div key={i} className={`flex items-start gap-3 transition-all ${isCompleted ? 'opacity-60' : ''}`}>
                                                <div className={`h-5 w-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${isCompleted ? 'bg-green-500 text-white' : 'border border-gray-300'}`}>
                                                    {isCompleted && <CheckSquare className="h-3.5 w-3.5" />}
                                                </div>
                                                <label className={`text-sm leading-snug ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                                                    {item}
                                                </label>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-xs text-center text-gray-400 py-4 italic">No hay requisitos listados para este dominio.</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* 3. Evidence */}
                    <TabsContent value="evidence" className="space-y-4 mt-4">
                        {currentData.evidence?.length > 0 ? (
                            currentData.evidence.map((ev: any, i: number) => (
                                <Card key={i} className="bg-slate-50 border-slate-200">
                                    <CardContent className="pt-6">
                                        <Quote className="h-8 w-8 text-blue-200 mb-2" />
                                        <p className="text-sm text-gray-800 italic mb-3">"{ev.quote}"</p>
                                        <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">— {ev.source}</p>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-4">No hay referencias disponibles para este tema.</p>
                        )}
                    </TabsContent>

                    {/* 4. Practice */}
                    <TabsContent value="practice" className="mt-4">
                        <PracticeEngine domainSlug={params?.slug as string} />
                    </TabsContent>

                </Tabs>

            </main>
        </div>
    );
}
