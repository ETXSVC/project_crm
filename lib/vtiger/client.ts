import { createHash } from "crypto";
import {
  getEnvVtigerBaseUrl,
  getVtigerConfigForTenant,
  getVtigerWebserviceUrl,
  normalizeVtigerBaseUrl,
  type VtigerConfig,
} from "@/lib/vtiger/config";
import { VtigerApiError } from "@/lib/vtiger/errors";
import { getVtigerSessionName } from "@/lib/vtiger/session";
import { assertValidVtigerRecordId } from "@/lib/vtiger/validate";
import type { VtigerModule, VtigerRecord } from "@/lib/vtiger/types";

type VtigerApiResponse<T> = {
  success: boolean;
  result?: T;
  error?: { code?: string; message?: string };
};

export type VtigerLoginResult = {
  sessionName: string;
  userId: string;
  version: string;
  vtigerVersion: string;
};

function md5(value: string): string {
  return createHash("md5").update(value).digest("hex");
}

function resolveCredentials(options?: { baseUrl?: string; username?: string; accessKey?: string }) {
  const baseUrl = options?.baseUrl ?? getEnvVtigerBaseUrl();
  const username = options?.username;
  const accessKey = options?.accessKey;

  if (!baseUrl || !username || !accessKey) {
    throw new Error(
      "Vtiger is not fully configured. Provide base URL, username, and access key."
    );
  }

  return {
    baseUrl: normalizeVtigerBaseUrl(baseUrl),
    username,
    accessKey,
  };
}

async function parseVtigerResponse<T>(response: Response): Promise<VtigerApiResponse<T>> {
  const text = await response.text();
  try {
    return JSON.parse(text) as VtigerApiResponse<T>;
  } catch {
    throw new Error(
      response.ok
        ? "Vtiger returned an invalid response"
        : `Vtiger request failed (${response.status}): ${text.slice(0, 200)}`
    );
  }
}

export async function vtigerLogin(options: {
  baseUrl: string;
  username: string;
  accessKey: string;
}): Promise<VtigerLoginResult> {
  const { baseUrl, username, accessKey } = resolveCredentials(options);
  const webserviceUrl = `${baseUrl}/webservice.php`;

  const challengeResponse = await fetch(
    `${webserviceUrl}?operation=getchallenge&username=${encodeURIComponent(username)}`,
    { cache: "no-store" }
  );
  const challenge = await parseVtigerResponse<{ token: string }>(challengeResponse);

  if (!challenge.success || !challenge.result?.token) {
    throw new Error(challenge.error?.message ?? "Failed to obtain Vtiger challenge token");
  }

  const loginBody = new URLSearchParams({
    operation: "login",
    username,
    accessKey: md5(challenge.result.token + accessKey),
  });

  const loginResponse = await fetch(webserviceUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: loginBody,
    cache: "no-store",
  });

  const login = await parseVtigerResponse<VtigerLoginResult>(loginResponse);
  if (!login.success || !login.result?.sessionName) {
    throw new Error(login.error?.message ?? "Vtiger login failed");
  }

  return login.result;
}

export async function verifyVtigerConnection(options: {
  baseUrl: string;
  username: string;
  accessKey: string;
}): Promise<{ version: string; vtigerVersion: string; userId: string }> {
  const session = await vtigerLogin(options);
  const webserviceUrl = getVtigerWebserviceUrl(options.baseUrl);

  await fetch(
    `${webserviceUrl}?operation=logout&sessionName=${encodeURIComponent(session.sessionName)}`,
    { cache: "no-store" }
  );

  return {
    version: session.version,
    vtigerVersion: session.vtigerVersion,
    userId: session.userId,
  };
}

async function resolveTenantConfig(tenantId: string): Promise<VtigerConfig> {
  const config = await getVtigerConfigForTenant(tenantId);
  if (!config) {
    throw new Error("Vtiger is not configured for this company.");
  }
  return config;
}

