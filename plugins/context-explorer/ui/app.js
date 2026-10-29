import { App } from '@modelcontextprotocol/ext-apps';
import { contextChart, contextColors } from './context-chart.js';
import { t, language, setLanguage, themeMode, setTheme, applyTheme, setHostTheme } from './i18n.js';
import server from './icons/server.svg';
import listChecks from './icons/list-checks.svg';
import zap from './icons/zap.svg';
import bot from './icons/bot.svg';
import messageCircle from './icons/message-circle.svg';
import messagesSquare from './icons/messages-square.svg';
import messageSquare from './icons/message-square.svg';
import wrench from './icons/wrench.svg';
import fileOutput from './icons/file-output.svg';
import brain from './icons/brain.svg';
import archive from './icons/archive.svg';
import chevronRight from './icons/chevron-right.svg';
import languages from './icons/languages.svg';
import sun from './icons/sun.svg';
import moon from './icons/moon.svg';
import monitor from './icons/monitor.svg';
import info from './icons/info.svg';
const iconSources = { server, listChecks, zap, bot, messageCircle, messagesSquare, messageSquare, wrench, fileOutput, brain, archive, chevronRight, languages, sun, moon, monitor, info };
const categoryIcons = { system_prompt: 'server', tools: 'wrench', memory_files: 'listChecks', skills: 'zap', custom_agents: 'bot', conversation: 'messageCircle', messages: 'messageSquare', tool_calls: 'wrench', tool_results: 'fileOutput', reasoning_summary: 'brain', compaction: 'archive' };
const iconTemplates = new Map();
function icon(name, cls = '') {
  if (!iconTemplates.has(name)) iconTemplates.set(name, new DOMParser().parseFromString(iconSources[name] || messageSquare, 'image/svg+xml').documentElement);
  const svg = iconTemplates.get(name).cloneNode(true);
  svg.setAttribute('class', 'icon ' + cls); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  return svg;
}
const $ = id => document.getElementById(id);
const app = new App({ name: 'Context Explorer', version: '0.1.0' }, {});
let selected = null, busy = false, report = null, expandAll = false;
let opened = new Set(), itemCache = new Map();
let activeChartPart=null, lastError=null, copied=false;
const label = id => t('cat.'+id);
const count = n => n == null ? t('unknown') : Math.round(n).toLocaleString('en-US');
const compact = n => n == null ? t('unknown') : new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
function node(tag, text, cls) { const n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; }
function showError(key) { lastError=key;$('error').textContent=key?t(key):''; }
function staticText() {
  document.documentElement.lang=language==='zh'?'zh-CN':'en';
  for(const el of document.querySelectorAll('[data-i18n]'))el.textContent=t(el.dataset.i18n);
  for(const el of document.querySelectorAll('[data-i18n-aria]'))el.setAttribute('aria-label',t(el.dataset.i18nAria));
  $('language-toggle').replaceChildren(icon('languages'));
  $('theme-toggle').replaceChildren(icon(themeMode==='system'?'monitor':themeMode==='dark'?'moon':'sun'));
  $('info-toggle').replaceChildren(icon('info'));
  for(const [id,name,state] of [['language-toggle','language',language==='zh'?'中文':'English'],['theme-toggle','theme',t(themeMode)],['info-toggle','info','']]) {
    const title=t(name)+(state?' · '+state:'');$(id).title=title;$(id).setAttribute('aria-label',title);
  }
  for(const button of document.querySelectorAll('[data-language]')){const active=button.dataset.language===language;button.classList.toggle('is-selected',active);button.setAttribute('aria-pressed',String(active));}
  for(const button of document.querySelectorAll('[data-theme-choice]')){const active=button.dataset.themeChoice===themeMode;button.classList.toggle('is-selected',active);button.setAttribute('aria-pressed',String(active));}
  for(const [id,name] of [['theme-system','monitor'],['theme-light','sun'],['theme-dark','moon']])$(id).replaceChildren(icon(name),node('span',t(id.slice(6))));
  $('expand').textContent=t(expandAll?'collapse':'expand');$('copy').textContent=t(copied?'copied':'copy');
  if(lastError)$('error').textContent=t(lastError);
}
function entryLabel(item) {
  const names={'User Message':'userMessage','Agent Message':'agentMessage','Context Message':'contextMessage','System Message':'systemMessage','Reasoning Summary':'cat.reasoning_summary','压缩摘要':'cat.compaction','文本片段':'fragment'};
  if(names[item.label])return t(names[item.label]);
  if(item.label.startsWith('Tool Result: '))return t('toolResult',{name:item.label.slice(13)});
  if(item.label.startsWith('Tool: '))return t('toolCall',{name:item.label.slice(6)});
  return item.label;
}
function turnLabel(turn) {
  if(turn.id==='before-user')return t('beforeUser');
  if(turn.id.startsWith('history:'))return t('history');
  return turn.number!=null ? t(turn.id.startsWith('inferred:')?'inferredTurn':'turn',{n:turn.number}) : turn.label;
}
function bodyText(value) { return value.text+(value.truncated?'\n\n'+t('truncated'):''); }

