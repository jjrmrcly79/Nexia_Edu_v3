"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, CheckCircle2, BookOpen } from "lucide-react";
import Link from "next/link";

export default function Home() {
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

        {/* Welcome */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900">Hola, Juan 👋</h2>
          <p className="text-gray-500 text-sm">Aquí tienes tu plan para hoy.</p>
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
              <CardTitle className="text-lg">Flujo Continuo (Flow)</CardTitle>
              <CardDescription>Dominio: Flujo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Aprende a identificar y eliminar interrupciones en el proceso para mejorar la velocidad de entrega.
              </p>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Progreso</span>
                  <span>60%</span>
                </div>
                <Progress value={60} className="h-2" />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-start gap-3">
                  <BookOpen className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-gray-900">Concepto Clave</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      "El flujo unitario reduce el inventario en proceso (WIP) y expone problemas ocultos."
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/skill/flujo" className="w-full">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
                  <PlayCircle className="h-4 w-4" />
                  Continuar Práctica
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </section>

        {/* Micro-learning / Quick Actions */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Rápido</h3>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/daily">
              <Card className="cursor-pointer hover:bg-gray-50 transition-colors h-full">
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">Repaso Diario</span>
                  <span className="text-xs text-gray-400">3 min</span>
                </CardContent>
              </Card>
            </Link>

            <Link href="/glossary">
              <Card className="cursor-pointer hover:bg-gray-50 transition-colors h-full">
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">Glosario</span>
                  <span className="text-xs text-gray-400">Consultar</span>
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
              <p className="text-2xl font-bold">3 días 🔥</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Puntos hoy</p>
              <p className="text-xl font-bold text-blue-400">+120</p>
            </div>
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
