import { createClient } from "@supabase/supabase-js";
import { openai } from "@ai-sdk/openai";
import { streamText, Message } from "ai";
import OpenAI from "openai";

// Standard OpenAI client just for embeddings 
// (Vercel ai-sdk handles the chat stream natively)
const openaiCore = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // Get the last user message to use for our semantic search
        const lastMessage = messages[messages.length - 1];

        let dbContext = "";

        if (lastMessage && lastMessage.role === 'user') {
            // 1. Generate Embedding for the user's question
            let queryEmbedding: number[] = [];
            try {
                const embeddingResponse = await openaiCore.embeddings.create({
                    model: "text-embedding-3-small",
                    input: lastMessage.content,
                    dimensions: 1536
                });
                queryEmbedding = embeddingResponse.data[0].embedding;
            } catch (err) {
                console.error("Embedding generation failed:", err);
                // We'll continue without context if embedding fails
            }

            // 2. Fetch relevant context from Supabase
            if (queryEmbedding.length > 0) {
                const { data: chunks, error } = await supabase.rpc("match_documents_rpc", {
                    query_embedding: queryEmbedding,
                    match_threshold: 0.15, // A bit stricter for the chat
                    match_count: 5         // Top 5 chunks to avoid overwhelming the prompt
                });

                if (!error && chunks && chunks.length > 0) {
                    dbContext = chunks.map((c: any) => {
                        const meta = c.metadata as any;
                        const source = meta ? `[${meta.archivo || 'Desconocido'}]` : "";
                        return `--- CONTEXTO DE NEXIA EDU ${source} ---\n${c.contenido}`;
                    }).join("\n\n");
                }
            }
        }

        // 3. Define the System Prompt
        const systemPrompt = `
Eres Mr. Kaizen, un sabio y experimentado Sensei japonés en filosofías Lean Manufacturing y Excelencia Operacional.
Trabajas como mentor virtual en la plataforma "Nexia Edu".
Tu objetivo no es darle la respuesta fácil o directa al estudiante, sino guiarlo para que descubra la causa raíz de sus problemas usando lógica estructurada, tal como se hace en el "Gemba".

REGLAS DE ACTUACIÓN:
1. Usa lenguaje respetuoso, formal pero alentador. Puedes usar términos como "Konnichiwa", "Sensei", "Gemba", "Kaizen", etc. sabiamente.
2. Si el usuario plantea un problema, hazle preguntas Socráticas (¿Por qué ocurre esto?, ¿Han ido a observar al Gemba?, ¿Hay un estándar?).
3. Si la base de conocimientos abajo provista (CONTEXTO) incluye información sobre el tema, BASA tus consejos o definiciones en ESA información estricta. No inventes metodologías que no estén allí.
4. Tus respuestas deben ser relativamente concisas (no más de 3 párrafos), orientadas a la acción y a la reflexión.

CONTEXTO DE TUS MANUALES (NEXIA EDU):
${dbContext ? dbContext : "No se encontró contexto específico para esta consulta en los manuales, pero confía en tu conocimiento general Lean."}
`;

        // 4. Stream the response using Vercel AI SDK
        const result = streamText({
            model: openai('gpt-4o-mini'),
            system: systemPrompt,
            messages: messages,
        });

        return result.toDataStreamResponse();

    } catch (e: any) {
        console.error("Chat API Error:", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
