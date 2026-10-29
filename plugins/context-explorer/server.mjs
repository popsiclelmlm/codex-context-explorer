import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { OpenAIUiToolMetadataSchema } from '@openai/mcp-extensions/server';
import { z } from 'zod';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';

// 源码位于插件根目录，打包产物位于 dist/；两者都以 bridge.py 所在目录为插件根目录。
const here = dirname(fileURLToPath(import.meta.url));
const root = existsSync(join(here, 'bridge.py')) ? here : dirname(here);
const venvPython = join(root, '.venv', process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'python.exe' : 'python');
const python = process.env.CONTEXT_EXPLORER_PYTHON || (existsSync(venvPython) ? venvPython : process.platform === 'win32' ? 'python' : 'python3');
let sequence = 0, worker = null, closing = false;
const pending = new Map();
function failPending(message) {
  for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error(message)); }
  pending.clear();
}
// 采集器异常退出后不自动重启，下一次请求时再拉起，避免 Python 缺失时反复空转。
function startWorker() {
  const child = spawn(python, [join(root, 'bridge.py')], { stdio: ['pipe', 'pipe', 'inherit'] });
  const stopped = message => { if (worker === child) worker = null; failPending(message); };
  child.on('error', error => {
    const message = error.code === 'ENOENT'
      ? `Python 3 not found (${python}). Install Python 3 or set CONTEXT_EXPLORER_PYTHON.`
      : `Cannot start local collector: ${error.message}`;
    console.error('[context-explorer] ' + message);
    stopped(message);
  });
  child.on('exit', (code, signal) => stopped(`Local collector exited (${signal || code})`));
  // 子进程已退出时写入会触发 EPIPE，由 exit/error 统一处理。
  child.stdin.on('error', () => {});
  createInterface({ input: child.stdout }).on('line', line => {
    let reply;
    try { reply = JSON.parse(line); } catch { return; }
    const request = pending.get(reply.id);
    if (!request) return;
    clearTimeout(request.timer); pending.delete(reply.id);
    reply.error ? request.reject(new Error(reply.error)) : request.resolve(reply.result);
  });
  return child;
}
function readLocal(op, args) {
  if (closing) return Promise.reject(new Error('Server is shutting down'));
  worker ??= startWorker();
  const target = worker;
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Local collector timeout')); }, 20000);
    pending.set(id, { resolve, reject, timer });
    target.stdin.write(JSON.stringify({ id, op, args }) + '\n');
  });
}
function shutdown() { closing = true; worker?.kill(); }
worker = startWorker();
const uri = 'ui://context-explorer/report.html';
const server = new McpServer({ name: 'context-explorer', version: '0.1.0' });
const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const sessionId = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/).optional();
const extension = OpenAIUiToolMetadataSchema.parse({ entrypoints: [{ type: 'global' }, { type: 'thread' }] });

registerAppTool(server, 'open_context_report', {
  title: 'Context Explorer', description: 'Open a local, read-only context usage report. Category counts estimate visible text, not the full model request.',
  inputSchema: { session_id: sessionId }, annotations: readOnly,
  _meta: { ui: { resourceUri: uri }, 'openai/ui': extension },
}, async args => {
  const report = await readLocal('report', args);
  const s = report.session;
  return { content: [{ type: 'text', text: '本地上下文报告已准备。分类为可见文本估算；正文仅在面板中按需读取。' }],
    structuredContent: { session_id: s.session_id, model: s.model, window_tokens: s.window_tokens,
      recent_request_tokens: s.used_tokens, visible_text_tokens: s.breakdown.visible_tokens },
    _meta: { report } };
});
registerAppTool(server, 'refresh_context_report', {
  description: 'Refresh the local report without invoking a model.', inputSchema: { session_id: sessionId }, annotations: readOnly,
  _meta: { ui: { resourceUri: uri, visibility: ['app'] } },
}, async args => ({ content: [], _meta: { report: await readLocal('report', args) } }));
registerAppTool(server, 'read_context_item', {
  description: 'Read one visible text fragment, capped at 8000 characters, for the local UI.',
  inputSchema: { session_id: sessionId, item_id: z.string().regex(/^\d+:\d+$/) }, annotations: readOnly,
  _meta: { ui: { resourceUri: uri, visibility: ['app'] } },
}, async args => ({ content: [], _meta: { item: await readLocal('item', args) } }));
registerAppResource(server, 'Context Explorer', uri, {}, async () => ({ contents: [{ uri,
  mimeType: RESOURCE_MIME_TYPE, text: await readFile(join(root, 'dist/report.html'), 'utf8'),
  _meta: { ui: { csp: { connectDomains: [], resourceDomains: [] } },
    'openai/ui': { availableDisplayModes: ['inline', 'fullscreen'], preferredDisplayMode: 'fullscreen' } },
}] }));
const transport = new StdioServerTransport();
transport.onclose = shutdown;
process.on('SIGTERM', () => { shutdown(); process.exit(0); });
process.on('SIGINT', () => { shutdown(); process.exit(0); });
process.stdin.on('end', shutdown);
await server.connect(transport);
