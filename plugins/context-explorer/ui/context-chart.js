// Groups follow the explorer roots; unavailable tool/MCP sources are not split artificially.
const groups = [
  ['system_prompt', 'System prompt', '#808080', ['system_prompt']],
  ['tools', 'Tool / MCP definitions', '#7963d5', ['tools']],
  ['memory_files', 'Rules', '#008249', ['memory_files']],
  ['skills', 'Skills', '#af7500', ['skills']],
  ['custom_agents', 'Subagent definitions', '#267dc5', ['custom_agents']],
  ['conversation', 'Conversation', '#d62f12', ['messages','tool_calls','tool_results','reasoning_summary','compaction']],
];
export const contextColors = Object.fromEntries(groups.map(([id,,color]) => [id,color]));
export function contextChart(session, mode) {
  const rows = session.breakdown.rows;
  const categories = mode === 'categories';
  const legend = groups.map(([id,label,color,ids]) => {
    const observed = rows.filter(r => ids.includes(r.id) && Number.isFinite(r.tokens));
    return { id,label,color,value:observed.length ? observed.reduce((n,r) => n+r.tokens,0) : null };
  });
  const used = categories ? session.breakdown.visible_tokens : session.used_tokens;
  const capacity = session.window_tokens;
  const available = Number.isFinite(used) && used >= 0 && Number.isFinite(capacity) && capacity > 0;
  const parts = categories ? legend : [{id:'recent_request',label:'最近请求（日志快照）',color:'#d62f12',value:used}];
  // If the visible-text estimate exceeds capacity, show its composition in a full ring and label the overflow.
  const plotTotal = available ? Math.max(capacity,used) : 1;
  const segments = available ? parts.filter(r => r.value > 0).map(r => ({...r,percent:r.value/plotTotal*100})) : [];
  return {categories,used,capacity,available,segments,legend:categories ? legend : parts,
    percent:available ? used/capacity*100 : null,
    remainder:available ? Math.max(0,capacity-used) : null,
    overflow:available && used>capacity};
}
