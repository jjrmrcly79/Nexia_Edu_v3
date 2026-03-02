"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PracticeEngine from '@/components/PracticeEngine';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

function PracticeContent() {
    const searchParams = useSearchParams();
    const domainSlug = searchParams.get('domainSlug') || undefined;
    const domainId = searchParams.get('domainId') || undefined;
    const contextType = searchParams.get('context_type') || undefined;
    const contextId = searchParams.get('context_id') || undefined;

    if (!domainSlug && !domainId && !contextId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-white rounded-lg shadow-sm border border-dashed">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Selecciona un tema</h2>
                <p className="text-gray-500 mb-6">Para comenzar a practicar, elige un término del glosario o una habilidad.</p>
                <Link href="/glossary">
                    <Button>Ir al Glosario</Button>
                </Link>
            </div>
        );
    }

    return (
        <PracticeEngine
            domainSlug={domainSlug}
            domainId={domainId}
            contextType={contextType}
            contextId={contextId}
        />
    );
}

export default function PracticePage() {
    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="max-w-2xl mx-auto space-y-6">
                <Link href="/glossary">
                    <Button variant="ghost" size="sm" className="mb-4 text-gray-600 hover:text-gray-900">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Glosario
                    </Button>
                </Link>

                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Modo de Práctica</h1>
                    <p className="text-gray-500">Pon a prueba tus conocimientos.</p>
                </div>

                <Suspense fallback={<div className="p-10 text-center text-gray-500">Cargando práctica...</div>}>
                    <PracticeContent />
                </Suspense>
            </div>
        </div>
    );
}
