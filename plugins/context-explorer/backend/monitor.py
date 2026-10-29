"""Read-only parsing of local Codex session logs: usage, context breakdown and discovery."""
import json
import os
import re
from pathlib import Path
import sys
import time
from datetime import datetime, timezone
from pricing import CostAccumulator

ROOT = Path(__file__).resolve().parent
SESSIONS = Path.home() / '.codex' / 'sessions'
CATEGORIES = (
    ('messages', 'Messages · 对话消息', '#3288df'),
    ('tool_calls', 'Tool calls · 工具调用', '#ce842c'),
    ('tool_results', 'Tool results · 工具结果', '#e8a344'),
    ('skills', 'Skills · 可见技能目录', '#25a77c'),
    ('system_prompt', 'System prompt · 可见系统指令', '#b39722'),
    ('memory_files', 'Memory files · 项目规则', '#818780'),
    ('custom_agents', 'Custom agents · 代理指令', '#846ec8'),
    ('tools', 'Tools / MCP · 可见工具说明', '#cf6b8f'),
    ('reasoning_summary', 'Reasoning · 可见推理摘要', '#74959a'),
    ('compaction', 'Compaction · 压缩摘要', '#6b8552'),
)


class Breakdown:
    """Tokenize visible text only; never infer a hidden category from a residual."""
    encoder = None
    attempted = False

    def __init__(self):
        self.buckets = {key: {'tokens': 0, 'items': 0} for key, _, _ in CATEGORIES}
        self.hidden_items = 0
        if not Breakdown.attempted:
            Breakdown.attempted = True
            try:
                sys.path.insert(0, str(ROOT / 'vendor'))
                os.environ['TIKTOKEN_CACHE_DIR'] = str(ROOT / 'tokenizer-cache')
                # Require the pre-installed cache; runtime never downloads a tokenizer.
                if any((ROOT / 'tokenizer-cache').glob('*')):
                    import tiktoken
                    import tiktoken.load
                    original_read = tiktoken.load.read_file
                    def offline_only(unused):
                        raise OSError('Tokenizer cache missing or corrupt; runtime downloads disabled')
                    try:
                        tiktoken.load.read_file = offline_only
                        Breakdown.encoder = tiktoken.get_encoding('o200k_base')
                    finally:
                        tiktoken.load.read_file = original_read
            except (ImportError, OSError, ValueError):
                pass

    def add(self, category, text):
        if not isinstance(text, str) or not text.strip():
            return
        if self.encoder is not None:
            self.buckets[category]['tokens'] += len(self.encoder.encode(text, disallowed_special=()))
        self.buckets[category]['items'] += 1

    def message(self, text, role):
        default = 'system_prompt' if role in ('system', 'developer') else 'messages'
        tags = {'skills_instructions': 'skills', 'multi_agent_role': 'custom_agents',
                'multi_agent_mode': 'custom_agents', 'tools': 'tools',
                'mcp_server_instructions': 'tools'} if role in ('system', 'developer') else {}
        if '# AGENTS.md instructions for ' in text[:256]:
            tags['INSTRUCTIONS'] = 'memory_files'
        if not tags:
            self.add(default, text)
            return
        pattern = re.compile(r'<(' + '|'.join(map(re.escape, tags)) + r')>(.*?)</\1>', re.S)
        cursor = 0
        for match in pattern.finditer(text):
            self.add(default, text[cursor:match.start()])
            self.add(tags[match.group(1)], match.group(0))
            cursor = match.end()
        self.add(default, text[cursor:])

    def blocks(self, content, category=None, role=None):
        if isinstance(content, str):
            self.message(content, role) if role else self.add(category, content)
        elif isinstance(content, list):
            for block in content:
                if not isinstance(block, dict):
                    continue
                if isinstance(block.get('text'), str):
                    self.message(block['text'], role) if role else self.add(category, block['text'])
                elif 'image' in str(block.get('type', '')) or block.get('type') in ('audio', 'input_audio'):
                    self.hidden_items += 1

    def item(self, item):
        if not isinstance(item, dict):
            return
        kind = item.get('type')
        if kind == 'message':
            self.blocks(item.get('content'), role=item.get('role', 'user'))
        elif kind in ('function_call', 'custom_tool_call'):
            self.add('tool_calls', item.get('arguments', item.get('input', '')))
        elif kind in ('function_call_output', 'custom_tool_call_output'):
            self.blocks(item.get('output'), category='tool_results')
        elif kind == 'reasoning':
            self.blocks(item.get('summary'), category='reasoning_summary')
            if item.get('encrypted_content'):
                self.hidden_items += 1

    def snapshot(self):
        available = self.encoder is not None
        total = sum(b['tokens'] for b in self.buckets.values()) if available else None
        rows = []
        for key, label, color in CATEGORIES:
            bucket = self.buckets[key]
            tokens = bucket['tokens'] if available and bucket['items'] else None
            percent = round(tokens / total * 100, 2) if tokens is not None and total else None
            rows.append({'id': key, 'label': label, 'color': color, 'tokens': tokens,
                         'percent_visible': percent, 'items': bucket['items']})
        return {'rows': rows, 'visible_tokens': total, 'hidden_items': self.hidden_items,
                'tokenizer': 'o200k_base (proxy)' if available else None,
                'scope': 'visible_text_since_last_compaction',
                'complete_current_context': False}


