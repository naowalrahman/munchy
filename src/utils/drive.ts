import { z } from "zod";
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const GIS_SRC = "https://accounts.google.com/gsi/client";
const FILES = "https://www.googleapis.com/drive/v3/files";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const FOLDER = "Munchy backups";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const MAX_BYTES = 50 * 1024 * 1024;
const tokenSchema = z.object({ access_token: z.string().min(1), expires_in: z.number().positive() });
const fileSchema = z.object({ id: z.string().min(1), name: z.string().min(1), modifiedTime: z.string().optional() });
const listSchema = z.object({ files: z.array(fileSchema).max(100).default([]) });
const errorSchema = z.object({ error: z.object({ message: z.string().min(1) }) });
export type DriveFile = z.infer<typeof fileSchema>;
interface TokenClient {
  requestAccessToken: () => void;
}
interface OAuth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: unknown) => void;
    error_callback: (error: { type: string; message?: string }) => void;
  }) => TokenClient;
}
declare global {
  interface Window {
    google?: { accounts: { oauth2: OAuth2 } };
  }
}
let script: Promise<void> | undefined;
export function loadGoogle() {
  script ??= new Promise<void>((resolve, reject) => {
    if (window.google?.accounts.oauth2) return resolve();
    const tag = document.createElement("script");
    tag.src = GIS_SRC;
    tag.async = true;
    tag.onload = () => resolve();
    tag.onerror = () => {
      script = undefined;
      reject(new Error("Could not reach Google sign-in. Check your connection."));
    };
    document.head.append(tag);
  });
  return script;
}
let client: TokenClient | undefined;
let clientKey = "";
let token = { value: "", expires: 0 };
let settle: ((response: unknown) => void) | undefined;
async function accessToken(clientId: string) {
  if (!clientId) throw new Error("Add your Google client ID first.");
  if (token.value && token.expires > Date.now() + 60000) return token.value;
  await loadGoogle();
  const oauth2 = window.google?.accounts.oauth2;
  if (!oauth2) throw new Error("Google sign-in did not load.");
  if (!client || clientKey !== clientId) {
    clientKey = clientId;
    client = oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (response) => settle?.(response),
      error_callback: (error) => settle?.({ error: { message: error.message ?? error.type } }),
    });
  }
  const response = await new Promise<unknown>((resolve) => {
    settle = resolve;
    client?.requestAccessToken();
  });
  const granted = tokenSchema.safeParse(response);
  if (!granted.success) {
    const refused = errorSchema.safeParse(response);
    throw new Error(
      refused.success ? `Google sign-in failed: ${refused.data.error.message}` : "Google sign-in failed."
    );
  }
  token = { value: granted.data.access_token, expires: Date.now() + granted.data.expires_in * 1000 };
  return token.value;
}
interface Call {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}
async function api(bearer: string, url: string, call: Call = {}): Promise<unknown> {
  const response = await fetch(url, {
    method: call.method,
    headers: { ...call.headers, Authorization: `Bearer ${bearer}` },
    body: call.body,
    cache: "no-store",
  });
  if (response.status === 401) token = { value: "", expires: 0 };
  if (Number(response.headers.get("content-length")) > MAX_BYTES) throw new Error("That backup is larger than 50 MB.");
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const failure = errorSchema.safeParse(body);
    throw new Error(
      failure.success
        ? `Google Drive: ${failure.data.error.message}`
        : `Google Drive request failed (${response.status}).`
    );
  }
  return body;
}
const quote = (value: string) => value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
async function find(bearer: string, query: string, limit = 20) {
  const params = new URLSearchParams({
    q: query,
    spaces: "drive",
    orderBy: "modifiedTime desc",
    pageSize: String(limit),
    fields: "files(id,name,modifiedTime)",
  });
  return listSchema.parse(await api(bearer, `${FILES}?${params}`)).files;
}
async function folder(bearer: string) {
  const [existing] = await find(bearer, `mimeType='${FOLDER_MIME}' and name='${FOLDER}' and trashed=false`, 1);
  if (existing) return existing.id;
  const created = await api(bearer, `${FILES}?fields=id,name`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: FOLDER, mimeType: FOLDER_MIME }),
  });
  return fileSchema.parse(created).id;
}
export async function backupToDrive(clientId: string, name: string, content: string): Promise<DriveFile> {
  const bearer = await accessToken(clientId);
  const parent = await folder(bearer);
  const [existing] = await find(bearer, `name='${quote(name)}' and '${parent}' in parents and trashed=false`, 1);
  const metadata = existing ? { name } : { name, parents: [parent], mimeType: "application/json" };
  const boundary = `munchy-${crypto.randomUUID()}`;
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: application/json",
    "",
    content,
    `--${boundary}--`,
    "",
  ].join("\r\n");
  const saved = await api(
    bearer,
    `${existing ? `${UPLOAD}/${existing.id}` : UPLOAD}?uploadType=multipart&fields=id,name,modifiedTime`,
    {
      method: existing ? "PATCH" : "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    }
  );
  return fileSchema.parse(saved);
}
export async function listBackups(clientId: string): Promise<DriveFile[]> {
  const bearer = await accessToken(clientId);
  return find(bearer, "mimeType='application/json' and trashed=false");
}
export async function readBackup(clientId: string, id: string): Promise<unknown> {
  const bearer = await accessToken(clientId);
  return api(bearer, `${FILES}/${encodeURIComponent(id)}?alt=media`);
}
