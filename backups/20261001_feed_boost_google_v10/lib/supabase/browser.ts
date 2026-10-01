type MeloUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export type MeloSession = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user: MeloUser;
};

type AuthResult<T> = { data: T | null; error: string | null };

const STORAGE_KEY = "melo-web-auth-session";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const REFRESH_EARLY_SECONDS = 120;

let refreshInFlight: Promise<MeloSession | null> | null = null;
let currentUserInFlight: Promise<MeloUser | null> | null = null;
let currentUserCache: { accessToken: string; user: MeloUser; checkedAt: number } | null = null;
const CURRENT_USER_CACHE_MS = 15_000;

export function isSupabaseConfigured() {
  return Boolean(url && key);
}

function headers(accessToken?: string): HeadersInit {
  return {
    apikey: key,
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

async function readError(response: Response) {
  try {
    const payload = await response.json();
    return payload?.msg || payload?.message || payload?.error_description || payload?.error || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

function jwtExpiresAt(accessToken: string) {
  try {
    const part = accessToken.split(".")[1];
    if (!part) return undefined;
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded));
    const exp = Number(payload?.exp);
    return Number.isFinite(exp) && exp > 0 ? exp : undefined;
  } catch {
    return undefined;
  }
}

function getStoredSessionRaw(): MeloSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MeloSession) : null;
  } catch {
    return null;
  }
}

function normalizeSession(session: MeloSession, previous?: MeloSession | null): MeloSession {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = Number(session.expires_at) || jwtExpiresAt(session.access_token) || (Number(session.expires_in) > 0 ? now + Number(session.expires_in) : undefined);
  return {
    ...previous,
    ...session,
    refresh_token: session.refresh_token || previous?.refresh_token || "",
    user: session.user?.id || !previous?.user ? session.user : previous.user,
    expires_at: expiresAt,
  };
}

export function saveSession(session: MeloSession | null, notify = true) {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    currentUserCache = null;
  } else {
    const normalized = normalizeSession(session, getStoredSessionRaw());
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    if (normalized.user?.id) {
      currentUserCache = {
        accessToken: normalized.access_token,
        user: normalized.user,
        checkedAt: Date.now(),
      };
    }
  }
  if (notify) {
    window.dispatchEvent(new CustomEvent("melo-auth-changed", { detail: { signedIn: Boolean(session) } }));
  }
}

export function getStoredSession(): MeloSession | null {
  const session = getStoredSessionRaw();
  return session ? normalizeSession(session, session) : null;
}

export function captureSessionFromUrl(): MeloSession | null {
  if (typeof window === "undefined" || !window.location.hash) return null;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return null;
  const session: MeloSession = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: Number(params.get("expires_in") || 0) || undefined,
    expires_at: Number(params.get("expires_at") || 0) || undefined,
    token_type: params.get("token_type") || "bearer",
    user: { id: "", email: undefined },
  };
  saveSession(session);
  window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
  return getStoredSession();
}

function shouldRefresh(session: MeloSession) {
  if (!session.refresh_token) return false;
  const expiresAt = Number(session.expires_at) || jwtExpiresAt(session.access_token);
  if (!expiresAt) return false;
  return expiresAt - Math.floor(Date.now() / 1000) <= REFRESH_EARLY_SECONDS;
}

async function performRefresh(session: MeloSession): Promise<MeloSession | null> {
  try {
    const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });

    if (!response.ok) {
      // Do not auto-sign users out simply because a refresh request failed.
      // Melo Chat intentionally has no idle/inactivity logout. The browser
      // keeps the refresh token in localStorage and retries on the next
      // authenticated request. We only remove the session when Supabase
      // explicitly confirms that the refresh token itself is invalid/revoked.
      let detail = "";
      try {
        const payload = await response.clone().json();
        detail = String(payload?.error_description || payload?.msg || payload?.message || payload?.error || "").toLowerCase();
      } catch {
        detail = "";
      }
      const refreshTokenRejected =
        response.status === 400 &&
        (detail.includes("refresh token") || detail.includes("invalid_grant") || detail.includes("refresh_token")) &&
        (detail.includes("invalid") || detail.includes("expired") || detail.includes("revoked") || detail.includes("not found"));
      if (refreshTokenRejected) saveSession(null);
      return null;
    }

    const refreshed = normalizeSession((await response.json()) as MeloSession, session);
    if (!refreshed.access_token) {
      saveSession(null);
      return null;
    }

    saveSession(refreshed);
    return refreshed;
  } catch {
    return null;
  }
}

