"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    ArrowLeft,
    Trophy,
    Target,
    Flame,
    Star,
    CheckCircle2,
    XCircle,
    Clock,
} from "lucide-react";
import Link from "next/link";

interface ProfileData {
    user_id: string;
    total_points: number;
    rank_title: string;
    rank_level: number;
    current_streak: number;
    last_practice_date: string | null;
    total_answers: number;
    correct_answers: number;
}

interface DomainProgress {
    domain_name: string;
    domain_slug: string;
    total_answers: number;
    correct_answers: number;
    accuracy_pct: number;
}

interface BadgeData {
    concept_name: string;
    mastery_level: "bronze" | "silver" | "gold";
    matches_won: number;
    updated_at: string;
}

interface HistoryItem {
    created_at: string;
    question: string;
    domain_name: string;
    is_correct: boolean;
}

const MASTERY_CONFIG = {
    bronze: { label: "Bronce", emoji: "🥉", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800" },
    silver: { label: "Plata", emoji: "🥈", bg: "bg-slate-50", border: "border-slate-300", text: "text-slate-700" },
    gold: { label: "Oro", emoji: "🥇", bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-800" },
};

const RANK_GRADIENT: Record<string, string> = {
    "Iniciado Lean": "from-gray-500 to-gray-600",
    "Asesor Bronce": "from-amber-500 to-orange-600",
    "Asesor Plata": "from-slate-400 to-slate-600",
    "Asesor Oro": "from-yellow-400 to-amber-600",
    "Maestro Jedi Lean": "from-purple-500 to-indigo-600",
};

export default function UserDetailPage() {
    const params = useParams();
    const userId = decodeURIComponent(params.userId as string);

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [domains, setDomains] = useState<DomainProgress[]>([]);
    const [badges, setBadges] = useState<BadgeData[]>([]);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadDetail() {
            setLoading(true);
            const { data, error } = await supabase.rpc("get_user_detail_progress_rpc", {
                _user_id: userId,
            });

            if (data && Array.isArray(data)) {
                for (const row of data) {
                    switch (row.section) {
                        case "profile":
                            setProfile(row.payload as unknown as ProfileData);
                            break;
                        case "domain_progress":
                            setDomains((prev) => [...prev, row.payload as unknown as DomainProgress]);
                            break;
                        case "badge":
                            setBadges((prev) => [...prev, row.payload as unknown as BadgeData]);
                            break;
                        case "history":
                            setHistory((prev) => [...prev, row.payload as unknown as HistoryItem]);
                            break;
                    }
                }
            }
            setLoading(false);
        }
        loadDetail();
    }, [userId]);

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "—";
        const d = new Date(dateStr);
        return d.toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const accuracyPct = profile && profile.total_answers > 0
        ? ((profile.correct_answers / profile.total_answers) * 100).toFixed(1)
        : "0";

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex items-center gap-3 text-gray-400">
                    <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span>Cargando perfil del usuario...</span>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="space-y-4">
                <Link href="/admin/users">
                    <Button variant="ghost" className="gap-2">
                        <ArrowLeft className="h-4 w-4" /> Volver
                    </Button>
                </Link>
                <div className="text-center py-16 text-gray-400">
                    No se encontraron datos para este usuario.
                </div>
            </div>
        );
    }

    const gradient = RANK_GRADIENT[profile.rank_title] || "from-gray-500 to-gray-600";

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <Link href="/admin/users">
                <Button variant="ghost" className="gap-2 text-gray-600 hover:text-gray-900">
                    <ArrowLeft className="h-4 w-4" /> Volver a lista
                </Button>
            </Link>

            {/* Profile Hero */}
            <div className={`bg-gradient-to-r ${gradient} rounded-xl p-6 text-white relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold border border-white/30">
                            {userId.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{userId}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                                    {profile.rank_title}
                                </Badge>
                                <span className="text-white/70 text-sm">Nivel {profile.rank_level}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold">{profile.total_points}</div>
                            <div className="text-xs text-white/70">XP Totales</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold">{accuracyPct}%</div>
                            <div className="text-xs text-white/70">Precisión</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold flex items-center justify-center gap-1">
                                {profile.current_streak} <span className="text-lg">🔥</span>
                            </div>
                            <div className="text-xs text-white/70">Racha</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold">{badges.length}</div>
                            <div className="text-xs text-white/70">Badges</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Respuestas Totales</CardTitle>
                        <Target className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{profile.total_answers}</div>
                        <p className="text-xs text-muted-foreground">
                            <span className="text-green-600 font-medium">{profile.correct_answers} correctas</span>
                            {" · "}
                            <span className="text-red-500 font-medium">{profile.total_answers - profile.correct_answers} incorrectas</span>
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Última Práctica</CardTitle>
                        <Clock className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold">{formatDate(profile.last_practice_date)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Dominios Activos</CardTitle>
                        <Star className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {domains.filter((d) => d.total_answers > 0).length}
                            <span className="text-sm text-gray-400 font-normal"> / {domains.length}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">dominios con actividad</p>
                    </CardContent>
                </Card>
            </div>

            {/* Domain Progress */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-blue-600" />
                        Progreso por Dominio
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {domains.length === 0 ? (
                        <p className="text-center text-gray-400 py-8">Sin datos de dominio disponibles.</p>
                    ) : (
                        domains.map((d) => (
                            <div key={d.domain_slug} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="font-medium text-gray-900">{d.domain_name}</span>
                                        <span className="text-xs text-gray-400 ml-2">({d.domain_slug})</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <span className="text-green-600 font-medium">{d.correct_answers}</span>
                                        <span className="text-gray-300">/</span>
                                        <span className="text-gray-600">{d.total_answers}</span>
                                        <Badge
                                            variant="outline"
                                            className={`text-xs min-w-[52px] justify-center ${
                                                Number(d.accuracy_pct) >= 80
                                                    ? "bg-green-50 text-green-700 border-green-200"
                                                    : Number(d.accuracy_pct) >= 50
                                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                                    : Number(d.accuracy_pct) > 0
                                                    ? "bg-red-50 text-red-700 border-red-200"
                                                    : "bg-gray-50 text-gray-400 border-gray-200"
                                            }`}
                                        >
                                            {d.accuracy_pct}%
                                        </Badge>
                                    </div>
                                </div>
                                <Progress
                                    value={Number(d.accuracy_pct)}
                                    className="h-2"
                                />
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            {/* Badges Grid */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-amber-500" />
                        Badges Obtenidos ({badges.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {badges.length === 0 ? (
                        <p className="text-center text-gray-400 py-8">Este usuario aún no tiene badges.</p>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {badges.map((b, idx) => {
                                const cfg = MASTERY_CONFIG[b.mastery_level];
                                return (
                                    <div
                                        key={idx}
                                        className={`${cfg.bg} ${cfg.border} border rounded-xl p-4 text-center transition-transform hover:scale-105`}
                                    >
                                        <div className="text-3xl mb-2">{cfg.emoji}</div>
                                        <h4 className={`font-semibold text-sm ${cfg.text}`}>{b.concept_name}</h4>
                                        <p className="text-xs text-gray-500 mt-1">{cfg.label} · {b.matches_won} victorias</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Recent History */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-slate-500" />
                        Historial Reciente
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {history.length === 0 ? (
                        <p className="text-center text-gray-400 py-8">Sin actividad registrada.</p>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50/80">
                                        <TableHead className="w-10"></TableHead>
                                        <TableHead>Pregunta</TableHead>
                                        <TableHead>Dominio</TableHead>
                                        <TableHead>Fecha</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {history.map((h, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>
                                                {h.is_correct ? (
                                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                ) : (
                                                    <XCircle className="h-5 w-5 text-red-400" />
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm max-w-md">
                                                <span className="line-clamp-1">{h.question}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="text-xs">
                                                    {h.domain_name}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                                                {formatDate(h.created_at)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
