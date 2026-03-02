"use client";

import { useChat } from "ai/react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Send, ArrowLeft, Bot, User, Trash2 } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

export default function MentorPage() {
    const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
        }
    }, [messages]);

    const handleClear = () => {
        if (confirm("¿Estás seguro de que quieres borrar el historial de la conversación?")) {
            setMessages([]);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative shadow-xl">
            {/* Header */}
            <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 rounded-full hover:bg-gray-100">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-xl shadow-inner">
                            🥋
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900 leading-tight">Mr. Kaizen</h1>
                            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                En línea
                            </span>
                        </div>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleClear}
                    className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full border-none"
                    title="Borrar historial"
                    disabled={messages.length === 0}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </header>

            {/* Chat Area */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-6 pb-4">

                    {/* Welcome Message */}
                    {messages.length === 0 && (
                        <div className="flex justify-center my-8">
                            <div className="bg-orange-50/80 border border-orange-100 text-center p-6 rounded-2xl max-w-sm shadow-sm">
                                <div className="text-4xl mb-3">⛩️</div>
                                <h3 className="font-bold text-orange-900 mb-2 text-lg">Konnichiwa</h3>
                                <p className="text-sm text-orange-800/80 leading-relaxed">
                                    Soy Mr. Kaizen, tu Sensei Lean virtual. Estoy aquí para guiarte a la causa raíz de cualquier problema operacional que tengas.
                                    <br /><br />
                                    <strong>¿Qué anomalía observaste hoy en el Gemba?</strong>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    {messages.map((m: any) => (
                        <div
                            key={m.id}
                            className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
                        >
                            <div className="flex items-end gap-2 max-w-[85%]">
                                {m.role !== "user" && (
                                    <div className="h-6 w-6 rounded-full bg-orange-100 border border-orange-200 flex-shrink-0 flex items-center justify-center text-xs">
                                        🥋
                                    </div>
                                )}

                                <Card
                                    className={`p-3 border-none flex-1 shadow-sm ${m.role === "user"
                                        ? "bg-blue-600 text-white rounded-br-none rounded-2xl"
                                        : "bg-white text-gray-800 rounded-bl-none rounded-2xl border border-gray-100"
                                        }`}
                                >
                                    <div className={`text-sm ${m.role === "user" ? "" : "prose prose-sm prose-orange prose-p:leading-relaxed prose-pre:bg-gray-100 prose-pre:text-gray-800"}`}>
                                        {m.role === "user" ? (
                                            m.content
                                        ) : (
                                            <ReactMarkdown>{m.content}</ReactMarkdown>
                                        )}
                                    </div>
                                </Card>
                            </div>
                        </div>
                    ))}

                    {/* Typing Indicator */}
                    {isLoading && messages[messages.length - 1]?.role === "user" && (
                        <div className="flex items-start gap-2">
                            <div className="h-6 w-6 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-xs">
                                🥋
                            </div>
                            <Card className="p-3 bg-white text-gray-800 rounded-2xl rounded-bl-none border border-gray-100 shadow-sm">
                                <div className="flex gap-1 items-center h-4">
                                    <div className="w-1.5 h-1.5 bg-orange-300 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-1.5 h-1.5 bg-orange-300 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-1.5 h-1.5 bg-orange-300 rounded-full animate-bounce"></div>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="bg-white border-t p-3 sticky bottom-0">
                <form onSubmit={handleSubmit} className="flex gap-2 relative">
                    <Input
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Pregunta a tu Sensei..."
                        className="flex-1 rounded-full pl-4 pr-12 focus-visible:ring-orange-500 border-gray-200"
                        disabled={isLoading}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={isLoading || !input.trim()}
                        className={`absolute right-1 top-1 h-8 w-8 rounded-full transition-all ${input.trim()
                            ? "bg-orange-500 hover:bg-orange-600 text-white shadow-md"
                            : "bg-gray-100 text-gray-400"
                            }`}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
                <p className="text-[10px] text-center text-gray-400 mt-2">
                    Las IA pueden cometer errores. El verdadero aprendizaje ocurre en el Gemba.
                </p>
            </div>
        </div>
    );
}