export async function refreshStoredSession(force = false): Promise<MeloSession | null> {
  const session = captureSessionFromUrl() ?? getStoredSession();
  if (!session || !session.refresh_token || !isSupabaseConfigured()) return session;
  if (!force && !shouldRefresh(session)) return session;
  if (!refreshInFlight) {
    refreshInFlight = performRefresh(session).finally(() => {
      refreshInFlight = null;
    });
  }

  // Do not fall back to the old stored JWT after a refresh failure. Doing so
  // made the next REST/RPC request immediately reuse the expired token and
  // surface "JWT expired" as a runtime error.
  return await refreshInFlight;
}

async function authFetch(input: string, init: RequestInit = {}, retry401 = true): Promise<Response> {
  let session = captureSessionFromUrl() ?? getStoredSession();
  if (session && shouldRefresh(session)) session = (await refreshStoredSession()) ?? getStoredSession();

  let response = await fetch(input, {
    ...init,
    headers: { ...headers(session?.access_token), ...(init.headers || {}) },
  });

  if (response.status === 401 && retry401) {
    if (session?.refresh_token) {
      const refreshed = await refreshStoredSession(true);
      if (refreshed?.access_token) {
        // Retry once with the refreshed token even if an auth provider ever
        // returns the same token string; the refresh itself is authoritative.
        response = await fetch(input, {
          ...init,
          headers: { ...headers(refreshed.access_token), ...(init.headers || {}) },
        });
        if (response.status !== 401) return response;
      }
    }

    // A single 401 is not treated as an inactivity logout. performRefresh()
    // is responsible for clearing the local session only when Supabase
    // explicitly rejects the refresh token itself.
  }

  return response;
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult<MeloSession>> {
  if (!isSupabaseConfigured()) return { data: null, error: "Supabase is not configured." };
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: headers(), body: JSON.stringify({ email, password }),
  });
  if (!response.ok) return { data: null, error: await readError(response) };
  const session = normalizeSession((await response.json()) as MeloSession);
  saveSession(session);
  return { data: session, error: null };
}

export async function signUpWithPassword(email: string, password: string, redirectTo: string): Promise<AuthResult<{ user: MeloUser | null; session: MeloSession | null }>> {
  if (!isSupabaseConfigured()) return { data: null, error: "Supabase is not configured." };
  const response = await fetch(`${url}/auth/v1/signup?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: "POST", headers: headers(), body: JSON.stringify({ email, password }),
  });
  if (!response.ok) return { data: null, error: await readError(response) };
  const payload = await response.json();
  const session = payload?.access_token ? normalizeSession(payload as MeloSession) : null;
  if (session) saveSession(session);
  return { data: { user: payload?.user ?? payload ?? null, session }, error: null };
}

export async function sendPasswordReset(email: string, redirectTo: string): Promise<AuthResult<true>> {
  if (!isSupabaseConfigured()) return { data: null, error: "Supabase is not configured." };
  const response = await fetch(`${url}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: "POST", headers: headers(), body: JSON.stringify({ email }),
  });
  if (!response.ok) return { data: null, error: await readError(response) };
  return { data: true, error: null };
}

export async function getCurrentUser(): Promise<MeloUser | null> {
  if (!isSupabaseConfigured()) return null;
  let session = captureSessionFromUrl() ?? getStoredSession();
  if (!session) return null;
  if (shouldRefresh(session)) {
    const refreshed = await refreshStoredSession();
    if (!refreshed) return null;
    session = refreshed;
  }

  const cachedUser = session.user?.id ? session.user : null;
  if (
    cachedUser &&
    currentUserCache?.accessToken === session.access_token &&
    Date.now() - currentUserCache.checkedAt < CURRENT_USER_CACHE_MS
  ) {
    return currentUserCache.user;
  }

  if (currentUserInFlight) return currentUserInFlight;

  currentUserInFlight = (async () => {
    try {
      const response = await authFetch(`${url}/auth/v1/user`, { method: "GET" });
      if (response.ok) {
        const user = (await response.json()) as MeloUser;
        // Validating the same session must not emit melo-auth-changed.
        // Header listens to that event and would otherwise trigger another
        // getCurrentUser() call, creating a continuous auth request loop.
        saveSession({ ...(getStoredSession() ?? session), user }, false);
        currentUserCache = {
          accessToken: (getStoredSession() ?? session).access_token,
          user,
          checkedAt: Date.now(),
        };
        return user;
      }
      // authFetch clears an unrecoverable expired session. Never fall back to
      // the user object from the stale in-memory session after that happens.
      const stored = getStoredSession();
      if (response.status === 401 || !stored) return null;
      const cached = stored.user ?? session.user;
      return cached?.id ? cached : null;
    } catch {
      const stored = getStoredSession();
      if (!stored) return null;
      const cached = stored.user ?? session.user;
      return cached?.id ? cached : null;
    }
  })().finally(() => {
    currentUserInFlight = null;
  });

  return currentUserInFlight;
}

