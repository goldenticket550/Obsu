const MAX_BODY_BYTES = 32_768;
const REPLAY_WINDOW_SECONDS = 300;
const encoder = new TextEncoder();

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
});

const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function rpc(url: string, serviceKey: string, name: string, args: unknown) {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  const result = await response.json().catch(() => ({}));
  return response.ok ? { data: result, error: null } : { data: null, error: result };
}

function validEnvelope(value: any): boolean {
  if (!value || value.schemaVersion !== "1" || !["event", "health"].includes(value.kind)) return false;
  if (typeof value.dedupKey !== "string" || value.dedupKey.length < 1 || value.dedupKey.length > 200) return false;
  if (!Number.isFinite(Date.parse(value.occurredAt)) || typeof value.payload !== "object" || !value.payload) return false;
  if (value.kind === "event") return typeof value.payload.category === "string" && ["info", "warning", "critical"].includes(value.payload.severity);
  return ["healthy", "degraded", "failing", "unknown"].includes(value.payload.status);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json(405, { error: "method_not_allowed" });
  const keyId = request.headers.get("x-obsidian-key-id");
  const signature = request.headers.get("x-obsidian-signature");
  if (!keyId || !signature) return json(401, { error: "missing_auth_headers" });
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) return json(413, { error: "payload_too_large" });
  const body = await request.text();
  if (encoder.encode(body).byteLength > MAX_BODY_BYTES) return json(413, { error: "payload_too_large" });

  const match = /^v=(\d+),d=([0-9a-f]{64})$/.exec(signature);
  if (!match) return json(401, { error: "invalid_signature" });
  const timestamp = Number(match[1]);
  if (!Number.isSafeInteger(timestamp) || Math.abs(Math.floor(Date.now() / 1000) - timestamp) > REPLAY_WINDOW_SECONDS) {
    return json(401, { error: "stale_timestamp" });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const encryptionKey = Deno.env.get("CORE_CREDENTIAL_ENCRYPTION_KEY");
  if (!url || !serviceKey || !encryptionKey) return json(500, { error: "server_misconfigured" });
  const { data: credentials, error: credentialError } = await rpc(url, serviceKey, "core_resolve_ingest_credential", {
    p_key_id: keyId, p_encryption_key: encryptionKey,
  });
  const credential = credentials?.[0];
  if (credentialError || !credential) return json(401, { error: "invalid_signature" });

  const hmacKey = await crypto.subtle.importKey("raw", encoder.encode(credential.signing_secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", hmacKey, encoder.encode(`${timestamp}.${body}`)));
  const supplied = match[2];
  let different = expected.length !== supplied.length;
  for (let i = 0; i < expected.length; i++) different = different || expected.charCodeAt(i) !== supplied.charCodeAt(i);
  if (different) return json(401, { error: "invalid_signature" });

  let envelope: any;
  try { envelope = JSON.parse(body); } catch { return json(400, { error: "invalid_json" }); }
  if (!validEnvelope(envelope)) return json(400, { error: "invalid_signal" });
  if (envelope.source?.application !== credential.application_slug) return json(400, { error: "application_mismatch" });
  const payloadHash = hex(await crypto.subtle.digest("SHA-256", encoder.encode(body)));
  const { data, error } = await rpc(url, serviceKey, "core_accept_signal", {
    p_application_id: credential.application_id,
    p_kind: envelope.kind,
    p_dedup_key: envelope.dedupKey,
    p_payload_hash: payloadHash,
    p_occurred_at: envelope.occurredAt,
    p_category: envelope.kind === "event" ? envelope.payload.category : null,
    p_severity: envelope.kind === "event" ? envelope.payload.severity : null,
    p_status: envelope.kind === "health" ? envelope.payload.status : null,
    p_data_as_of: envelope.kind === "health" ? envelope.payload.dataAsOf ?? null : null,
    p_payload: envelope.payload,
  });
  if (error?.message?.includes("rate_limited")) return json(429, { error: "rate_limited" });
  if (error?.message?.includes("dedup_conflict")) return json(409, { error: "dedup_conflict" });
  if (error) return json(500, { error: "insert_failed" });
  return json(data?.[0]?.duplicate ? 200 : 202, { accepted: true, duplicate: Boolean(data?.[0]?.duplicate) });
});
