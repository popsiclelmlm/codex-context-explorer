"""Read local session reports. UI text remains outside model-visible tool results."""
import json
import os
import sqlite3
from pathlib import Path
import sys
import traceback
from collections import deque

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / 'backend'))
import monitor as core


CONVERSATION = {'messages', 'tool_calls', 'tool_results', 'reasoning_summary', 'compaction'}


class ExplorerBreakdown(core.Breakdown):
    def __init__(self):
        super().__init__()
        self.entries = deque(maxlen=500)
        self.serial = 0
        self.record_index = 0
        self.label = '文本片段'
        self.timestamp = None
        self.turn = {'id': 'before-user', 'label': 'Before first user message', 'number': None}
        self.turns = {}
        self.call_names = {}
        self.item_kind = 'context'

    def add(self, category, text):
        if not isinstance(text, str) or not text.strip():
            return
        self.serial += 1
        counting = self.counting()
        targets = []
        if category in CONVERSATION:
            turn = self.turns.setdefault(self.turn['id'], {**self.turn, 'items': 0, 'tokens': 0 if counting else None})
            turn['items'] += 1
            if counting:
                targets.append((turn, 'tokens'))
        entry = {'turn_id': self.turn['id'], 'kind': self.item_kind, 'sequence': self.record_index, 'id': f'{self.record_index}:{self.serial}',
            'category': category, 'label': self.label, 'timestamp': self.timestamp,
            'tokens': 0 if counting else None,
            'characters': len(text), 'text': text[:8000], 'truncated': len(text) > 8000}
        if counting:
            targets.append((entry, 'tokens'))
        self.entries.append(entry)
        super().add(category, text, *targets)


    def item(self, item):
        if not isinstance(item, dict):
            return
        kind, role = item.get('type'), item.get('role')
        self.item_kind = kind or 'context'
        if kind == 'message':
            self.label = {'user': 'User Message', 'assistant': 'Agent Message',
                          'developer': 'Context Message', 'system': 'System Message'}.get(role, 'Context Message')
        elif kind in ('function_call', 'custom_tool_call'):
            name = item.get('name') or 'unknown'
            if item.get('call_id'):
                self.call_names[item['call_id']] = name
            self.label = 'Tool: ' + name
        elif kind in ('function_call_output', 'custom_tool_call_output'):
            self.label = 'Tool Result: ' + self.call_names.get(item.get('call_id'), 'unknown')
        elif kind == 'reasoning':
            self.label = 'Reasoning Summary'
        super().item(item)


class ExplorerReader(core.SessionReader):
    def reset(self):
        super().reset()
        self.breakdown = ExplorerBreakdown()
        self.record_index = 0
        self.repository = None
        self.turn_number = 0
        self.current_turn = None
        self.turn_ids = {}
        self.explicit_turns = False

    def consume(self, record):
        self.record_index += 1
        payload = record.get('payload', {})
        kind = payload.get('type') if isinstance(payload, dict) else None
        if record.get('type') == 'session_meta' and isinstance(payload.get('cwd'), str):
            self.repository = Path(payload['cwd']).name
        if not isinstance(payload, dict):
            return
        if (record.get('type') == 'event_msg' and kind == 'task_started') or record.get('type') == 'turn_context':
            identifier = payload.get('turn_id')
            if identifier:
                self.explicit_turns = True
                if identifier not in self.turn_ids:
                    self.turn_number += 1
                    self.turn_ids[identifier] = self.turn_number
                self.current_turn = {'id': identifier, 'number': self.turn_ids[identifier],
                                     'label': 'Turn ' + str(self.turn_ids[identifier])}
        elif (record.get('type') == 'response_item' and kind == 'message'
              and payload.get('role') == 'user' and not self.explicit_turns):
            self.turn_number += 1
            self.current_turn = {'id': 'inferred:' + str(self.turn_number), 'number': self.turn_number,
                                 'label': 'Turn ' + str(self.turn_number) + '（按用户消息推断）'}
        if isinstance(self.breakdown, ExplorerBreakdown):
            self.breakdown.record_index = self.record_index
            self.breakdown.timestamp = record.get('timestamp')
            if self.current_turn:
                self.breakdown.turn = self.current_turn
        super().consume(record)
        if record.get('type') == 'compacted':
            self.breakdown = ExplorerBreakdown()
            self.breakdown.record_index = self.record_index
            self.breakdown.timestamp = record.get('timestamp')
            self.breakdown.label = '压缩摘要'
            self.breakdown.item_kind = 'compaction'
            self.breakdown.turn = {'id': 'history:' + str(self.record_index), 'number': None,
                                   'label': '压缩后的保留历史（原轮次未知）'}
            history = payload.get('replacement_history')
            if isinstance(history, list):
                for item in history:
                    self.breakdown.item(item)
            else:
                self.breakdown.add('compaction', payload.get('message', ''))


