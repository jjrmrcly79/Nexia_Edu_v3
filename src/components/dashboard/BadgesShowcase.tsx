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
                    bg: "bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600",
                    border: "border-yellow-200",
                    text: "text-yellow-900",
                    icon: <Trophy className="w-8 h-8 text-white drop-shadow-md" />,
                    label: "Oro"
                };
            case "silver":
                return {
                    bg: "bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400",
                    border: "border-slate-100",
                    text: "text-slate-800",
                    icon: <Medal className="w-8 h-8 text-white drop-shadow-md" />,
                    label: "Plata"
                };
            case "bronze":
            default:
                return {
                    bg: "bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900",
                    border: "border-amber-500",
                    text: "text-amber-50",
                    icon: <Award className="w-8 h-8 text-white drop-shadow-md" />,
                    label: "Bronce"
                };
        }
    };

    const calculateProgress = (level: string, matches: number) => {
        if (level === "gold") return 100;
        if (level === "silver") return Math.min((matches / 15) * 100, 100);
        return Math.min((matches / 5) * 100, 100);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    Vitrina de Trofeos
                </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {badges.slice(0, 6).map((badge, idx) => {
                    const style = getBadgeStyle(badge.mastery_level);
                    const progress = calculateProgress(badge.mastery_level, badge.matches_won);

                    return (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            key={badge.concept_id}
                            className={`relative overflow-hidden rounded-2xl p-4 shadow-sm border border-white/40 ${style.bg} hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}
                        >
                            {/* Glassmorphism shine overlay */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-20 transform rotate-45 translate-x-12 -translate-y-12 blur-2xl pointer-events-none" />

                            <div className="flex flex-col items-center text-center relative z-10">
                                <div className="mb-2">
                                    {style.icon}
                                </div>
                                <h4 className={`font-bold text-sm leading-tight mb-1 ${style.text} drop-shadow-sm line-clamp-2`}>
                                    {badge.concept_name}
                                </h4>

                                <div className="w-full mt-2 bg-black/20 rounded-full h-1.5 backdrop-blur-sm overflow-hidden border border-black/10">
                                    <div
                                        className="bg-white h-full transition-all duration-1000 ease-out"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className={`text-[10px] uppercase font-bold tracking-wider mt-1.5 opacity-90 ${style.text}`}>
                                    Nivel {style.label}
                                </p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            {badges.length > 6 && (
                <div className="text-center">
                    <button className="text-xs text-indigo-600 font-semibold hover:underline">Ver todas tus {badges.length} medallas →</button>
                </div>
            )}
        </div>
    );
}
