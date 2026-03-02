"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, CheckCircle2, BookOpen } from "lucide-react";
import Link from "next/link";
import { BadgesShowcase } from "@/components/dashboard/BadgesShowcase";

export default function Home() {
  const [streak, setStreak] = useState(0);
  const [points, setPoints] = useState(0);
  const [rankTitle, setRankTitle] = useState("Iniciado Lean");
  const [rankLevel, setRankLevel] = useState(1);
  const [progressPct, setProgressPct] = useState(0);
  const [activeDomain, setActiveDomain] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      // Get real user session, fallback to guest ID for local testing
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id || 'juan-123';
      setUserId(currentUserId);

      // Load Streak & Profile
      const { data } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', currentUserId)
        .single();

      if (data) {
        setStreak(data.current_streak || 0);
        setPoints(data.total_points || 0);
        if (data.rank_title) setRankTitle(data.rank_title);
        if (data.rank_level) setRankLevel(data.rank_level);
      }

      // Load Progress per Domain
      const { data: domainData } = await supabase.rpc('get_user_domain_progress_rpc', {
        _user_id: currentUserId
      });

      if (domainData && domainData.length > 0) {
        // Find first incomplete domain (threshold: 4 correct answers)
        let currentDomain = domainData.find((d: any) => d.correct_answers < 4);

        // If all are complete, default to the last one (or first)
        if (!currentDomain) {
          currentDomain = domainData[domainData.length - 1];
        }

        setActiveDomain(currentDomain);
        const percentage = Math.min(Math.round((currentDomain.correct_answers / 4) * 100), 100);
        setProgressPct(percentage);
      } else {
        // Fallback for new users with no progress yet
        const { data: fallbackDomain } = await supabase
          .schema('learning')
          .from('domains')
          .select('*')
          .limit(1)
          .single();

        if (fallbackDomain) {
          const { data: conceptData } = await supabase
            .schema('learning')
            .from('concepts')
            .select('name, definition')
            .eq('domain_id', fallbackDomain.id)
            .limit(1)
            .single();

          setActiveDomain({
            domain_id: fallbackDomain.id,
            domain_slug: fallbackDomain.slug,
            domain_name: fallbackDomain.name,
            domain_description: fallbackDomain.description,
            top_concept_name: conceptData?.name || 'Comienza a explorar',
            top_concept_definition: conceptData?.definition || 'Inicia tu aprendizaje con el primer módulo.',
            correct_answers: 0
          });
          setProgressPct(0);
        }
      }
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-bold text-lg text-blue-700">Nexia Edu</h1>
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
            JG
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">

        {/* Welcome & Rank */}
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900">Hola, Juan 👋</h2>
            <p className="text-gray-500 text-sm">Aquí tienes tu plan para hoy.</p>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-2 px-3 flex flex-col items-center">
            <div className="flex gap-1 mb-1">
              {[...Array(Math.min(rankLevel, 5))].map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-indigo-500" />
              ))}
              {[...Array(Math.max(0, 5 - rankLevel))].map((_, i) => (
                <div key={i + 5} className="w-2 h-2 rounded-full bg-indigo-100" />
              ))}
            </div>
            <span className="text-xs font-bold text-indigo-700 text-center">{rankTitle}</span>
          </div>
        </div>

        {/* Hero Card: Active Skill */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">En Curso</h3>
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">Nivel 1</Badge>
          </div>

          <Card className="border-blue-100 shadow-sm overflow-hidden">
            <div className="h-2 bg-blue-600 w-full" />
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{activeDomain?.domain_name || 'Cargando...'}</CardTitle>
              <CardDescription>Dominio: {activeDomain?.domain_slug || 'cargando'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 line-clamp-2">
                {activeDomain?.domain_description || 'Por favor espera...'}
              </p>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Progreso</span>
                  <span>{progressPct}%</span>
                </div>
                <Progress value={progressPct} className="h-2" />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-start gap-3">
                  <BookOpen className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-gray-900">{activeDomain?.top_concept_name || 'Cargando concepto...'}</h4>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      "{activeDomain?.top_concept_definition || 'Por favor espera un momento.'}"
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Link href={activeDomain ? `/skill/${activeDomain.domain_slug}` : '#'} className="w-full">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 gap-2" disabled={!activeDomain}>
                  <PlayCircle className="h-4 w-4" />
                  Continuar Práctica
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </section>

        {/* Trophy Case */}
        <section>
          {userId ? <BadgesShowcase userId={userId} /> : <div className="text-sm text-gray-500">Cargando trofeos...</div>}
        </section>

        {/* Micro-learning / Quick Actions */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Rápido</h3>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/play">
              <Card className="cursor-pointer hover:bg-indigo-50 transition-colors h-full border-indigo-100">
                <CardContent className="p-3 flex flex-col items-center text-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <span className="text-xl">🎯</span>
                  </div>
                  <span className="text-xs font-medium">Jugar</span>
                </CardContent>
              </Card>
            </Link>

            <Link href="/daily">
              <Card className="cursor-pointer hover:bg-gray-50 transition-colors h-full">
                <CardContent className="p-3 flex flex-col items-center text-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-medium">Repaso</span>
                </CardContent>
              </Card>
            </Link>

            <Link href="/glossary">
              <Card className="cursor-pointer hover:bg-gray-50 transition-colors h-full">
                <CardContent className="p-3 flex flex-col items-center text-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-medium">Glosario</span>
                </CardContent>
              </Card>
            </Link>

            <Link href="/mentor">
              <Card className="cursor-pointer hover:bg-orange-50 transition-colors h-full border-orange-100 bg-orange-50/30">
                <CardContent className="p-3 flex flex-col items-center text-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shadow-sm border border-orange-200">
                    <span className="text-xl">🥋</span>
                  </div>
                  <span className="text-xs font-bold text-orange-900">Mr. Kaizen</span>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>

        {/* Stats / Motivation */}
        <Card className="bg-slate-900 text-white border-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Racha actual</p>
              <p className="text-2xl font-bold">{streak} días 🔥</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Puntos Totales (XP)</p>
              <p className="text-xl font-bold text-blue-400">{points}</p>
            </div>
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
