const text = {
  info:['统计口径','Data details'], model:['模型','Model'], retention:['已省略 {n} 个较早条目','{n} earlier entries omitted'], autoRefresh:['页面可见时每 5 秒刷新','Refreshes every 5 seconds while visible'], pricingMethod:['参考费用按历史 API 单价和 Standard 档位计算，不代表订阅账单或额度扣减。','Reference cost uses historical API rates and the Standard tier; it is not a subscription bill or quota deduction.'], pricingDetails:['核价 {date} · {coverage}','Prices checked {date} · {coverage}'],
  language:['语言','Language'], theme:['主题','Theme'], system:['跟随系统','System'], light:['浅色','Light'], dark:['深色','Dark'],
  eyebrow:["上下文报告","Context Usage Report"],
  chooseSession:['默认选择最近活动的主会话；可手动切换','Defaults to the most recently active main session; select another below'], sessionSelector:['选择会话','Select session'],
  repository:['项目','Repository'], window:['上下文窗口','Context size'], recentTokens:['最近请求 tokens','Recent request tokens'],
  intro:['查看本地会话用量与可见文本组成。对话按轮次组织，展开条目才读取正文；页面刷新与展开无需模型回答。','Inspect local usage and visible context. Messages and tools follow conversation turns. Text loads on expansion; refreshing and expanding do not invoke a model.'],
  contextUsage:['上下文占用','Context Usage'], viewDetails:['查看明细','View report'], chartBasis:['图表统计口径','Chart basis'],
  visibleMode:["可见文本 / 窗口","Visible text / window"], requestMode:["最近请求 / 窗口","Latest request / window"],
  treeHelp:['上下文说明按模块展示；对话按轮次和日志中的先后顺序展开。','Context is grouped by module; conversation entries follow their original order within each turn.'],
  expand:['展开全部','Expand all'], collapse:['收起全部','Collapse all'], refresh:['刷新','Refresh'], copy:['复制摘要','Copy summary'], copied:['已复制','Copied'],
  unknown:['未知','Unknown'], unobserved:['未观察','Not observed'], session:['会话 {id}','Session {id}'],
  updated:["更新于 {time}","Updated {time}"],
  warning:["可见文本使用本地 o200k_base 分词，可能与模型实际分词不同。隐藏指令、图片和加密推理无法完整计入。","Visible text is counted locally with o200k_base and may differ from the model tokenizer. Hidden instructions, images and encrypted reasoning are not fully represented."],
  omittedWarning:['仅列出最近 500 个片段，另有 {n} 个更早片段未列出；汇总仍包含已读取文本。','Only the latest 500 fragments are listed; {n} earlier fragments are omitted. Totals still include previously read text.'],
  omitted:['{n} 个更早片段未保留正文。','Text is no longer retained for {n} earlier fragments.'], omittedTurn:['本轮另有 {n} 个更早片段未保留正文，仍计入本轮总量。','Text is no longer retained for {n} earlier fragments in this turn; they remain included in its totals.'],
  lazy:['展开后读取此片段…','Expand to read this fragment…'], truncated:['…仅显示前 8000 字符','…Only the first 8,000 characters are shown'], itemError:['条目已过期或无法读取，请刷新报告。','This fragment has expired or could not be read. Refresh the report.'],
  turnHelp:['轮次 → 消息、工具调用与结果，按日志顺序展示。优先使用 turn_id；压缩历史无法恢复的原轮次单独标注。','Turns contain messages, tool calls and results in log order. Native turn IDs take priority; compacted history with unknown turns is labeled separately.'],
  turn:['第 {n} 轮','Turn {n}'], inferredTurn:['第 {n} 轮（按用户消息推断）','Turn {n} (inferred from user messages)'], beforeUser:['首条用户消息之前','Before first user message'], history:['压缩后的保留历史（原轮次未知）','Retained compacted history (original turns unknown)'],
  userMessage:['用户消息','User Message'], agentMessage:['助手消息','Agent Message'], contextMessage:['上下文消息','Context Message'], systemMessage:['系统消息','System Message'], toolCall:['工具调用：{name}','Tool: {name}'], toolResult:['工具结果：{name}','Tool Result: {name}'], fragment:['文本片段','Text fragment'],
  'cat.system_prompt':['系统提示词','System prompt'], 'cat.tools':['工具 / MCP 定义','Tool / MCP definitions'], 'cat.memory_files':['项目规则','Rules'], 'cat.skills':['技能','Skills'], 'cat.custom_agents':['子代理定义','Subagent definitions'], 'cat.conversation':['对话记录','Conversation'], 'cat.messages':['对话消息','Messages'], 'cat.tool_calls':['工具调用','Tool calls'], 'cat.tool_results':['工具结果','Tool results'], 'cat.reasoning_summary':['可见推理摘要','Reasoning summary'], 'cat.compaction':['压缩摘要','Compaction summary'],
  fullEstimate:["已用","Full"], fullRequest:["已用","Full"], full:['已用','Full'], estimatedFull:["已用","Full"], recentRequest:['最近请求（日志快照）','Latest request (recorded)'], remainder:["未分配","Unallocated"], remaining:['剩余窗口容量','Remaining window capacity'],
  chartLabel:['上下文占用图','Context usage chart'], share:['{name}：占窗口 {percent}，{tokens} tokens','{name}: {percent} of window, {tokens} tokens'],
  visibleNote:["彩色区域表示可见文本占窗口的比例；灰色区域可能包含未观察内容。","Colors show visible text as a share of the window; gray may include unseen content."],
  overflowNote:["可见文本统计超过窗口，图形按组成铺满显示，原始计数不变。","Visible text counts exceed the window; the ring shows composition and retains the original counts."],
  requestNote:['最近请求的输入 + 输出日志快照；剩余容量未扣除下次输出预留。','Recorded input + output for the latest request. Remaining capacity does not reserve space for the next output.'],
  noObservation:['日志未提供该项统计','This value was not observed in local logs'],
  usage:['会话累计 {tokens} tokens · 已记录 {requests} 次请求','Session total: {tokens} tokens · {requests} recorded requests'],
  costUnknown:["API 参考费用：未知","API-rate reference: unknown"],
  cost:["API 参考费用 ${usd} USD","API-rate reference ${usd} USD"],
  coverageFull:['已记录用量覆盖完整','all recorded usage covered'], coveragePartial:['仅已定价部分','priced usage only'],
  refreshError:['无法读取本地采集器，请检查插件连接后重试。','Cannot read the local collector. Check the plugin connection and retry.'], staleSnapshot:['无法刷新，当前显示的是之前保存的快照。','Cannot refresh; showing a previously saved snapshot.'], hostError:['请从 Context Explorer 插件入口打开此面板。','Open this panel from the Context Explorer plugin.'], clipboardError:['浏览器未提供剪贴板权限。','Clipboard access is not available.'],
  copyHeader:["会话 {name}\nID {id}\n模型 {model}\n最近请求 {used} / {capacity} tokens\n可见文本（本地分词）：","Session {name}\nID {id}\nModel {model}\nLatest request {used} / {capacity} tokens\nVisible text (local tokenization):"],
};
function saved(key,fallback) { try { return localStorage.getItem('context-explorer-'+key) || fallback; } catch { return fallback; } }
export let language = saved('language',navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en');
if (!['zh','en'].includes(language)) language='en';
export function t(key,values={}) { return (text[key]?.[language==='zh'?0:1] || key).replace(/\{(\w+)\}/g,(_,name)=>values[name] ?? '{'+name+'}'); }
export function setLanguage(value) { language=value==='zh'?'zh':'en'; try { localStorage.setItem('context-explorer-language',language); } catch {} }
export let themeMode=saved('theme','system');
if (!['system','light','dark'].includes(themeMode)) themeMode='system';
let hostTheme=null;
const darkQuery=matchMedia('(prefers-color-scheme: dark)');
export function applyTheme() { document.documentElement.dataset.theme=themeMode==='system' ? hostTheme || (darkQuery.matches?'dark':'light') : themeMode; }
export function setTheme(value) { themeMode=['system','light','dark'].includes(value)?value:'system';try { localStorage.setItem('context-explorer-theme',themeMode); } catch {} applyTheme(); }
export function setHostTheme(value) { hostTheme=['light','dark'].includes(value)?value:null;applyTheme(); }
darkQuery.addEventListener('change',()=>{if(themeMode==='system')applyTheme();});
