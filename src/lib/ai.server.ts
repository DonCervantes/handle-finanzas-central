// Groq (OpenAI-compatible) client + agent_runs logging. Server-only.
export const GROQ_MODEL = "llama-3.3-70b-versatile";

export class MissingKeyError extends Error {}

type Msg = { role: "system" | "user" | "assistant"; content: string };

export async function groqChat(messages: Msg[], opts: { json?: boolean; temperature?: number } = {}) {
  const key = process.env["GROQ_API_KEY"];
  if (!key) throw new MissingKeyError("Falta configurar la clave de Groq (GROQ_API_KEY). Agrégala en los secretos del proyecto para activar la IA.");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: opts.temperature ?? 0.3,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Groq error [${res.status}]: ${body}`);
    if (res.status === 401) throw new Error("La clave de Groq no es válida. Revísala en los secretos del proyecto.");
    if (res.status === 429) throw new Error("Groq está limitando las solicitudes. Intenta en unos segundos.");
    throw new Error(`El servicio de IA respondió con error (${res.status}).`);
  }
  const json = (await res.json()) as { choices: { message: { content: string } }[]; usage?: { total_tokens?: number } };
  return { content: json.choices[0]?.message?.content ?? "", tokens: json.usage?.total_tokens ?? null };
}

/** Runs an agent call and records it in agent_runs (org_id filled by trigger). */
export async function runAgent<T>(
  supabase: any,
  agent: string,
  input: unknown,
  fn: () => Promise<{ output: T; tokens: number | null }>,
) {
  const start = Date.now();
  try {
    const r = await fn();
    await supabase.from("agent_runs").insert({ agent, input, output: r.output as never, tokens: r.tokens, latency_ms: Date.now() - start });
    return r.output;
  } catch (e) {
    if (!(e instanceof MissingKeyError)) {
      await supabase.from("agent_runs").insert({ agent, input, output: { error: e instanceof Error ? e.message : String(e) }, latency_ms: Date.now() - start });
    }
    throw e;
  }
}
