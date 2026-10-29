import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const client = new Client({ name: 'context-explorer-verifier', version: '0.1.0' });
const transport = new StdioClientTransport({ command: process.execPath, args: ['dist/server.mjs'], cwd: process.cwd(), stderr: 'pipe' });
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.equal(tools.length, 3);
  assert.ok(tools.every(t => t.annotations.readOnlyHint && !t.annotations.destructiveHint));
  assert.deepEqual(tools.find(t => t.name === 'read_context_item')._meta.ui.visibility, ['app']);
  const report = await client.callTool({ name: 'open_context_report', arguments: process.env.CONTEXT_EXPLORER_SESSION_ID ? { session_id: process.env.CONTEXT_EXPLORER_SESSION_ID } : {} });
  assert.ok(!report.isError, JSON.stringify(report.content));
  assert.ok(report._meta.report.entries.length > 0);
  assert.equal(Object.keys(report.structuredContent).length, 5);
  assert.ok(report._meta.report.entries.every(e => !('text' in e)));
  const entry = report._meta.report.entries.at(-1);
  const item = await client.callTool({ name: 'read_context_item', arguments: { session_id: report.structuredContent.session_id, item_id: entry.id } });
  assert.ok(item._meta.item.text.length <= 8000);
  assert.equal(item.content.length, 0);
  const html = await client.readResource({ uri: 'ui://context-explorer/report.html' });
  assert.equal(html.contents[0].mimeType, 'text/html;profile=mcp-app');
  assert.ok(html.contents[0].text.includes('Context Explorer'));
  const result = { native_host_verified: false, mcp_initialize: true, tool_count: tools.length,
    entrypoints: tools[0]._meta['openai/ui'].entrypoints, app_only_details: true,
    category_rows: report._meta.report.session.breakdown.rows.length,
    report_items: report._meta.report.entries.length, no_body_in_model_result: true,
    resource_mime: html.contents[0].mimeType };
  await writeFile('verification.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await client.close(); }
