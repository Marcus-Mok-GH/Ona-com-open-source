import { createFileDiff } from '@/libs/FileDiff';

const ORGO_API_URL = (process.env.ORGO_API_URL || 'https://www.orgo.ai/api').replace(/\/$/, '');
let workspaceId = process.env.ORGO_WORKSPACE_ID;
const computerEnv = new Map<string, Record<string, string>>();

type OrgoComputer = {
  id: string;
  status?: string;
};

type OrgoResponse<T> = {
  response: Response;
  data: T;
};

type SandboxToolResult = {
  exit_code?: number;
  output?: string;
  stdout?: string;
  stderr?: string;
  content?: string | null;
  path?: string;
  files?: string[];
  [key: string]: unknown;
};

function getOrgoKey(): string {
  const key = process.env.ORGO_API_KEY;
  if (!key) {
    throw new Error('ORGO_API_KEY is not configured.');
  }
  return key;
}

async function orgoRequest<T>(path: string, init: RequestInit = {}): Promise<OrgoResponse<T>> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${getOrgoKey()}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`${ORGO_API_URL}${path}`, { ...init, headers });
  const text = await response.text();
  let data: T;
  try {
    data = JSON.parse(text) as T;
  } catch {
    data = text as T;
  }
  if (!response.ok) {
    const detail = typeof data === 'string' ? data : JSON.stringify(data);
    throw new Error(`Orgo API ${response.status}: ${detail.slice(0, 1000)}`);
  }
  return { response, data };
}

async function getWorkspaceId(): Promise<string> {
  if (workspaceId) return workspaceId;
  const listed = await orgoRequest<{ workspaces?: Array<{ id: string; product?: string }> }>('/workspaces');
  const existing = listed.data.workspaces?.find((workspace) => workspace.product !== 'bops') ?? listed.data.workspaces?.[0];
  if (existing?.id) {
    workspaceId = existing.id;
    return workspaceId;
  }
  const created = await orgoRequest<{ id: string }>('/workspaces', {
    method: 'POST',
    body: JSON.stringify({ name: `ona-${Date.now()}` }),
  });
  workspaceId = created.data.id;
  return workspaceId;
}

