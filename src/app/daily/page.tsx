"use client";

import PracticeEngine from "@/components/PracticeEngine";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function DailyReviewPage() {
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
                    <p className="text-green-100 text-sm">
                        Dedica 3 minutos a reforzar lo que has aprendido. Respondamos algunas preguntas.
                    </p>
                </div>

                {/* For MVP we use 'flujo' domain, later this could be random or mixed */}
                <PracticeEngine domainSlug="flujo" />

            </main>
        </div>
    );
}