export async function updatePassword(password: string): Promise<AuthResult<true>> {
  const session = captureSessionFromUrl() ?? getStoredSession();
  if (!session) return { data: null, error: "No recovery session." };
  const response = await authFetch(`${url}/auth/v1/user`, { method: "PUT", body: JSON.stringify({ password }) });
  if (!response.ok) return { data: null, error: await readError(response) };
  return { data: true, error: null };
}


export async function signInWithGoogle(redirectTo?: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: "Supabase is not configured." };
  if (typeof window === "undefined") return { error: "Google sign-in is only available in the browser." };

  try {
    const authorizeUrl = new URL(`${url}/auth/v1/authorize`);
    authorizeUrl.searchParams.set("provider", "google");
    authorizeUrl.searchParams.set("redirect_to", redirectTo || `${window.location.origin}/onboarding`);
    window.location.assign(authorizeUrl.toString());
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to start Google sign-in." };
  }
}

export async function signOut() {
  const session = getStoredSession();
  if (session && isSupabaseConfigured()) {
    await fetch(`${url}/auth/v1/logout`, { method: "POST", headers: headers(session.access_token) }).catch(() => undefined);
  }
  saveSession(null);
}

export type SupabaseRestResult<T> = { data: T | null; error: string | null };

export async function rpcRequest<T = unknown>(functionName: string, params: Record<string, unknown> = {}): Promise<SupabaseRestResult<T>> {
  if (!isSupabaseConfigured()) return { data: null, error: "Supabase is not configured." };
  const response = await authFetch(`${url}/rest/v1/rpc/${encodeURIComponent(functionName)}`, { method: "POST", body: JSON.stringify(params) });
  if (!response.ok) return { data: null, error: await readError(response) };
  const text = await response.text();
  if (!text) return { data: null, error: null };
  try { return { data: JSON.parse(text) as T, error: null }; }
  catch { return { data: text as T, error: null }; }
}

export async function restSelect<T = Array<Record<string, unknown>>>(tableName: string, query: string): Promise<SupabaseRestResult<T>> {
  if (!isSupabaseConfigured()) return { data: null, error: "Supabase is not configured." };
  const normalizedQuery = query.startsWith("?") ? query : `?${query}`;
  const response = await authFetch(`${url}/rest/v1/${encodeURIComponent(tableName)}${normalizedQuery}`, { method: "GET" });
  if (!response.ok) return { data: null, error: await readError(response) };
  return { data: (await response.json()) as T, error: null };
}

