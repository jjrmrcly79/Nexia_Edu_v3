"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, AlertCircle, Loader2, ArrowRight, RotateCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Item {
    id: string;
    prompt: string;
    options: Record<string, string>;
    correct_answer: { answer: string };
    explanation: string;
    item_type: string;
}

export default function PracticeEngine({ domainSlug }: { domainSlug: string }) {
    const [status, setStatus] = useState<"loading" | "active" | "finished">("loading");
    const [questions, setQuestions] = useState<Item[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);

    useEffect(() => {
        fetchQuestions();
    }, [domainSlug]);

    const fetchQuestions = async () => {
        setStatus("loading");
        setScore(0);
        setCurrentIndex(0);

        // Call RPC
        const { data, error } = await supabase
            .rpc('get_assessment_items_rpc', {
                _domain_slug: domainSlug,
                _limit: 5
            });

        if (error) {
            console.error("Error fetching questions:", error);
            // Fallback or error state could be handled here
            setQuestions([]);
        } else {
            setQuestions(data || []);
        }
        setStatus("active");
    };

    const handleCheck = () => {
        if (!selectedAnswer) return;
        setIsSubmitted(true);
        const currentQ = questions[currentIndex];
        // Check if correct (assuming correct_answer.answer holds the key like "A")
        if (currentQ.correct_answer.answer === selectedAnswer) {
            setScore(s => s + 1);
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
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-sm">Cargando preguntas...</p>
                </div>
            </Card>
        );
    }

    if (status === "finished") {
        return (
            <Card className="text-center py-10">
                <CardContent className="space-y-6">
                    <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900">¡Práctica Completada!</h3>
                        <p className="text-gray-500 mt-2">
                            Obtuviste <span className="font-bold text-blue-600">{score}</span> de <span className="font-bold">{questions.length}</span> correctas.
                        </p>
                    </div>
                    <Button onClick={fetchQuestions} className="w-full max-w-xs gap-2">
                        <RotateCcw className="h-4 w-4" />
                        Intentar de nuevo
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
                    <p>No hay preguntas disponibles para este tema aún.</p>
                    <Button variant="outline" onClick={fetchQuestions} className="mt-4">Reintentar</Button>
                </CardContent>
            </Card>
        )
    }

    const currentQ = questions[currentIndex];
    // Convert options object "A": "text" to array
    const optionsArr = Object.entries(currentQ.options || {});
    const isCorrect = selectedAnswer === currentQ.correct_answer.answer;

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-500 tracking-widest uppercase">
                        Pregunta {currentIndex + 1} de {questions.length}
                    </span>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {currentQ.item_type.toUpperCase()}
                    </span>
                </div>
                <CardTitle className="text-lg leading-snug">
                    {currentQ.prompt}
                </CardTitle>
                <Progress value={((currentIndex) / questions.length) * 100} className="h-1 mt-4" />
            </CardHeader>

            <CardContent className="space-y-3">
                {optionsArr.map(([key, text]) => {
                    let variant = "outline";
                    // Logic for button styles based on state
                    if (isSubmitted) {
                        if (key === currentQ.correct_answer.answer) variant = "default"; // Show correct in green/solid
                        else if (key === selectedAnswer && selectedAnswer !== currentQ.correct_answer.answer) variant = "destructive"; // Show wrong in red
                    } else {
                        if (key === selectedAnswer) variant = "secondary"; // Selection state
                    }

                    return (
                        <Button
                            key={key}
                            variant={variant as any}
                            className={`w-full justify-start text-left h-auto py-3 px-4 whitespace-normal ${isSubmitted && key === currentQ.correct_answer.answer ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' : ''
                                }`}
                            onClick={() => !isSubmitted && setSelectedAnswer(key)}
                            disabled={isSubmitted}
                        >
                            <span className="font-bold mr-3">{key}.</span>
                            <span className="flex-1">{text}</span>
                            {isSubmitted && key === currentQ.correct_answer.answer && <CheckCircle2 className="h-5 w-5 ml-2" />}
                            {isSubmitted && key === selectedAnswer && key !== currentQ.correct_answer.answer && <XCircle className="h-5 w-5 ml-2" />}
                        </Button>
                    )
                })}

                {/* Feedback Area */}
                {isSubmitted && (
                    <Alert className={`mt-4 ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        {isCorrect ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
                        <AlertTitle className={`${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                            {isCorrect ? "¡Correcto!" : "Incorrecto"}
                        </AlertTitle>
                        <AlertDescription className="text-gray-700 text-sm mt-1">
                            {currentQ.explanation}
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>

            <CardFooter className="pt-2">
                {!isSubmitted ? (
                    <Button
                        className="w-full"
                        onClick={handleCheck}
                        disabled={!selectedAnswer}
                    >
                        Comprobar Respuesta
                    </Button>
                ) : (
                    <Button className="w-full gap-2" onClick={handleNext}>
                        {currentIndex < questions.length - 1 ? "Siguiente Pregunta" : "Ver Resultados"}
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