function chart() {
  if (!report) return;
  const view = contextChart(report.session, $('chart-mode').value);
  const chartRoot = $('context-chart');
  const focused = chartRoot.querySelector('[data-chart-part]:focus');
  const focusKey = focused ? {id:focused.dataset.chartPart,surface:focused.dataset.chartSurface} : null;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox','0 0 240 240'); svg.setAttribute('role','group'); svg.setAttribute('aria-label',t('chartLabel'));
  const partLabel = part => part.id==='remainder' ? t(view.categories?'remainder':'remaining') : part.id==='recent_request' ? t('recentRequest') : label(part.id);
  const parts = [...view.legend,{id:'remainder',color:'var(--track)',value:view.remainder}];
  const byId = new Map(parts.map(part=>[part.id,part]));
  const percentage = view.percent==null ? t('unknown') : Math.round(view.percent)+'%';
  const partPercent = part => Number.isFinite(part.value) && view.capacity>0 ? new Intl.NumberFormat(language==='zh'?'zh-CN':'en',{maximumFractionDigits:1}).format(part.value/view.capacity*100)+'%' : t('unknown');
  function activate(id) {
    const part=byId.get(id);
    activeChartPart=part && Number.isFinite(part.value) && view.available ? id : null;
    chartRoot.classList.toggle('has-chart-focus',!!activeChartPart);
    for (const element of chartRoot.querySelectorAll('[data-chart-part]')) element.classList.toggle('is-active',element.dataset.chartPart===activeChartPart);
    $('donut-value').textContent=activeChartPart ? partPercent(part) : percentage;
    $('donut-caption').textContent=activeChartPart ? partLabel(part) : t(view.categories?'fullEstimate':'fullRequest');
    $('donut').setAttribute('aria-label',activeChartPart ? t('share',{name:partLabel(part),percent:partPercent(part),tokens:count(part.value)}) : t('chartLabel')+': '+percentage);
  }
  function wire(element,part,surface,focusable=true) {
    element.dataset.chartPart=part.id;element.dataset.chartSurface=surface;
    element.title=t('share',{name:partLabel(part),percent:partPercent(part),tokens:count(part.value)});
    element.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')activate(part.id);});
    element.addEventListener('pointerleave',()=>{if(activeChartPart===part.id)activate(null);});
    if (focusable && Number.isFinite(part.value) && view.available) {
      element.setAttribute('tabindex','0');element.setAttribute('role','button');element.setAttribute('aria-label',element.title);
      element.addEventListener('focus',()=>activate(part.id));element.addEventListener('blur',()=>activate(null));
      element.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();activate(part.id);}if(event.key==='Escape')activate(null);});
    }
    element.addEventListener('click',()=>activate(part.id));
  }
  const track=$('usage-track');track.replaceChildren();
  const plotTotal=view.available ? Math.max(view.capacity,view.used) : 1;
  const segments=[...view.segments];
  if(view.remainder>0) segments.push({...byId.get('remainder'),percent:view.remainder/plotTotal*100});
  let start=0;
  for (const part of segments) {
    const sweep=part.percent/100*Math.PI*2;
    // Each path has its own trimmed ends, leaving an actual gap with no overlaid hit target.
    const gap=Math.min(3/104,sweep*.25);
    const a=start/100*Math.PI*2-Math.PI/2+gap/2;
    const b=a+sweep-gap;
    const arc=document.createElementNS(svgNS,'path');
    arc.setAttribute('d',`M ${120+104*Math.cos(a)} ${120+104*Math.sin(a)} A 104 104 0 ${b-a>Math.PI?1:0} 1 ${120+104*Math.cos(b)} ${120+104*Math.sin(b)}`);
    arc.setAttribute('fill','none');arc.setAttribute('stroke',part.color);arc.setAttribute('stroke-width','32');arc.setAttribute('stroke-linecap','butt');arc.setAttribute('class','ring-segment');
    wire(arc,part,'ring');svg.append(arc);start+=part.percent;
    const segment=node('span',null,'usage-segment');segment.style.width=part.percent+'%';segment.style.background=part.color;wire(segment,part,'bar',false);track.append(segment);
  }
  if(!view.available) {
    const circle=document.createElementNS(svgNS,'circle');
    for(const [key,value] of Object.entries({cx:120,cy:120,r:104,fill:'none',stroke:'var(--track)','stroke-width':32}))circle.setAttribute(key,value);
    svg.append(circle);
  }
  $('donut-arcs').replaceChildren(svg);
  $('fill-label').textContent=percentage+' '+t(view.categories?'estimatedFull':'full');
  $('usage-ratio').textContent=`~${compact(view.used)} / ${compact(view.capacity)} tokens`;
  const legend=$('chart-legend');legend.replaceChildren();
  for (const row of parts) {
    const line=node('div',null,'legend-row');
    const swatch=node('span',null,'legend-swatch');swatch.style.background=row.color;
    line.append(swatch,node('span',partLabel(row),'name'),node('span',row.value==null ? t('unobserved') : (view.categories&&row.id!=='remainder'?'~':'')+compact(row.value),'legend-value'));
    wire(line,row,'legend');legend.append(line);
  }
  $('chart-note').textContent=t(view.categories ? view.overflow?'overflowNote':'visibleNote' : 'requestNote');
  activate(activeChartPart);
  if (focusKey) chartRoot.querySelector(`[data-chart-part="${focusKey.id}"][data-chart-surface="${focusKey.surface}"]`)?.focus({preventScroll:true});
}