async function createComputer(envVars?: Record<string, string>): Promise<OrgoComputer> {
  const response = await orgoRequest<OrgoComputer>('/computers', {
    method: 'POST',
    body: JSON.stringify({
      workspace_id: await getWorkspaceId(),
      name: `ona-agent-${Date.now()}`,
      os: 'linux',
      ram: 4,
      cpu: 1,
    }),
  });
  if (envVars) computerEnv.set(response.data.id, envVars);
  return response.data;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function withEnvironment(computerId: string, command: string): string {
  const envVars = computerEnv.get(computerId);
  if (!envVars || Object.keys(envVars).length === 0) return command;
  const exports = Object.entries(envVars)
    .map(([key, value]) => `export ${key}=${shellQuote(value)}`)
    .join('; ');
  return `${exports}; ${command}`;
}

export const orgoToolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'sandbox_create',
      description: 'Create a new ephemeral Orgo Linux computer for running code, tests, or shell commands in an isolated environment. Returns the computer ID needed for subsequent calls.',
      parameters: {
        type: 'object',
        properties: {
          language: { type: 'string', enum: ['python', 'typescript', 'javascript'], description: 'Runtime language hint. Orgo computers provide a Linux shell; defaults to python.' },
          env_vars: { type: 'object', additionalProperties: { type: 'string' }, description: 'Environment variables to set for commands in the computer.' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sandbox_exec',
      description: 'Execute a shell command inside an existing Orgo computer. Use this to run tests, install packages, compile code, or inspect the filesystem.',
      parameters: {
        type: 'object', required: ['sandbox_id', 'command'],
        properties: {
          sandbox_id: { type: 'string', description: 'Computer ID returned by sandbox_create.' },
          command: { type: 'string', description: 'Shell command to execute.' },
          cwd: { type: 'string', description: 'Working directory inside the computer.' },
          timeout: { type: 'number', description: 'Timeout in seconds, up to 300.' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sandbox_write_file',
      description: 'Write a file into an existing Orgo computer.',
      parameters: {
        type: 'object', required: ['sandbox_id', 'path', 'content'],
        properties: {
          sandbox_id: { type: 'string', description: 'Computer ID returned by sandbox_create.' },
          path: { type: 'string', description: 'Absolute or relative destination path inside the computer.' },
          content: { type: 'string', description: 'File content as a string.' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sandbox_read_file',
      description: 'Read a file from an existing Orgo computer.',
      parameters: {
        type: 'object', required: ['sandbox_id', 'path'],
        properties: {
          sandbox_id: { type: 'string', description: 'Computer ID returned by sandbox_create.' },
          path: { type: 'string', description: 'Absolute or relative path inside the computer.' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sandbox_list_files',
      description: 'List files and directories inside an existing Orgo computer.',
      parameters: {
        type: 'object', required: ['sandbox_id', 'path'],
        properties: {
          sandbox_id: { type: 'string', description: 'Directory path to list inside the computer.' },
          path: { type: 'string', description: 'Directory path to list inside the computer.' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sandbox_delete',
      description: 'Delete an Orgo computer when you are done with it to free resources.',
      parameters: {
        type: 'object', required: ['sandbox_id'],
        properties: { sandbox_id: { type: 'string', description: 'Computer ID to delete.' } },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sandbox_git_clone',
      description: 'Clone a Git repository into an existing Orgo computer.',
      parameters: {
        type: 'object', required: ['sandbox_id', 'url', 'path'],
        properties: {
          sandbox_id: { type: 'string', description: 'Computer ID returned by sandbox_create.' },
          url: { type: 'string', description: 'HTTPS clone URL of the repository.' },
          path: { type: 'string', description: 'Destination directory inside the computer.' },
          branch: { type: 'string', description: 'Branch to clone.' },
          username: { type: 'string', description: 'Git username for private repos.' },
          password: { type: 'string', description: 'Git password or personal access token.' },
        },
        additionalProperties: false,
      },
    },
  },
];

export async function runOrgoTool(name: string, args: Record<string, unknown>): Promise<SandboxToolResult> {
  if (name === 'sandbox_create') {
    const language = typeof args.language === 'string' ? args.language : 'python';
    const envVars = args.env_vars && typeof args.env_vars === 'object' && !Array.isArray(args.env_vars)
      ? args.env_vars as Record<string, string>
      : undefined;
    const computer = await createComputer(envVars);
    return { sandbox_id: computer.id, language, work_dir: '/root', status: computer.status, note: 'Orgo computer created. Use sandbox_id in subsequent calls.' };
  }

  const sandboxId = String(args.sandbox_id ?? '');
  if (!sandboxId) throw new Error('sandbox_id is required.');

  if (name === 'sandbox_exec') {
    const command = String(args.command ?? '');
    const cwd = typeof args.cwd === 'string' ? args.cwd : undefined;
    const timeout = typeof args.timeout === 'number' ? Math.min(300, Math.max(1, Math.floor(args.timeout))) : 60;
    const fullCommand = cwd ? `cd ${shellQuote(cwd)} && ${command}` : command;
    const result = await orgoRequest<{ exit_code?: number; output?: string; stdout?: string; stderr?: string }>('/computers/' + encodeURIComponent(sandboxId) + '/bash', {
      method: 'POST',
      body: JSON.stringify({ command: withEnvironment(sandboxId, fullCommand), timeout }),
    });
    return { exit_code: result.data.exit_code ?? 0, output: (result.data.output ?? `${result.data.stdout ?? ''}${result.data.stderr ?? ''}`).slice(0, 20000) };
  }

  if (name === 'sandbox_write_file') {
    const filePath = String(args.path ?? '');
    const content = String(args.content ?? '');
    const previous: SandboxToolResult = await runOrgoTool('sandbox_read_file', { sandbox_id: sandboxId, path: filePath }).catch(() => ({ content: null }));
    const encoded = Buffer.from(content).toString('base64');
    await runOrgoTool('sandbox_exec', { sandbox_id: sandboxId, command: `mkdir -p $(dirname ${shellQuote(filePath)}) && printf %s ${shellQuote(encoded)} | base64 -d > ${shellQuote(filePath)}` });
    return { path: filePath, bytes_written: Buffer.byteLength(content), touchedFiles: [createFileDiff(filePath, previous.content, content)] };
  }

  if (name === 'sandbox_read_file') {
    const filePath = String(args.path ?? '');
    const result: SandboxToolResult = await runOrgoTool('sandbox_exec', { sandbox_id: sandboxId, command: `cat ${shellQuote(filePath)}` });
    return { path: filePath, content: (result.output ?? '').slice(0, 20000) };
  }

  if (name === 'sandbox_list_files') {
    const dirPath = String(args.path ?? '/');
    const result: SandboxToolResult = await runOrgoTool('sandbox_exec', { sandbox_id: sandboxId, command: `find ${shellQuote(dirPath)} -maxdepth 1 -mindepth 1 -printf '%f\\n' | sort` });
    return { path: dirPath, files: (result.output ?? '').split('\n').map((file: string) => file.trim()).filter(Boolean) };
  }

  if (name === 'sandbox_delete') {
    await orgoRequest(`/computers/${encodeURIComponent(sandboxId)}`, { method: 'DELETE' });
    computerEnv.delete(sandboxId);
    return { deleted: sandboxId };
  }

  if (name === 'sandbox_git_clone') {
    const url = String(args.url ?? '');
    const targetPath = String(args.path ?? '/workspace');
    const branch = typeof args.branch === 'string' ? args.branch : undefined;
    const username = typeof args.username === 'string' ? args.username : undefined;
    const password = typeof args.password === 'string' ? args.password : undefined;
    let cloneUrl = url;
    if (username && password && url.startsWith('https://')) {
      cloneUrl = `https://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${url.slice('https://'.length)}`;
    }
    const branchOption = branch ? ` -b ${shellQuote(branch)}` : '';
    const result: SandboxToolResult = await runOrgoTool('sandbox_exec', { sandbox_id: sandboxId, command: `git clone${branchOption} ${shellQuote(cloneUrl)} ${shellQuote(targetPath)}` });
    return { cloned: url, path: targetPath, branch: branch ?? 'default', exit_code: result.exit_code, output: result.output };
  }

  throw new Error(`Unknown Orgo tool: ${name}`);
}

export function isOrgoTool(name: string): boolean {
  return name.startsWith('sandbox_');
}

export async function prebootSandbox(): Promise<{ sandbox_id: string; work_dir: string } | null> {
  try {
    const computer = await createComputer();
    return { sandbox_id: computer.id, work_dir: '/root' };
  } catch {
    return null;
  }
}

export async function deleteSandboxById(sandboxId: string): Promise<void> {
  try {
    await orgoRequest(`/computers/${encodeURIComponent(sandboxId)}`, { method: 'DELETE' });
    computerEnv.delete(sandboxId);
  } catch {
  }
}

export async function listAllSandboxFiles(sandboxId: string): Promise<string[]> {
  try {
    const result = await runOrgoTool('sandbox_exec', {
      sandbox_id: sandboxId,
      command: 'find . -type f -maxdepth 6 2>/dev/null | grep -v "node_modules\\|.git\\|\\.next" | head -500',
    });
    return (result.output ?? '').split('\n').map((line: string) => line.trim().replace(/^\.\//, '')).filter(Boolean);
  } catch {
    return [];
  }
}
