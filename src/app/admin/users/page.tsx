"use client";

import { useEffect, useState } from "react";
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
import {
    Users,
    TrendingUp,
    Award,
    Eye,
    Search,
    ArrowUpDown,
    Flame,
} from "lucide-react";
import Link from "next/link";

interface UserRow {
    user_id: string;
    total_answers: number;
    correct_answers: number;
    accuracy_pct: number;
    total_points: number;
    rank_title: string;
    rank_level: number;
    current_streak: number;
    badges_count: number;
    last_activity: string | null;
}

const RANK_COLORS: Record<string, string> = {
    "Iniciado Lean": "bg-gray-100 text-gray-700 border-gray-200",
    "Asesor Bronce": "bg-amber-50 text-amber-700 border-amber-200",
    "Asesor Plata": "bg-slate-100 text-slate-700 border-slate-300",
    "Asesor Oro": "bg-yellow-50 text-yellow-700 border-yellow-300",
    "Maestro Jedi Lean": "bg-purple-50 text-purple-700 border-purple-300",
};

export default function UsersProgressPage() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortField, setSortField] = useState<keyof UserRow>("last_activity");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase.rpc("get_all_users_progress_rpc");
        if (data) setUsers(data as UserRow[]);
        setLoading(false);
    };

    const handleSort = (field: keyof UserRow) => {
        if (sortField === field) {
            setSortDir(sortDir === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDir("desc");
        }
    };

    const filteredUsers = users
        .filter((u) =>
            u.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.rank_title.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            const aVal = a[sortField] ?? "";
            const bVal = b[sortField] ?? "";
            if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
            if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
            return 0;
        });

    const avgAccuracy =
        users.length > 0
            ? (users.reduce((sum, u) => sum + Number(u.accuracy_pct), 0) / users.length).toFixed(1)
            : "0";

    const topUser = users.length > 0
        ? users.reduce((top, u) => (u.total_points > top.total_points ? u : top), users[0])
        : null;

    const totalBadges = users.reduce((sum, u) => sum + Number(u.badges_count), 0);

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

    const truncateId = (id: string) => {
        if (id.length <= 12) return id;
        return id.slice(0, 6) + "…" + id.slice(-4);
    };

    const SortButton = ({ field, label }: { field: keyof UserRow; label: string }) => (
        <button
            onClick={() => handleSort(field)}
            className="flex items-center gap-1 hover:text-gray-900 transition-colors"
        >
            {label}
            <ArrowUpDown className={`h-3 w-3 ${sortField === field ? "text-blue-600" : "text-gray-300"}`} />
        </button>
    );

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        Progreso de Usuarios
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Vista completa del avance de aprendizaje de todos los usuarios.
                    </p>
                </div>
                <Button variant="outline" onClick={fetchUsers}>
                    Actualizar
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-700">{users.length}</div>
                        <p className="text-xs text-muted-foreground">usuarios registrados</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Precisión Promedio</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-700">{avgAccuracy}%</div>
                        <p className="text-xs text-muted-foreground">respuestas correctas</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Badges</CardTitle>
                        <Award className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-amber-700">{totalBadges}</div>
                        <p className="text-xs text-muted-foreground">logros obtenidos</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Top Usuario</CardTitle>
                        <Flame className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold text-purple-700 truncate">
                            {topUser ? truncateId(topUser.user_id) : "—"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {topUser ? `${topUser.total_points} XP` : "sin datos"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar por ID de usuario o rango..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-80 pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
            </div>

            {/* Users Table */}
            <div className="rounded-lg border bg-white shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/80">
                            <TableHead>Usuario</TableHead>
                            <TableHead>
                                <SortButton field="total_answers" label="Respuestas" />
                            </TableHead>
                            <TableHead>
                                <SortButton field="accuracy_pct" label="Precisión" />
                            </TableHead>
                            <TableHead>
                                <SortButton field="total_points" label="XP" />
                            </TableHead>
                            <TableHead>Rango</TableHead>
                            <TableHead>
                                <SortButton field="current_streak" label="Racha" />
                            </TableHead>
                            <TableHead>
                                <SortButton field="badges_count" label="Badges" />
                            </TableHead>
                            <TableHead>
                                <SortButton field="last_activity" label="Última Actividad" />
                            </TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={9} className="h-32 text-center">
                                    <div className="flex items-center justify-center gap-2 text-gray-400">
                                        <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                        Cargando datos de usuarios...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="h-32 text-center text-gray-400">
                                    {searchTerm
                                        ? "No se encontraron usuarios con ese criterio."
                                        : "No hay usuarios con actividad registrada."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <TableRow key={user.user_id} className="hover:bg-blue-50/30">
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                                                {user.user_id.slice(0, 2).toUpperCase()}
                                            </div>
                                            <span className="font-mono text-sm text-gray-700" title={user.user_id}>
                                                {truncateId(user.user_id)}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <span className="font-semibold text-green-600">{user.correct_answers}</span>
                                            <span className="text-gray-400"> / {user.total_answers}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${
                                                        Number(user.accuracy_pct) >= 80
                                                            ? "bg-green-500"
                                                            : Number(user.accuracy_pct) >= 50
                                                            ? "bg-amber-500"
                                                            : "bg-red-500"
                                                    }`}
                                                    style={{ width: `${Math.min(Number(user.accuracy_pct), 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-medium">{user.accuracy_pct}%</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-bold text-indigo-700">{user.total_points}</span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={`text-xs ${RANK_COLORS[user.rank_title] || "bg-gray-100 text-gray-700"}`}
                                        >
                                            {user.rank_title}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            {user.current_streak > 0 && (
                                                <span className="text-orange-500">🔥</span>
                                            )}
                                            <span className="text-sm font-medium">{user.current_streak}d</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm font-medium">{user.badges_count}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs text-gray-500">
                                            {formatDate(user.last_activity)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link href={`/admin/users/${encodeURIComponent(user.user_id)}`}>
                                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                <Eye className="h-4 w-4 mr-1" />
                                                Ver
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
