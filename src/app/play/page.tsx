"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MemoryGame } from "@/components/game/MemoryGame";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PlayPage() {
    const [domains, setDomains] = useState<any[]>([]);
    const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDomains();
    }, []);

    const loadDomains = async () => {
        setIsLoading(true);
        // Specify the 'learning' schema to fetch domains correctly
        const { data } = await supabase.schema('learning').from("domains").select("*");
        if (data) setDomains(data);
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <main className="max-w-4xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <Link href="/" className="inline-flex items-center text-gray-500 hover:text-indigo-600 transition-colors mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver al Inicio
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Salón de Entrenamiento</h1>
                    <p className="text-gray-600 mt-2">Refuerza tus conocimientos con mini-juegos y asume nuevos retos.</p>
                </div>

                {selectedDomain ? (
                    <div>
                        <div className="mb-6 flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
                            <div>
                                <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Modo Activo</span>
                                <h3 className="text-xl font-bold">Memorama</h3>
                            </div>
                            <button
                                onClick={() => setSelectedDomain(null)}
                                className="text-gray-500 hover:text-gray-800 font-medium py-2 px-4 rounded-lg border hover:bg-gray-50"
                            >
                                Cambiar Tema
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 md:p-6">
                            <MemoryGame domainId={selectedDomain} />
                        </div>
                    </div>
                ) : (
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Elige un dominio para practicar:</h2>
                        {isLoading ? (
                            <div className="flex justify-center p-12">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {domains.map((domain) => (
                                    <button
                                        key={domain.id}
                                        onClick={() => setSelectedDomain(domain.id)}
                                        className="flex flex-col items-start bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-300 hover:shadow-md transition-all text-left group"
                                    >
                                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
                                            <span className="text-2xl">🧠</span>
                                        </div>
                                        <h3 className="font-bold text-gray-900 text-lg">{domain.name}</h3>
                                        <p className="text-gray-500 text-sm mt-1 line-clamp-2">{domain.description}</p>

                                        <div className="mt-4 text-indigo-600 font-medium text-sm flex items-center">
                                            Jugar Memorama
                                            <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-0 group-hover:translate-x-1">→</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