async function vtigerRequestForTenant<T>(
  tenantId: string,
  params: Record<string, string>,
  method: "GET" | "POST" = "GET"
): Promise<T> {
  const config = await resolveTenantConfig(tenantId);
  const webserviceUrl = getVtigerWebserviceUrl(config.baseUrl);
  const sessionName = await getVtigerSessionName(tenantId);
  const body = new URLSearchParams({ ...params, sessionName });

  const url = method === "GET" ? `${webserviceUrl}?${body}` : webserviceUrl;
  const response = await fetch(url, {
    method,
    headers: method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : undefined,
    body: method === "POST" ? body : undefined,
    cache: "no-store",
  });

  const parsed = await parseVtigerResponse<T>(response);
  if (!parsed.success) {
    throw new VtigerApiError(
      parsed.error?.message ?? "Vtiger request failed",
      parsed.error?.code
    );
  }
  return parsed.result as T;
}

type VtigerQueryResult = VtigerRecord[] | { records?: VtigerRecord[] };

function normalizeQueryResult(result: VtigerQueryResult): VtigerRecord[] {
  if (Array.isArray(result)) return result;
  return result.records ?? [];
}

export async function vtigerQuery(tenantId: string, query: string): Promise<VtigerRecord[]> {
  const result = await vtigerRequestForTenant<VtigerQueryResult>(tenantId, {
    operation: "query",
    query,
  });
  return normalizeQueryResult(result);
}

export async function vtigerRetrieve(tenantId: string, id: string): Promise<VtigerRecord> {
  const validId = assertValidVtigerRecordId(id);
  return vtigerRequestForTenant<VtigerRecord>(tenantId, { operation: "retrieve", id: validId });
}

export async function vtigerQueryContactsByAccount(
  tenantId: string,
  accountId: string
): Promise<VtigerRecord[]> {
  const validAccountId = assertValidVtigerRecordId(accountId);
  return vtigerQuery(
    tenantId,
    `SELECT id, firstname, lastname, email, phone, title, account_id FROM Contacts WHERE account_id='${validAccountId}' LIMIT 50;`
  );
}

export async function vtigerCreate(
  tenantId: string,
  elementType: VtigerModule,
  element: VtigerRecord
): Promise<VtigerRecord> {
  return vtigerRequestForTenant<VtigerRecord>(
    tenantId,
    {
      operation: "create",
      elementType,
      element: JSON.stringify(element),
    },
    "POST"
  );
}

export async function vtigerUpdate(
  tenantId: string,
  element: VtigerRecord & { id: string }
): Promise<VtigerRecord> {
  assertValidVtigerRecordId(element.id);
  return vtigerRequestForTenant<VtigerRecord>(
    tenantId,
    {
      operation: "update",
      element: JSON.stringify(element),
    },
    "POST"
  );
}

export async function vtigerDelete(tenantId: string, id: string): Promise<void> {
  const validId = assertValidVtigerRecordId(id);
  await vtigerRequestForTenant(tenantId, { operation: "delete", id: validId }, "POST");
}

type VtigerDescribeField = {
  name: string;
  type: { name: string };
  picklistValues?: Array<{ value: string; label: string }>;
};

type VtigerDescribeResult = { fields: VtigerDescribeField[] };

export async function vtigerDescribePicklist(
  tenantId: string,
  elementType: VtigerModule,
  fieldName: string
): Promise<string[]> {
  const result = await vtigerRequestForTenant<VtigerDescribeResult>(tenantId, {
    operation: "describe",
    elementType,
  });
  const field = result.fields.find((f) => f.name === fieldName);
  if (!field?.picklistValues?.length) return [];
  return field.picklistValues.map((v) => v.value);
}

export async function vtigerCount(tenantId: string, module: VtigerModule): Promise<number> {
  const records = await vtigerQuery(tenantId, `SELECT count(*) FROM ${module};`);
  const count = records[0]?.count;
  return typeof count === "number" ? count : Number(count ?? 0);
}

export async function vtigerCreateWithOwner(
  tenantId: string,
  elementType: VtigerModule,
  element: VtigerRecord,
  assignedUserId: string
): Promise<VtigerRecord> {
  return vtigerCreate(tenantId, elementType, {
    ...element,
    assigned_user_id: assignedUserId,
  });
}
