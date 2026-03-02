"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { Trophy, Medal, Award, Star } from "lucide-react";

interface BadgeData {
    concept_id: string;
    concept_name: string;
    mastery_level: "bronze" | "silver" | "gold";
    matches_won: number;
}

export function BadgesShowcase({ userId }: { userId: string }) {
    const [badges, setBadges] = useState<BadgeData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        async function loadBadges() {
            // 1. Fetch user badges
            const { data: userBadges, error: badgeErr } = await supabase
                .from("user_concept_badges")
                .select("*")
                .eq("user_id", userId);

            if (badgeErr || !userBadges || userBadges.length === 0) {
                setLoading(false);
                return;
            }

            // 2. Fetch the concept names from the 'learning' schema
            const conceptIds = userBadges.map((b) => b.concept_id);
            const { data: conceptsData, error: conceptErr } = await supabase
                .schema("learning")
                .from("concepts")
                .select("id, name")
                .in("id", conceptIds);

            if (!conceptErr && conceptsData) {
                // 3. Merge data
                const merged: BadgeData[] = userBadges.map((badge) => {
                    const matchedConcept = conceptsData.find((c) => c.id === badge.concept_id);
                    return {
                        concept_id: badge.concept_id,
                        concept_name: matchedConcept?.name || "Concepto",
                        mastery_level: badge.mastery_level,
                        matches_won: badge.matches_won,
                    };
                });

                // Sort by level (Gold first, then silver, then bronze) then matches won
                merged.sort((a, b) => {
                    const rank = { gold: 3, silver: 2, bronze: 1 };
                    if (rank[a.mastery_level] !== rank[b.mastery_level]) {
                        return rank[b.mastery_level] - rank[a.mastery_level];
                    }
                    return b.matches_won - a.matches_won;
                });

                setBadges(merged);
            }
            setLoading(false);
        }
        loadBadges();
    }, [userId]);

    if (loading) return null;

    if (badges.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                    <Trophy className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">Aún no tienes medallas. ¡Juega Memorama para ganar tu primera insignia Bronce!</p>
            </div>
        );
    }

    const getBadgeStyle = (level: string) => {
        switch (level) {
            case "gold":
                return {
                    bg: "bg-amber-50",
                    border: "border-amber-200",
                    text: "text-amber-700",
                    icon: <Trophy className="w-6 h-6 text-amber-500" />,
                    label: "Oro"
                };
            case "silver":
                return {
                    bg: "bg-slate-50",
                    border: "border-slate-200",
                    text: "text-slate-600",
                    icon: <Medal className="w-6 h-6 text-slate-400" />,
                    label: "Plata"
                };
            case "bronze":
            default:
                return {
                    bg: "bg-orange-50",
                    border: "border-orange-200",
                    text: "text-orange-700",
                    icon: <Award className="w-6 h-6 text-orange-500" />,
                    label: "Bronce"
                };
        }
    };

    const calculateProgress = (level: string, matches: number) => {
        if (level === "gold") return 100;
        if (level === "silver") return Math.min((matches / 15) * 100, 100);
        return Math.min((matches / 5) * 100, 100);
    };

    const BadgeItem = ({ badge, idx }: { badge: BadgeData; idx?: number }) => {
        const style = getBadgeStyle(badge.mastery_level);
        const progress = calculateProgress(badge.mastery_level, badge.matches_won);

        return (
            <motion.div
                initial={idx !== undefined ? { opacity: 0, scale: 0.95 } : false}
                animate={idx !== undefined ? { opacity: 1, scale: 1 } : false}
                transition={idx !== undefined ? { delay: idx * 0.05 } : undefined}
                className={`relative overflow-hidden rounded-xl p-3 border ${style.bg} ${style.border} flex flex-col items-center text-center`}
            >
                <div className="mb-2 bg-white/60 p-2 rounded-full shadow-sm">
                    {style.icon}
                </div>
                <h4 className={`font-semibold text-[11px] leading-tight mb-2 ${style.text} line-clamp-2 min-h-[28px] flex items-center`}>
                    {badge.concept_name}
                </h4>

                <div className="w-full bg-black/5 rounded-full h-1 mt-auto">
                    <div
                        className="bg-current h-full rounded-full transition-all duration-1000 ease-out opacity-40"
                        style={{ width: `${progress}%`, color: 'inherit' }}
                    />
                </div>
                <span className={`text-[9px] uppercase font-bold tracking-wider mt-1 opacity-70 ${style.text}`}>
                    {style.label}
                </span>
            </motion.div>
        );
    };

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    Trofeos ({badges.length})
                </h3>
            </div>

            <div className="grid grid-cols-3 gap-2">
                {badges.slice(0, 3).map((badge, idx) => (
                    <BadgeItem key={`preview-${badge.concept_id}`} badge={badge} idx={idx} />
                ))}
            </div>

            {badges.length > 3 && (
                <div className="text-center pt-1">
                    <button
                        onClick={() => setShowAll(true)}
                        className="text-xs text-blue-600 font-medium hover:text-blue-800 transition-colors"
                    >
                        Ver las {badges.length} medallas →
                    </button>
                </div>
            )}

            {/* Modal to view all badges */}
            {showAll && (
                <div className="fixed inset-0 z-50 flex flex-col bg-white">
                    <header className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-10">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            <h2 className="font-bold text-gray-900">Tu Vitrina de Trofeos</h2>
                        </div>
                        <button
                            onClick={() => setShowAll(false)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                            ✕
                        </button>
                    </header>
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-w-4xl mx-auto pb-8">
                            {badges.map((badge, idx) => (
                                <BadgeItem key={`full-${badge.concept_id}`} badge={badge} idx={idx} />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
