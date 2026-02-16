"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, BookOpen, CheckSquare, Dumbbell, Quote } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PracticeEngine from "@/components/PracticeEngine";

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
    // In real app, fetch data based on params.slug

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
                    <h1 className="font-bold text-lg text-gray-900 truncate">{MOCK_DATA.title}</h1>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 py-6 space-y-6">

                {/* Intro */}
                <div className="bg-blue-600 rounded-xl p-6 text-white shadow-lg">
                    <h2 className="text-2xl font-bold mb-2">{MOCK_DATA.title}</h2>
                    <p className="text-blue-100 text-sm leading-relaxed">{MOCK_DATA.description}</p>
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
                            <span>3 items</span>
                        </div>
                        <Accordion type="single" collapsible className="w-full bg-white rounded-lg border px-2">
                            {MOCK_DATA.concepts.map((c, i) => (
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
                        </div>
                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                {MOCK_DATA.checklist.map((item, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="h-5 w-5 rounded border border-gray-300 flex-shrink-0 mt-0.5" />
                                        <label className="text-sm text-gray-700 leading-snug">{item}</label>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* 3. Evidence */}
                    <TabsContent value="evidence" className="space-y-4 mt-4">
                        {MOCK_DATA.evidence.map((ev, i) => (
                            <Card key={i} className="bg-slate-50 border-slate-200">
                                <CardContent className="pt-6">
                                    <Quote className="h-8 w-8 text-blue-200 mb-2" />
                                    <p className="text-sm text-gray-800 italic mb-3">"{ev.quote}"</p>
                                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">— {ev.source}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>

                    {/* 4. Practice */}
                    <TabsContent value="practice" className="mt-4">
                        <TabsContent value="practice" className="mt-4">
                            <PracticeEngine domainSlug="flujo" />
                        </TabsContent>
                    </TabsContent>

                </Tabs>

            </main>
        </div>
    );
}