def now():
    return datetime.now(timezone.utc).isoformat()


def number(value):
    return value if type(value) is int and value >= 0 else None


def safe_usage(value):
    if not isinstance(value, dict):
        return None
    result = {k: number(value.get(k)) for k in
              ('input_tokens', 'output_tokens', 'total_tokens', 'cached_input_tokens',
               'cache_write_input_tokens', 'reasoning_output_tokens')}
    if result['input_tokens'] is None or result['output_tokens'] is None:
        return None
    # Output counts already include reasoning. Cached input is part of input.
    result['total_tokens'] = result['input_tokens'] + result['output_tokens']
    return result


class SessionReader:
    def __init__(self, path):
        self.path = path
        self.identity = None
        self.reset()

    def reset(self):
        self.offset = 0
        self.meta = {}
        self.model = None
        self.usage = None
        self.window = None
        self.updated = None
        self.compactions = 0
        self.compacted_at = None
        self.waiting_after_compaction = False
        self.malformed = 0
        self.breakdown = Breakdown()
        self.session_usage = None
        self.session_usage_at = None
        self.turn_usage = None
        self.turn_usage_at = None
        self.started_at = None
        self.active_turns = {}
        self.completed_turns = {}
        self.request_ids = set()
        self.request_count = 0
        self.models_usage = {}
        self.cost = CostAccumulator()

    def consume(self, record):
        kind = record.get('type')
        payload = record.get('payload')
        if not isinstance(payload, dict):
            return
        timestamp = record.get('timestamp')
        if kind == 'session_meta':
            self.meta = {k: payload.get(k) for k in ('id', 'source', 'cli_version')}
            self.started_at = timestamp
        elif kind == 'turn_context':
            model = payload.get('model')
            if self.model and model != self.model:
                self.window = None
                self.usage = None
                self.updated = None
            self.model = model
        elif kind == 'compacted':
            self.compactions += 1
            self.compacted_at = timestamp
            self.usage = None
            self.updated = None
            self.waiting_after_compaction = True
            self.breakdown = Breakdown()
            history = payload.get('replacement_history')
            if isinstance(history, list):
                for item in history:
                    self.breakdown.item(item)
            else:
                self.breakdown.add('compaction', payload.get('message', ''))
        elif kind == 'response_item':
            self.breakdown.item(payload)
        elif kind == 'token_usage_record':
            cumulative = safe_usage(payload.get('thread_token_usage'))
            current_turn = safe_usage(payload.get('turn_token_usage'))
            if cumulative:
                self.session_usage, self.session_usage_at = cumulative, timestamp
            if current_turn:
                self.turn_usage, self.turn_usage_at = current_turn, timestamp
            request = safe_usage(payload.get('usage'))
            identifier = payload.get('response_id')
            if request and (not identifier or identifier not in self.request_ids):
                if identifier:
                    self.request_ids.add(identifier)
                self.request_count += 1
                model = self.model or 'unknown'
                total = self.models_usage.setdefault(model, {'input_tokens': 0, 'output_tokens': 0, 'requests': 0})
                total['input_tokens'] += request['input_tokens']
                total['output_tokens'] += request['output_tokens']
                total['requests'] += 1
                self.cost.add(model, request)
        elif kind == 'event_msg' and payload.get('type') == 'task_started':
            identifier = payload.get('turn_id')
            started = number(payload.get('started_at'))
            if identifier and started is not None:
                self.active_turns[identifier] = started
            self.turn_usage, self.turn_usage_at = None, None
        elif kind == 'event_msg' and payload.get('type') == 'task_complete':
            identifier = payload.get('turn_id')
            self.active_turns.pop(identifier, None)
            duration = number(payload.get('duration_ms'))
            if identifier and duration is not None:
                self.completed_turns[identifier] = duration
        elif kind == 'event_msg' and payload.get('type') in ('turn_aborted', 'task_aborted'):
            self.active_turns.pop(payload.get('turn_id'), None)
        elif kind == 'event_msg' and payload.get('type') == 'token_count':
            info = payload.get('info')
            if not isinstance(info, dict):
                return
            window = number(info.get('model_context_window'))
            if window:
                self.window = window
            usage = safe_usage(info.get('last_token_usage'))
            if usage:
                self.usage, self.updated = usage, timestamp
                self.waiting_after_compaction = False
            cumulative = safe_usage(info.get('total_token_usage'))
            if cumulative:
                self.session_usage, self.session_usage_at = cumulative, timestamp

    def update(self):
        stat = self.path.stat()
        identity = (stat.st_dev, stat.st_ino)
        if identity != self.identity or stat.st_size < self.offset:
            self.reset()
            self.identity = identity
        with self.path.open('rb') as stream:
            stream.seek(self.offset)
            while True:
                start = stream.tell()
                line = stream.readline()
                if not line:
                    break
                if not line.endswith(b'\n'):
                    # A writer may still be appending the JSON record.
                    self.offset = start
                    break
                self.offset = stream.tell()
                try:
                    record = json.loads(line)
                    if isinstance(record, dict):
                        self.consume(record)
                    else:
                        self.malformed += 1
                except (ValueError, UnicodeError):
                    self.malformed += 1

    def snapshot(self):
        usage = self.usage
        used = usage['total_tokens'] if usage else None
        remaining = max(0, self.window - used) if self.window and used is not None else None
        percent = round(used / self.window * 100, 2) if self.window and used is not None else None
        elapsed = None
        try:
            elapsed = max(0, time.time() - datetime.fromisoformat(self.started_at.replace('Z', '+00:00')).timestamp())
        except (ValueError, AttributeError):
            pass
        running = sum(max(0, time.time() - start) for start in self.active_turns.values())
        duration = sum(self.completed_turns.values()) / 1000 + running
        return {
            'session_id': self.meta.get('id'), 'model': self.model,
            'window_tokens': self.window, 'usage': usage, 'used_tokens': used,
            'remaining_tokens': remaining, 'used_percent': percent,
            'usage_at': self.updated if usage else None,
            'compaction_count': self.compactions, 'compacted_at': self.compacted_at,
            'waiting_after_compaction': self.waiting_after_compaction, 'malformed_records': self.malformed,
            'basis': 'latest_request_input_plus_output',
            'breakdown': self.breakdown.snapshot(),
            'details': {'session_usage': self.session_usage, 'session_usage_at': self.session_usage_at,
                        'turn_usage': self.turn_usage, 'turn_usage_at': self.turn_usage_at,
                        'elapsed_seconds': elapsed,
                        'running_seconds': duration if self.completed_turns or self.active_turns else None,
                        'completed_turns': len(self.completed_turns), 'active_turns': len(self.active_turns),
                        'recorded_requests': self.request_count, 'models': self.models_usage,
                        'cost': None, 'cost_estimate': self.cost.snapshot(self.session_usage),
                        'api_seconds': None},
        }


class Monitor:
    def __init__(self, sessions):
        self.sessions = sessions
        self.paths = []
        # monotonic() 的起点因平台和版本而异（macOS 上的 Python 3.9 从进程启动约 0 秒算起），首次必须扫描。
        self.last_discovery = None
        self.readers = {}

    def discover(self):
        if self.last_discovery is not None and time.monotonic() - self.last_discovery < 5:
            return
        candidates = []
        for path in self.sessions.glob('*/*/*/rollout-*.jsonl'):
            try:
                candidates.append((path.stat().st_mtime, path))
            except OSError:
                continue
        paths = []
        for _, path in sorted(candidates, reverse=True):
            try:
                with path.open('rb') as stream:
                    record = json.loads(stream.readline())
                meta = record.get('payload', {})
                if record.get('type') != 'session_meta' or isinstance(meta.get('source'), dict):
                    continue
                sid = meta.get('id')
                if not isinstance(sid, str):
                    continue
                paths.append((sid, path))
                if len(paths) == 20:
                    break
            except (OSError, ValueError, AttributeError):
                continue
        self.paths = paths
        self.last_discovery = time.monotonic()
        self.readers = {p: r for p, r in self.readers.items() if p in dict(paths).values()}