function render(data) {
  if (!data?.session) throw Error('报告中没有会话数据');
  const previous = selected;
  report = data; selected = data.session.session_id;
  if (previous && previous !== selected) { opened.clear(); itemCache.clear(); activeChartPart=null; }
  const select = $('sessions');
  select.replaceChildren(...data.sessions.map(s => { const option = node('option', s.label); option.value = s.id; option.title = s.id; return option; }));
  select.value = selected;
  const s = data.session;
  $('title').textContent = data.session_name || t('session',{id:selected.slice(0,8)});
  $('title').title = selected;
  document.title = data.session_name ? data.session_name + ' · Context Explorer' : 'Context Explorer';
  $('repo').textContent = data.repository || t('unknown'); $('window').textContent = compact(s.window_tokens);
  $('used').textContent = compact(s.used_tokens); $('model').textContent = s.model || t('unknown');
  $('updated').textContent = t('updated',{time:new Date(data.checked_at).toLocaleTimeString(language==='zh'?'zh-CN':'en')});
  $('warning').textContent=t('warning');
  $('retention-note').hidden=!data.omitted_entries;
  $('retention-note').textContent=data.omitted_entries?t('retention',{n:data.omitted_entries}):'';
  $('updated').title=t('autoRefresh');
  const tree = $('tree'); tree.replaceChildren();
  const conversationIds = new Set(['messages', 'tool_calls', 'tool_results', 'reasoning_summary', 'compaction']);
  function branch(id, title, items, tokens, cls, color) {
    const details = node('details', null, cls); details.dataset.key = id;
    details.open = opened.has(id) || expandAll;
    const summary = node('summary');
    const symbol = icon(cls === 'turn' ? 'messagesSquare' : categoryIcons[id] || 'messageSquare'); symbol.style.color = contextColors[id] || color || '#85858d';
    summary.append(icon('chevronRight', 'chevron'), symbol, node('span', title, 'name'), node('span', String(items), 'muted'),
      node('span', tokens == null ? t('unobserved') : '~' + count(tokens), 'trailing'));
    details.append(summary);
    details.addEventListener('toggle', () => { details.open ? opened.add(id) : opened.delete(id); });
    return details;
  }
  function leaf(item) {
    const details = node('details', null, 'item'); details.dataset.sequence = item.sequence;
    details.open = opened.has(item.id);
    const header = node('summary');
    header.append(icon('chevronRight', 'chevron'), icon(categoryIcons[item.category] || 'messageSquare'), node('span', entryLabel(item), 'name'), node('span', '~' + count(item.tokens), 'trailing'));
    const body = node('pre', itemCache.has(item.id) ? bodyText(itemCache.get(item.id)) : t('lazy')); details.append(header, body);
    async function load() {
      if (!details.open) { opened.delete(item.id); return; }
      opened.add(item.id);
      if (itemCache.has(item.id)) return;
      const requestedSession = selected;
      try {
        const result = await call('read_context_item', { session_id: selected, item_id: item.id });
        if (selected !== requestedSession) return;
        const value = result._meta.item;
        itemCache.set(item.id, value); body.textContent = bodyText(value);
      } catch { body.textContent = t('itemError'); }
    }
    details.addEventListener('toggle', load);
    if (details.open) load();
    return details;
  }
  // Static context is a separate root; conversation entries stay in log order within each turn.
  for (const id of ['system_prompt', 'tools', 'memory_files', 'skills', 'custom_agents']) {
    const row = s.breakdown.rows.find(r => r.id === id);
    if (!row) continue;
    const group = branch(row.id, label(row.id), row.items, row.tokens, 'category', row.color);
    for (const item of data.entries.filter(e => e.category === id)) group.append(leaf(item));
    const omitted = row.items - data.entries.filter(e => e.category === id).length;
    if (omitted > 0) group.append(node('p', t('omitted',{n:omitted}), 'help'));
    tree.append(group);
  }
  const conversationRows = s.breakdown.rows.filter(r => conversationIds.has(r.id));
  const conversation = branch('conversation', label('conversation'), conversationRows.reduce((n,r) => n+r.items,0),
    s.breakdown.visible_tokens == null ? null : conversationRows.reduce((n,r) => n+(r.tokens || 0),0), 'category', '#cd452a');
  for (const turn of data.turns || []) {
    const group = branch('turn:' + turn.id, turnLabel(turn), turn.items, turn.tokens, 'turn');
    const omitted = turn.items - turn.retained_items;
    if (omitted > 0) group.append(node('p', t('omittedTurn',{n:omitted}), 'help'));
    for (const item of data.entries.filter(e => conversationIds.has(e.category) && e.turn_id === turn.id)) group.append(leaf(item));
    conversation.append(group);
  }
  tree.append(conversation);
  chart();
  const detail = s.details, cost = detail?.cost_estimate;
  $('usage').textContent = t('usage',{tokens:compact(detail?.session_usage?.total_tokens),requests:detail?.recorded_requests || 0});
  $('cost').textContent=cost?.usd==null ? t('costUnknown') : t('cost',{usd:cost.usd.toFixed(2)});
  $('pricing-details').textContent=cost?.price_date?t('pricingDetails',{date:cost.price_date,coverage:t(cost.complete_usage_coverage?'coverageFull':'coveragePartial')}):'';
}
async function call(name, args) {
  if (window.__CONTEXT_EXPLORER_PREVIEW__) return window.__CONTEXT_EXPLORER_PREVIEW__(name, args);
  return app.callServerTool({ name, arguments: args });
}
async function refresh() {
  if (busy || document.hidden) return;
  busy = true; const requested = selected;
  try {
    const result = await call('refresh_context_report', selected ? { session_id: selected } : {});
    if (selected !== requested) return;
    if (result.isError || !result._meta?.report) throw Error('读取失败');
    render(result._meta.report); showError(null); savedSnapshot = null;
  } catch {
    if (!report && savedSnapshot) { render(savedSnapshot); showError('staleSnapshot'); }
    else showError('refreshError');
  }
  finally { busy = false; }
}
// Codex 会把模型调用工具时的结果存进对话历史，重开对话时原样重放；过旧的快照不当作当前数据，只在刷新失败时兜底。
const SNAPSHOT_MAX_AGE_MS = 30000;
let savedSnapshot = null;
function receiveToolResult(value) {
  const age = Date.now() - Date.parse(value.checked_at);
  if (age <= SNAPSHOT_MAX_AGE_MS) { render(value); return; }
  savedSnapshot = value; refresh();
}
$('sessions').addEventListener('change', () => { selected = $('sessions').value; opened.clear(); itemCache.clear(); activeChartPart=null;refresh(); });
$('refresh').addEventListener('click', refresh);
$('chart-mode').addEventListener('change',()=>{activeChartPart=null;chart();});
for(const button of document.querySelectorAll('[data-language]'))button.addEventListener('click',()=>{setLanguage(button.dataset.language);$('language-control').open=false;staticText();if(report)render(report);$('language-toggle').focus();});
for(const button of document.querySelectorAll('[data-theme-choice]'))button.addEventListener('click',()=>{setTheme(button.dataset.themeChoice);$('theme-control').open=false;staticText();$('theme-toggle').focus();});
const controls=[...document.querySelectorAll('.preference')];
for(const control of controls)control.addEventListener('toggle',()=>{if(control.open)for(const other of controls)if(other!==control)other.open=false;});
document.addEventListener('pointerdown',event=>{for(const control of controls)if(!control.contains(event.target))control.open=false;});
document.addEventListener('keydown',event=>{if(event.key==='Escape')for(const control of controls)if(control.open){control.open=false;control.querySelector('summary').focus();}});
document.addEventListener('pointerdown',event=>{if(!event.target.closest('[data-chart-part]')){activeChartPart=null;if(report)chart();}});
$('expand').addEventListener('click', () => {
  expandAll = !expandAll; if (!expandAll) opened.clear();
  for (const category of document.querySelectorAll('.category, .turn')) category.open = expandAll;
  $('expand').textContent = t(expandAll?'collapse':'expand');
});
$('copy').addEventListener('click', async () => {
  if (!report) return;
  const s = report.session;
  const text=t('copyHeader',{name:report.session_name||selected,id:selected,model:s.model||t('unknown'),used:count(s.used_tokens),capacity:count(s.window_tokens)})+'\n'+s.breakdown.rows.map(r=>`${label(r.id)}: ${count(r.tokens)}`).join('\n');
  try { await navigator.clipboard.writeText(text);copied=true;$('copy').textContent=t('copied'); } catch { showError('clipboardError'); }
});
app.ontoolresult = params => { if (params._meta?.report) receiveToolResult(params._meta.report); };
// 面板在后台加载时首次刷新会被跳过，变为可见时立即补上，而不是等下一个 5 秒周期。
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
app.onhostcontextchanged=ctx=>setHostTheme(ctx.theme);
staticText();applyTheme();
if (!window.__CONTEXT_EXPLORER_PREVIEW__) {
  try { await app.connect(); } catch { showError('hostError'); }
}
await refresh(); setInterval(refresh, 5000);
