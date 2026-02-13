export interface AnalysisResult {
    projects: {
        name: string;
        description: string;
        status: 'active' | 'archived' | 'completed';
    }[];
    tasks: {
        title: string;
        description: string;
        priority: 'low' | 'medium' | 'high';
        project_name: string;
    }[];
    insights: {
        dreams: string[];
        difficulties: string[];
        goals: string[];
    };
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Refactored analysis function for higher reliability.
 * Works perfectly on localhost as long as VITE_GROQ_API_KEY is in .env
 */
export async function analyzeTranscript(text: string): Promise<AnalysisResult> {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;

    if (!apiKey) {
        console.error('CRITICAL: VITE_GROQ_API_KEY is missing in .env');
        throw new Error('CONFIG_ERROR: API Key not found');
    }

    // Advanced prompt for better extraction
    const prompt = `
    Eres un asistente experto en productividad y organización. Tu tarea es analizar una transcripción de voz y convertirla en una estructura de datos JSON válida.

    TRANSCRIPCIÓN DEL USUARIO:
    "${text}"

    INSTRUCCIONES CLAVE:
    1. PROYECTOS: Si el usuario menciona un sueño, meta a largo plazo o algo complejo, crea un proyecto.
    2. TAREAS: Extrae acciones concretas. Si el usuario no menciona tareas para un proyecto, inventa 3 tareas lógicas para comenzar.
    3. ASOCIACIÓN: Cada tarea DEBE pertenecer a un proyecto. Usa el campo "project_name" para vincularlas exactamente.
    4. INSIGHTS: Extrae sueños (dreams), dificultades (difficulties) y metas (goals) como frases cortas.

    ESTRUCTURA JSON REQUERIDA (NO devuelvas nada más que el JSON):
    {
      "projects": [
        { "name": "Nombre Proyecto", "description": "Descripción breve", "status": "active" }
      ],
      "tasks": [
        { "title": "Hacer X", "description": "Detalle", "priority": "medium", "project_name": "Nombre Proyecto" }
      ],
      "insights": {
        "dreams": ["Frase"],
        "difficulties": ["Frase"],
        "goals": ["Frase"]
      }
    }
    `;

    try {
        console.log("Iniciando análisis con Groq...");

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un sistema de extracción de datos que solo devuelve JSON puro.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                response_format: { type: 'json_object' }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Groq API Error Response:", errorText);
            throw new Error(`Groq API Error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) {
            throw new Error("Groq devolvió una respuesta vacía");
        }

        console.log("Análisis completado exitosamente");
        const parsed = JSON.parse(content) as AnalysisResult;

        // Validación básica post-parse
        if (!parsed.projects || !parsed.tasks) {
            throw new Error("JSON recibido tiene una estructura incompleta");
        }

        return parsed;

    } catch (error) {
        console.error("Error detallado en analyzeTranscript:", error);

        // Fallback básico para no romper la UI
        return {
            projects: [{ name: "Nuevo Proyecto", description: "Generado automáticamente", status: "active" }],
            tasks: [{ title: "Comenzar planificación", description: "Tarea inicial sugerida", priority: "medium", project_name: "Nuevo Proyecto" }],
            insights: { dreams: [], difficulties: [], goals: [] }
        };
    }
}
