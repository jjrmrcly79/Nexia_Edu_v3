import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { NextResponse } from "next/server";

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase Admin (needed for some potential RPC calls, or just standard client)
// Using standard client with service role if possible, or public if RLS allows.
// Ideally use a service role client for backend operations to bypass RLS if needed,
// but for reading public docs standard is fine. 
// We'll use the standard one from env for now.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
    try {
        const { slug, domainName, context: userContext } = await req.json();

        if (!slug) {
            return NextResponse.json({ error: "Missing slug" }, { status: 400 });
        }

        // 1. Generate Embedding for the search query (domainName or slug)
        const searchQuery = domainName || slug.replace("-", " ");

        let queryEmbedding: number[] = [];
        try {
            const embeddingResponse = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: searchQuery,
                dimensions: 1536
            });
            queryEmbedding = embeddingResponse.data[0].embedding;
        } catch (embeddingError) {
            console.error("OpenAI Embedding Error:", embeddingError);
            return NextResponse.json({ error: "No se pudo generar el vector de búsqueda." }, { status: 500 });
        }

        // 2. Fetch Context from Supabase using Vector Similarity
        // Calls the new RPC function we created in 04_vector_search.sql
        const { data: chunks, error } = await supabase.rpc("match_documents_rpc", {
            query_embedding: queryEmbedding,
            match_threshold: 0.1, // Low threshold, can be adjusted (Cosine Similarity)
            match_count: 10       // Top 10 most relevant chunks
        });

        if (error) {
            console.error("Supabase RPC Error:", error);
            throw error;
        }

        if (error) throw error;

        let dbContext = "";
        if (chunks && chunks.length > 0) {
            dbContext = chunks.map((c: any, i: number) => {
                const meta = c.metadata as any;
                const source = meta ? `[Doc: ${meta.archivo || 'Desconocido'}, Pág: ${meta.parte || '?'}]` : "[Fuente desconocida]";
                // Add similarity score to debug effectively if needed
                const score = c.similarity ? ` (Similitud: ${(c.similarity * 100).toFixed(1)}%)` : "";
                return `FRAGMENTO ${i + 1} (${source})${score}:\n${c.contenido.substring(0, 800)}...`;
            }).join("\n\n");
        } else {
            return NextResponse.json({ result: "No se encontró información suficiente en la base de conocimientos para este tema específico." });
        }

        // 3. Prompt Engineering
        const systemPrompt = `
        Actúa como un profesor experto en Lean Manufacturing y Excelencia Operacional.
        Tu objetivo es realizar una investigación profunda sobre el concepto específico de "${domainName || slug}" basándote EXCLUSIVAMENTE en los fragmentos de texto proporcionados.
        
        ${userContext ? `
        IMPORTANTE: EL ALUMNO ESTÁ ESTUDIANDO EL SIGUIENTE CONTENIDO ESPECÍFICO AHORA MISMO:
        --------------------------------------------------
        ${userContext}
        --------------------------------------------------
        TU TAREA ES PROFUNDIZAR EN ESTE TEMA ("${domainName}"). Explica en detalle qué es, sus causas, consecuencias, y cómo se relaciona con el Lean Manufacturing en general, usando los documentos como base empírica.
        No des una respuesta genérica sobre el "dominio" entero. Enfócate en explicar profundamente el concepto específico que el usuario seleccionó.
        ` : ""}

        REGLAS CRÍTICAS:
        1.  Usa un tono académico pero accesible.
        2.  CITAS: Cada vez que afirmes algo basado en un fragmento de los documentos, DEBES incluir la cita exacta al final de la frase. 
            Ejemplo: "El ${domainName || 'concepto'} afecta directamente la eficiencia [Doc: The Toyota Way, Pág: 45]."
        3.  Si la información específica sobre "${domainName}" no está en los fragmentos, di "No tengo información suficiente en mis documentos certificados sobre este punto exacto" e intenta inferir relaciones válidas basadas SÓLO en el texto provisto.
        4.  Estructura la respuesta de manera clara: 
            - **Análisis Profundo del Concepto:** (Qué significa y cómo se define dentro de Lean según los documentos).
            - **Causas e Impacto:** (Por qué ocurre o por qué es importante, sus efectos en el proceso).
            - **Aplicación Práctica / Solución:** (Cómo identificarlo, aplicarlo o resolverlo en un entorno real).
        `;

        // 4. OpenAI Stream
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Aquí tienes la información de contexto de los documentos certificados:\n\n${dbContext}\n\nGenera la explicación integradora para: ${domainName || slug}` }
            ],
            stream: true,
            temperature: 0.3,
        });

        // Create a ReadableStream for the response
        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
            async start(controller) {
                for await (const part of response) {
                    const text = part.choices[0]?.delta?.content || "";
                    controller.enqueue(encoder.encode(text));
                }
                controller.close();
            },
        });

        return new Response(readableStream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });

    } catch (error: any) {
        console.error("Research API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