class Explorer:
    def __init__(self):
        self.monitor = core.Monitor(core.SESSIONS)

    def session_names(self):
        ids = [sid for sid, _ in self.monitor.paths]
        wanted, names = set(ids), {}
        home = core.SESSIONS.parent
        # The JSONL index is a fallback; current database names take precedence.
        try:
            with (home / 'session_index.jsonl').open() as source:
                for line in source:
                    try:
                        row = json.loads(line)
                    except (ValueError, TypeError):
                        continue
                    if not isinstance(row, dict):
                        continue
                    sid, name = row.get('id'), row.get('thread_name')
                    if sid in wanted and isinstance(name, str) and name.strip():
                        names[sid] = name.strip()
        except OSError:
            pass
        versions = [f for f in home.glob('state_*.sqlite') if f.stem[6:].isdigit()]
        if versions and ids:
            database = max(versions, key=lambda f: int(f.stem[6:]))
            connection = None
            try:
                connection = sqlite3.connect(database.as_uri() + '?mode=ro', uri=True, timeout=0.2)
                columns = {r[1] for r in connection.execute('PRAGMA table_info(threads)')}
                if {'id', 'name'} <= columns:
                    query = 'SELECT id, name FROM threads WHERE id IN (' + ','.join('?' for _ in ids) + ')'
                    for sid, name in connection.execute(query, ids):
                        if isinstance(name, str) and name.strip():
                            names[sid] = name.strip()
            except (OSError, sqlite3.Error):
                pass
            finally:
                if connection is not None:
                    connection.close()
        return names

    def reader(self, sid):
        self.monitor.discover()
        selected = next(((s, p) for s, p in self.monitor.paths if s == sid), None)
        if sid is None and self.monitor.paths:
            selected = self.monitor.paths[0]
        if not selected:
            raise ValueError('未找到所选本地主会话，请刷新会话列表。')
        actual_sid, path = selected
        reader = self.monitor.readers.setdefault(path, ExplorerReader(path))
        reader.update()
        return actual_sid, reader

    def request(self, op, args):
        sid, reader = self.reader(args.get('session_id'))
        if op == 'item':
            entry = next((e for e in reader.breakdown.entries if e['id'] == args.get('item_id')), None)
            if not entry:
                raise ValueError('该条目已被压缩或不在最近 500 个片段内，请刷新报告。')
            return {'session_id': sid, **entry}
        if op != 'report':
            raise ValueError('Unsupported operation')
        session = reader.snapshot()
        names = self.session_names()
        entries = [{k: v for k, v in e.items() if k != 'text'} for e in reader.breakdown.entries]
        retained = {}
        for entry in entries:
            if entry['category'] in CONVERSATION:
                retained[entry['turn_id']] = retained.get(entry['turn_id'], 0) + 1
        turns = [{**turn, 'retained_items': retained.get(turn['id'], 0)}
                 for turn in reader.breakdown.turns.values()]
        return {'session_name': names.get(sid), 'turns': turns,
                'sessions': [{'id': s, 'label': names.get(s) or s} for s, _ in self.monitor.paths],
                'session': session, 'repository': reader.repository,
                'entries': entries, 'retained_entry_limit': 500,
                'omitted_entries': max(0, reader.breakdown.serial - len(entries)),
                'checked_at': core.now()}


backlog = deque()
token_sequence = 0


def host_counter(texts):
    """请宿主（server.mjs）用打包的 o200k_base 分词；等待期间到达的普通请求先排队。"""
    global token_sequence
    token_sequence += 1
    print(json.dumps({'tokenize': token_sequence, 'texts': texts}, ensure_ascii=False), flush=True)
    while True:
        line = sys.stdin.readline()
        if not line:
            raise EOFError('Host closed the collector input')
        message = json.loads(line)
        if message.get('tokens_for') == token_sequence:
            if not isinstance(message.get('tokens'), list):
                raise ValueError('Host could not count tokens')
            return message['tokens']
        backlog.append(line)


if __name__ == '__main__':
    if os.environ.get('CONTEXT_EXPLORER_TOKENIZER') == 'host':
        core.Breakdown.external = host_counter
    explorer = Explorer()
    while True:
        line = backlog.popleft() if backlog else sys.stdin.readline()
        if not line:
            break
        request = None
        try:
            request = json.loads(line)
            result = explorer.request(request.get('op'), request.get('args') or {})
            reply = {'id': request['id'], 'result': result}
        except Exception:
            # 详细原因只写入 stderr（宿主日志），返回给界面的仍是通用提示。
            traceback.print_exc(file=sys.stderr)
            reply = {'id': request.get('id') if isinstance(request, dict) else None,
                     'error': '无法读取请求的本地报告或条目。'}
        print(json.dumps(reply, ensure_ascii=False), flush=True)
