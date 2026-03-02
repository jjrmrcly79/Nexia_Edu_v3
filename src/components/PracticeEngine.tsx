"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, AlertCircle, Loader2, ArrowRight, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import TopicSummaryModal from "@/components/TopicSummaryModal";
import { BookOpen } from "lucide-react";

interface Item {
    id: string;
    prompt: string;
    options: Record<string, string>;
    correct_answer: { answer: string } | string;
    explanation: string;
    item_type: string;
    concept_id?: string;
    skill_id?: string;
}

// ... existing code ...



interface PracticeEngineProps {
    domainSlug?: string;
    domainId?: string;
    contextType?: string; // 'concept', 'skill', 'tool', etc
    contextId?: string;   // uuid
}

export default function PracticeEngine({ domainSlug, domainId, contextType, contextId }: PracticeEngineProps) {
    const [status, setStatus] = useState<"loading" | "active" | "finished">("loading");
    const [questions, setQuestions] = useState<Item[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);

    useEffect(() => {
        fetchQuestions();
    }, [domainSlug, domainId, contextId]);

    const fetchQuestions = async () => {
        setStatus("loading");
        setScore(0);
        setCurrentIndex(0);

        // Call updated RPC
        const { data, error } = await supabase
            .rpc('get_practice_items_rpc', {
                _domain_slug: domainSlug || null,
                _domain_id: domainId || null,
                _context_type: contextType || null,
                _context_id: contextId || null,
                _limit: 5
            });

        if (error) {
            console.error("Error fetching questions:", error);
            setQuestions([]);
        } else {
            setQuestions(data || []);
        }
        setStatus("active");
    };



    const normalizeText = (text: string) => {
        if (!text) return '';
        return text
            .normalize('NFC')
            .toLowerCase()
            .replace(/^[a-d0-9][\)\.]\s*/, '') // Remove prefixes like "a) ", "1. "
            .replace(/[\u00a0\u1680​\u180e\u2000-\u200b\u202f\u205f\u3000\ufeff]/g, ' ') // Standardize spaces
            .replace(/\s+/g, ' ')
            .replace(/^["']+|["']+$/g, '')     // Remove leading/trailing quotes
            .trim();
    };

    const getCorrectAnswerKey = (q: Item): string | null => {
        if (!q || !q.correct_answer) return null;

        const optionsArr = Object.entries(q.options || {});

        // Caso 1: { answer: "A" } — clave directa
        if (typeof q.correct_answer === 'object' && (q.correct_answer as any).answer) {
            return (q.correct_answer as any).answer;
        }

        // Caso 2: String — puede ser texto con unicode escapado, JSON-encoded, o la clave directa
        if (typeof q.correct_answer === 'string') {
            let answerText = q.correct_answer.trim();
            const originalText = answerText;

            // Desescapar iterativamente (JSON o comillas simples/dobles)
            for (let i = 0; i < 3; i++) {
                const before = answerText;
                try {
                    // Si contiene escapes unicode literales como \u00f3, JSON.parse los manejará si los envolvemos en comillas
                    const toParse = answerText.startsWith('"') ? answerText : `"${answerText}"`;
                    const parsed = JSON.parse(toParse);
                    if (typeof parsed === 'string') answerText = parsed;
                    else break;
                } catch {
                    // Remover comillas manuales si JSON.parse falla
                    if (
                        (answerText.startsWith('"') && answerText.endsWith('"')) ||
                        (answerText.startsWith("'") && answerText.endsWith("'"))
                    ) {
                        answerText = answerText.slice(1, -1);
                    }
                }
                if (answerText === before) break;
            }

            // 2a. Match exacto después de trim
            let found = optionsArr.find(([, val]) => val.trim() === answerText.trim());
            if (found) return found[0];

            // 2b. Match normalizado (ignora mayúsculas, prefijos, comillas, tipos de espacios)
            const normalizedAnswer = normalizeText(answerText);
            found = optionsArr.find(([, val]) => normalizeText(val) === normalizedAnswer);
            if (found) return found[0];

            // 2c. Fallback: el string podría ser la clave directamente (ej. "A", "B")
            if (q.options[originalText]) return originalText;
            if (q.options[answerText]) return answerText;
        }

        return null;
    };

    const handleCheck = async () => {
        if (!selectedAnswer) return;
        setIsSubmitted(true);
        const currentQ = questions[currentIndex];
        const correctKey = getCorrectAnswerKey(currentQ);
        const isCorrect = correctKey === selectedAnswer;

        if (isCorrect) {
            setScore(s => s + 1);
        }

        // Save progress using hardcoded MVP user_id Since there's no auth yet
        try {
            await supabase.rpc('save_practice_progress_rpc', {
                _user_id: 'juan-123',
                _item_id: currentQ.id,
                _is_correct: isCorrect
            });
        } catch (err) {
            console.error("Failed to save progress", err);
        }
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(i => i + 1);
            setSelectedAnswer(null);
            setIsSubmitted(false);
        } else {
            setStatus("finished");
        }
    };

    if (status === "loading") {
        return (
            <Card className="w-full min-h-[300px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-gray-500">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                    <p className="text-sm">Buscando preguntas...</p>
                </div>
            </Card>
        );
    }

    if (status === "finished") {
        return (
            <Card className="text-center py-10 transition-all animate-in zoom-in-95">
                <CardContent className="space-y-6">
                    <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900">¡Práctica Completada!</h3>
                        <p className="text-gray-500 mt-2">
                            Obtuviste <span className="font-bold text-green-600">{score}</span> de <span className="font-bold">{questions.length}</span> correctas.
                        </p>
                    </div>
                    <Button onClick={fetchQuestions} className="w-full max-w-xs gap-2 bg-purple-600 hover:bg-purple-700">
                        <RotateCcw className="h-4 w-4" />
                        Practicar más conceptos
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (questions.length === 0) {
        return (
            <Card className="text-center py-10">
                <CardContent>
                    <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <p className="text-gray-600 font-medium">No encontramos preguntas para este tema específico.</p>
                    <p className="text-sm text-gray-400 mt-1">Intenta con el dominio general o genera más contenido.</p>
                    <Button variant="outline" onClick={fetchQuestions} className="mt-6">Reintentar</Button>
                </CardContent>
            </Card>
        )
    }

    const currentQ = questions[currentIndex];

    // Convert options object "A": "text" to array and filter out empty ones
    const optionsArr = Object.entries(currentQ.options || {}).filter(([, val]) => val && val.trim() !== "");

    if (optionsArr.length === 0) {
        return (
            <Card className="text-center py-10">
                <CardContent>
                    <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <p className="text-gray-600 font-medium">Esta pregunta no tiene opciones de respuesta válidas.</p>
                    <p className="text-sm text-gray-400 mt-1">Contacta al administrador para revisar el item ID: {currentQ.id}</p>
                    <Button variant="outline" onClick={handleNext} className="mt-6">Saltar Pregunta</Button>
                </CardContent>
            </Card>
        );
    }

    const correctAnswerKey = getCorrectAnswerKey(currentQ);
    const isCorrect = selectedAnswer === correctAnswerKey;

    return (
        <Card className="w-full shadow-lg border-t-4 border-t-purple-500">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">
                        Pregunta {currentIndex + 1} de {questions.length}
                    </span>
                    <Badge variant="secondary" className="bg-purple-50 text-purple-700 hover:bg-purple-100">
                        {currentQ.item_type?.toUpperCase()}
                    </Badge>
                </div>
                <CardTitle className="text-lg leading-snug font-medium text-gray-800">
                    {currentQ.prompt}
                </CardTitle>
                <Progress value={((currentIndex) / questions.length) * 100} className="h-1 mt-4 bg-gray-100" />
            </CardHeader>

            <CardContent className="space-y-3 pt-4">
                {optionsArr.map(([key, text]) => {
                    let variant = "outline";
                    let className = "w-full justify-start text-left h-auto py-3 px-4 whitespace-normal transition-all hover:bg-gray-50";

                    if (isSubmitted) {
                        if (key === correctAnswerKey) {
                            variant = "default";
                            className = "w-full justify-start text-left h-auto py-3 px-4 whitespace-normal bg-green-600 hover:bg-green-700 text-white border-green-600 font-medium shadow-sm";
                        }
                        else if (key === selectedAnswer && selectedAnswer !== correctAnswerKey) {
                            variant = "destructive";
                            className = "w-full justify-start text-left h-auto py-3 px-4 whitespace-normal bg-red-50 text-red-700 border-red-200";
                        }
                    } else {
                        if (key === selectedAnswer) {
                            variant = "secondary";
                            className = "w-full justify-start text-left h-auto py-3 px-4 whitespace-normal border-purple-500 ring-1 ring-purple-500 bg-purple-50 text-purple-900";
                        }
                    }

                    return (
                        <Button
                            key={key}
                            variant={variant as any}
                            className={className}
                            onClick={() => !isSubmitted && setSelectedAnswer(key)}
                            disabled={isSubmitted}
                        >
                            <span className={`font-bold mr-3 w-6 h-6 flex items-center justify-center rounded-full text-xs border ${isSubmitted && key === correctAnswerKey ? "border-white bg-white/20" : "border-gray-200 bg-gray-50 text-gray-500"}`}>
                                {key}
                            </span>
                            <span className="flex-1">{text}</span>
                            {isSubmitted && key === correctAnswerKey && <CheckCircle2 className="h-5 w-5 ml-2" />}
                            {isSubmitted && key === selectedAnswer && key !== correctAnswerKey && <XCircle className="h-5 w-5 ml-2" />}
                        </Button>
                    )
                })}

                {/* Feedback Area */}
                {isSubmitted && (
                    <div className={`mt-6 p-4 rounded-lg border animate-in fade-in slide-in-from-top-2 ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            {isCorrect ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                                <XCircle className="h-5 w-5 text-red-600" />
                            )}
                            <h3 className={`font-bold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                                {isCorrect ? "¡Respuesta Correcta!" : "Respuesta Incorrecta"}
                            </h3>
                        </div>

                        {!isCorrect && (
                            <div className="mb-3 text-sm">
                                <span className="font-semibold text-red-700">Tu respuesta:</span> <span className="text-gray-700">{currentQ.options[selectedAnswer!]}</span>
                                <br />
                                <span className="font-semibold text-green-700">Respuesta correcta:</span> <span className="text-gray-700">{
                                    correctAnswerKey
                                        ? currentQ.options[correctAnswerKey]
                                        : (typeof currentQ.correct_answer === 'string' ? currentQ.correct_answer : JSON.stringify(currentQ.correct_answer))
                                }</span>
                            </div>
                        )}



                        <div className="bg-white/50 p-3 rounded border border-gray-200/50">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Explicación</p>
                            <p className="text-gray-800 text-sm leading-relaxed mb-2">
                                {currentQ.explanation}
                            </p>

                            {/* Topic Summary Button */}
                            <TopicSummaryModal
                                type={currentQ.skill_id ? 'skill' : 'concept'}
                                id={currentQ.skill_id || currentQ.concept_id || contextId || ''}
                                contextData={{
                                    title: "Revisión de Pregunta",
                                    description: currentQ.explanation,
                                    concepts: [currentQ.prompt],
                                    domain: domainSlug || "Práctica"
                                }}
                                trigger={
                                    <Button variant="link" className="p-0 h-auto text-purple-600 hover:text-purple-700 font-medium text-xs flex items-center gap-1">
                                        <BookOpen className="h-3 w-3" />
                                        Profundizar en este tema
                                    </Button>
                                }
                            />
                        </div>
                    </div>
                )}
            </CardContent>

            <CardFooter className="pt-2 pb-6">
                {!isSubmitted ? (
                    <Button
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium"
                        onClick={handleCheck}
                        disabled={!selectedAnswer}
                    >
                        Comprobar Respuesta
                    </Button>
                ) : (
                    <Button className="w-full gap-2 bg-purple-600 hover:bg-purple-700 text-white" onClick={handleNext}>
                        {currentIndex < questions.length - 1 ? "Siguiente Pregunta" : "Ver Resultados Finales"}
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