export async function restInsert(tableName: string, payload: Record<string, unknown> | Array<Record<string, unknown>>): Promise<SupabaseRestResult<true>> {
  if (!isSupabaseConfigured()) return { data: null, error: "Supabase is not configured." };
  const response = await authFetch(`${url}/rest/v1/${encodeURIComponent(tableName)}`, {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return { data: null, error: await readError(response) };
  return { data: true, error: null };
}

export async function restUpsert<T = Record<string, unknown>>(tableName: string, payload: Record<string, unknown> | Array<Record<string, unknown>>, onConflict = ""): Promise<SupabaseRestResult<T>> {
  if (!isSupabaseConfigured()) return { data: null, error: "Supabase is not configured." };
  const query = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : "";
  const response = await authFetch(`${url}/rest/v1/${encodeURIComponent(tableName)}${query}`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return { data: null, error: await readError(response) };
  const text = await response.text();
  if (!text) return { data: null, error: null };
  try { return { data: JSON.parse(text) as T, error: null }; }
  catch { return { data: text as T, error: null }; }
}

export async function restDelete(tableName: string, query: string): Promise<SupabaseRestResult<true>> {
  if (!isSupabaseConfigured()) return { data: null, error: "Supabase is not configured." };
  const normalizedQuery = query.startsWith("?") ? query : `?${query}`;
  const response = await authFetch(`${url}/rest/v1/${encodeURIComponent(tableName)}${normalizedQuery}`, {
    method: "DELETE", headers: { Prefer: "return=minimal" },
  });
  if (!response.ok) return { data: null, error: await readError(response) };
  return { data: true, error: null };
}

export async function invokeEdgeFunction<T = unknown>(functionName: string, payload: Record<string, unknown>): Promise<SupabaseRestResult<T>> {
  if (!isSupabaseConfigured()) return { data: null, error: "Supabase is not configured." };
  const response = await authFetch(`${url}/functions/v1/${encodeURIComponent(functionName)}`, { method: "POST", body: JSON.stringify(payload) });
  if (!response.ok) return { data: null, error: await readError(response) };
  const text = await response.text();
  if (!text) return { data: null, error: null };
  try { return { data: JSON.parse(text) as T, error: null }; }
  catch { return { data: text as T, error: null }; }
}

export function publicStorageUrl(bucket: string, path: string | null | undefined) {
  const clean = String(path ?? "").trim();
  if (!clean || !url) return "";
  if (/^https?:\/\//i.test(clean)) return clean;
  const encodedPath = clean.split("/").map((segment) => encodeURIComponent(segment)).join("/");
  return `${url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}

export async function createSignedStorageUrl(bucket: string, path: string, expiresIn = 3600): Promise<SupabaseRestResult<string>> {
  if (!isSupabaseConfigured()) return { data: null, error: "Supabase is not configured." };
  const cleanBucket = String(bucket || "").trim();
  const cleanPath = String(path || "").replace(/^\/+/, "");
  if (!cleanBucket || !cleanPath) return { data: null, error: "Storage bucket and path are required." };
  const encodedPath = cleanPath.split("/").map((segment) => encodeURIComponent(segment)).join("/");
  const response = await authFetch(`${url}/storage/v1/object/sign/${encodeURIComponent(cleanBucket)}/${encodedPath}`, {
    method: "POST",
    body: JSON.stringify({ expiresIn: Math.max(1, Math.floor(expiresIn)) }),
  });
  if (!response.ok) return { data: null, error: await readError(response) };
  const payload = (await response.json()) as Record<string, unknown>;
  const raw = String(payload.signedURL ?? payload.signedUrl ?? payload.signed_url ?? "").trim();
  if (!raw) return { data: null, error: "Signed storage URL was not returned." };
  const signed = /^https?:\/\//i.test(raw) ? raw : `${url}/storage/v1${raw.startsWith("/") ? raw : `/${raw}`}`;
  return { data: signed, error: null };
}

export async function uploadStorageObject(bucket: string, path: string, file: Blob, contentType?: string): Promise<SupabaseRestResult<{ path: string }>> {
  if (!isSupabaseConfigured()) return { data: null, error: "Supabase is not configured." };
  const cleanBucket = String(bucket || "").trim();
  const cleanPath = String(path || "").replace(/^\/+/, "");
  if (!cleanBucket || !cleanPath) return { data: null, error: "Storage bucket and path are required." };
  const encodedPath = cleanPath.split("/").map((segment) => encodeURIComponent(segment)).join("/");
  const response = await authFetch(`${url}/storage/v1/object/${encodeURIComponent(cleanBucket)}/${encodedPath}`, {
    method: "POST",
    headers: {
      "Content-Type": contentType || file.type || "application/octet-stream",
      "x-upsert": "true",
    },
    body: file,
  });
  if (!response.ok) return { data: null, error: await readError(response) };
  return { data: { path: cleanPath }, error: null };
}

export async function restUpdate(tableName: string, query: string, payload: Record<string, unknown>): Promise<SupabaseRestResult<true>> {
  if (!isSupabaseConfigured()) return { data: null, error: "Supabase is not configured." };
  const normalizedQuery = query.startsWith("?") ? query : `?${query}`;
  const response = await authFetch(`${url}/rest/v1/${encodeURIComponent(tableName)}${normalizedQuery}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return { data: null, error: await readError(response) };
  return { data: true, error: null };
}

export async function deleteStorageObject(bucket: string, path: string): Promise<SupabaseRestResult<true>> {
  if (!isSupabaseConfigured()) return { data: null, error: "Supabase is not configured." };
  const cleanBucket = String(bucket || "").trim();
  const cleanPath = String(path || "").replace(/^\/+/, "");
  if (!cleanBucket || !cleanPath) return { data: null, error: "Storage bucket and path are required." };
  const encodedPath = cleanPath.split("/").map((segment) => encodeURIComponent(segment)).join("/");
  const response = await authFetch(`${url}/storage/v1/object/${encodeURIComponent(cleanBucket)}/${encodedPath}`, { method: "DELETE" });
  if (!response.ok) return { data: null, error: await readError(response) };
  return { data: true, error: null };
}

export async function restInsertReturning<T = Record<string, unknown>>(tableName: string, payload: Record<string, unknown>): Promise<SupabaseRestResult<T[]>> {
  if (!isSupabaseConfigured()) return { data: null, error: "Supabase is not configured." };
  const response = await authFetch(`${url}/rest/v1/${encodeURIComponent(tableName)}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return { data: null, error: await readError(response) };
  return { data: (await response.json()) as T[], error: null };
}
