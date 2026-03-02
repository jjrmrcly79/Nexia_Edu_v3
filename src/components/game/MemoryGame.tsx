"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import confetti from "canvas-confetti";
import { Loader2, Award, Trophy } from "lucide-react";

interface Concept {
    id: string;
    name: string;
    definition: string;
    domain_id: string;
}

interface Card {
    id: string; // Unique combination of conceptId + type
    conceptId: string;
    type: "name" | "definition";
    content: string;
    isFlipped: boolean;
    isMatched: boolean;
}

export function MemoryGame({ domainId }: { domainId: string }) {
    const [cards, setCards] = useState<Card[]>([]);
    // Flipped state is derived automatically to prevent race conditions
    const [matchedPairs, setMatchedPairs] = useState<number>(0);
    const [totalPairs, setTotalPairs] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [gameStatus, setGameStatus] = useState<"playing" | "won">("playing");
    const [pointsEarned, setPointsEarned] = useState(0);

    // Stats from DB after winning
    const [winStats, setWinStats] = useState<any>(null);

    useEffect(() => {
        loadGame();
    }, [domainId]);

    const loadGame = async () => {
        setIsLoading(true);
        setGameStatus("playing");
        setMatchedPairs(0);
        setWinStats(null);

        const { data, error } = await supabase.rpc("get_memory_game_concepts_rpc", {
            _domain_id: domainId,
            _limit: 4, // 4 pairs = 8 cards for a quick session
        });

        if (error || !data) {
            console.error("Error loading concepts:", error);
            setIsLoading(false);
            return;
        }

        const concepts = data as Concept[];
        setTotalPairs(concepts.length);

        // Create 2 cards per concept (Name and Definition)
        const newCards: Card[] = [];
        concepts.forEach((concept) => {
            newCards.push({
                id: `${concept.id}-name`,
                conceptId: concept.id,
                type: "name",
                content: concept.name,
                isFlipped: false,
                isMatched: false,
            });
            newCards.push({
                id: `${concept.id}-def`,
                conceptId: concept.id,
                type: "definition",
                content: concept.definition,
                isFlipped: false,
                isMatched: false,
            });
        });

        // Separate and shuffle cards for the "Match columns" layout
        const nameCards = newCards.filter(c => c.type === 'name').sort(() => Math.random() - 0.5);
        const defCards = newCards.filter(c => c.type === 'definition').sort(() => Math.random() - 0.5);
        setCards([...nameCards, ...defCards]);

        setIsLoading(false);
    };

    // Check for win separately to ensure state is fresh
    useEffect(() => {
        if (matchedPairs > 0 && matchedPairs === totalPairs) {
            handleWin();
        }
    }, [matchedPairs, totalPairs]);

    const handleCardClick = (index: number) => {
        if (gameStatus !== "playing") return;

        setCards((prevCards) => {
            if (prevCards[index].isFlipped || prevCards[index].isMatched) return prevCards;

            // Encontrar cuantas cartas estan volteadas y NO empatadas
            const currentlyFlipped = prevCards.reduce<{ index: number, conceptId: string }[]>((acc, card, i) => {
                if (card.isFlipped && !card.isMatched) {
                    acc.push({ index: i, conceptId: card.conceptId });
                }
                return acc;
            }, []);

            if (currentlyFlipped.length >= 2) return prevCards; // Bloquear si ya hay 2

            // Voltear la carta
            const newCards = [...prevCards];
            newCards[index] = { ...newCards[index], isFlipped: true };

            // Evaluar nuevo estado
            const newlyFlipped = [...currentlyFlipped, { index, conceptId: newCards[index].conceptId }];

            if (newlyFlipped.length === 2) {
                const first = newlyFlipped[0];
                const second = newlyFlipped[1];
                const match = first.conceptId === second.conceptId;

                if (match) {
                    setTimeout(() => {
                        setCards((latestCards) => {
                            const matchedCards = [...latestCards];
                            matchedCards[first.index] = { ...matchedCards[first.index], isMatched: true };
                            matchedCards[second.index] = { ...matchedCards[second.index], isMatched: true };
                            return matchedCards;
                        });
                        setMatchedPairs((prev) => prev + 1);
                    }, 600);
                } else {
                    setTimeout(() => {
                        setCards((latestCards) => {
                            const resetCards = [...latestCards];
                            resetCards[first.index] = { ...resetCards[first.index], isFlipped: false };
                            resetCards[second.index] = { ...resetCards[second.index], isFlipped: false };
                            return resetCards;
                        });
                    }, 4000);
                }
            }

            return newCards;
        });
    };

    const handleWin = async () => {
        setGameStatus("won");
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
        });

        // Extract unique concept IDs that were played
        const conceptIds = Array.from(new Set(cards.map((c) => c.conceptId)));
        const earned = totalPairs * 10; // 10 points per pair
        setPointsEarned(earned);

        try {
            const { data: userData } = await supabase.auth.getUser();
            const currentUserId = userData?.user?.id || 'juan-123';

            const { data, error } = await supabase.rpc("save_game_result_rpc", {
                _user_id: currentUserId,
                _concept_ids: conceptIds,
                _points_earned: earned,
            });

            if (!error && data) {
                setWinStats(data[0]);
            }
        } catch (err) {
            console.error("Error saving game results:", err);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto p-4">
            {/* Game Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Memorama Lean</h2>
                    <p className="text-gray-500 text-sm">Empareja el concepto con su definición</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl">
                    <span className="text-blue-700 font-semibold">{matchedPairs} / {totalPairs} Pares</span>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 gap-3 md:gap-6">
                {/* Columna de Conceptos */}
                <div className="flex flex-col gap-3 md:gap-4">
                    <h3 className="text-center font-bold text-indigo-800 text-[10px] sm:text-sm tracking-wider uppercase bg-indigo-50 border border-indigo-100 py-2 rounded-xl">Conceptos</h3>
                    {cards.slice(0, totalPairs).map((card, index) => (
                        <div
                            key={card.id}
                            className="w-full aspect-[4/3] sm:aspect-[2/1]"
                            style={{ perspective: "1000px" }}
                            onClick={() => handleCardClick(index)}
                        >
                            <motion.div
                                className={`w-full h-full relative cursor-pointer ${card.isMatched ? "opacity-60" : ""}`}
                                style={{ transformStyle: "preserve-3d" }}
                                initial={false}
                                animate={{ rotateY: card.isFlipped || card.isMatched ? 180 : 0 }}
                                transition={{ duration: 0.4, type: "spring", stiffness: 260, damping: 20 }}
                            >
                                {/* Card Back */}
                                <div
                                    className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-md border border-indigo-400 flex flex-col items-center justify-center p-2"
                                    style={{ backfaceVisibility: "hidden" }}
                                >
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center sm:mb-1">
                                        <span className="text-white font-bold text-lg sm:text-xl">💡</span>
                                    </div>
                                    <span className="text-indigo-100 text-[10px] sm:text-xs font-medium hidden sm:block">Ficha</span>
                                </div>

                                {/* Card Front */}
                                <div
                                    className="absolute inset-0 bg-white rounded-xl shadow-lg border-2 border-indigo-100 flex items-center justify-center p-2 sm:p-4 overflow-hidden"
                                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                                >
                                    <h3 className="text-xs sm:text-base md:text-lg font-bold text-indigo-900 text-center break-words">
                                        {card.content}
                                    </h3>
                                </div>
                            </motion.div>
                        </div>
                    ))}
                </div>

                {/* Columna de Definiciones */}
                <div className="flex flex-col gap-3 md:gap-4">
                    <h3 className="text-center font-bold text-blue-800 text-[10px] sm:text-sm tracking-wider uppercase bg-blue-50 border border-blue-100 py-2 rounded-xl">Definiciones</h3>
                    {cards.slice(totalPairs).map((card, relativeIndex) => {
                        const index = totalPairs + relativeIndex;
                        return (
                            <div
                                key={card.id}
                                className="w-full aspect-[4/3] sm:aspect-[2/1]"
                                style={{ perspective: "1000px" }}
                                onClick={() => handleCardClick(index)}
                            >
                                <motion.div
                                    className={`w-full h-full relative cursor-pointer ${card.isMatched ? "opacity-60" : ""}`}
                                    style={{ transformStyle: "preserve-3d" }}
                                    initial={false}
                                    animate={{ rotateY: card.isFlipped || card.isMatched ? 180 : 0 }}
                                    transition={{ duration: 0.4, type: "spring", stiffness: 260, damping: 20 }}
                                >
                                    {/* Card Back */}
                                    <div
                                        className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-md border border-blue-400 flex flex-col items-center justify-center p-2"
                                        style={{ backfaceVisibility: "hidden" }}
                                    >
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center sm:mb-1">
                                            <span className="text-white font-bold text-lg sm:text-xl">📖</span>
                                        </div>
                                        <span className="text-blue-100 text-[10px] sm:text-xs font-medium hidden sm:block">Lectura</span>
                                    </div>

                                    {/* Card Front */}
                                    <div
                                        className="absolute inset-0 bg-slate-50 rounded-xl shadow-lg border-2 border-blue-200 flex items-center justify-center p-2 sm:p-4 overflow-hidden"
                                        style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                                    >
                                        <div className="w-full h-full overflow-y-auto pr-1">
                                            <div className="min-h-full flex items-center justify-center">
                                                <p className="text-[9px] sm:text-xs md:text-sm text-slate-700 text-center sm:leading-relaxed">
                                                    {card.content}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Win Modal Overlay */}
            <AnimatePresence>
                {gameStatus === "won" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
                        >
                            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Trophy className="w-10 h-10 text-yellow-500" />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">¡Excelente Trabajo!</h2>
                            <p className="text-gray-600 mb-6">Has reforzado tu conocimiento en estos conceptos.</p>

                            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Puntos de Experiencia (XP)</span>
                                    <span className="font-bold text-green-600">+{pointsEarned} XP</span>
                                </div>

                                {winStats && winStats.badges_upgraded > 0 && (
                                    <div className="flex justify-between items-center text-sm border-t pt-3">
                                        <span className="text-gray-600 flex items-center gap-1">
                                            <Award className="w-4 h-4 text-orange-500" />
                                            Nuevas Medallas
                                        </span>
                                        <span className="font-bold text-orange-600">{winStats.badges_upgraded}</span>
                                    </div>
                                )}
                            </div>

                            {winStats?.rank_upgraded && (
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 text-white mb-6 animate-pulse shadow-lg">
                                    <p className="text-sm font-medium text-blue-100 mb-1">¡Subiste de Rango!</p>
                                    <p className="text-xl font-bold">{winStats.new_rank_title}</p>
                                </div>
                            )}

                            <button
                                onClick={loadGame}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-md hover:shadow-lg"
                            >
                                Jugar de Nuevo
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
