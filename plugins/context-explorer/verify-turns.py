"""Check chronology, explicit turn boundaries, call labels, retention and compaction."""
from pathlib import Path
from bridge import ExplorerReader, CONVERSATION

def record(reader, typ, payload):
    reader.consume({'type': typ, 'timestamp': '2026-10-29T00:00:00Z', 'payload': payload})
def msg(role, text):
    return {'type':'message','role':role,'content':[{'type':'input_text','text':text}]}
r=ExplorerReader(Path('/tmp/context-explorer-fixture'))
record(r,'response_item',msg('assistant','Before user'))
record(r,'event_msg',{'type':'task_started','turn_id':'one'})
record(r,'response_item',msg('user','First'))
record(r,'turn_context',{'turn_id':'one','model':'test'})
record(r,'response_item',msg('user','Additional context in same turn'))
record(r,'response_item',{'type':'function_call','name':'Read','call_id':'read1','arguments':'{}'})
record(r,'response_item',{'type':'function_call','name':'Glob','call_id':'glob1','arguments':'{}'})
record(r,'response_item',{'type':'function_call_output','call_id':'glob1','output':'glob result'})
record(r,'response_item',{'type':'function_call_output','call_id':'read1','output':'read result'})
record(r,'event_msg',{'type':'task_started','turn_id':'two'})
record(r,'turn_context',{'turn_id':'two','model':'test'})
record(r,'response_item',msg('user','Second'))
e=list(r.breakdown.entries)
assert [v['label'] for v in e[3:7]]==['Tool: Read','Tool: Glob','Tool Result: Glob','Tool Result: Read']
assert [v['sequence'] for v in e]==sorted(v['sequence'] for v in e)
assert e[0]['turn_id']=='before-user' and e[-1]['turn_id']=='two'
assert list(r.breakdown.turns)==['before-user','one','two']
assert r.turn_number==2 and r.breakdown.turns['one']['items']==6
for i in range(510):record(r,'response_item',msg('assistant','continuation'))
assert len(r.breakdown.entries)==500 and r.breakdown.turns['two']['items']==511
record(r,'compacted',{'replacement_history':[msg('assistant','preserved summary')]})
assert list(r.breakdown.turns)[0].startswith('history:')
assert '原轮次未知' in next(iter(r.breakdown.turns.values()))['label']
record(r,'response_item',msg('assistant','after compact'))
assert list(r.breakdown.entries)[-1]['turn_id']=='two'
assert r.breakdown.turns['two']['items']==1
if r.breakdown.encoder:
    total=sum(row['tokens'] or 0 for row in r.breakdown.snapshot()['rows'] if row['id'] in CONVERSATION)
    assert total==sum(t['tokens'] for t in r.breakdown.turns.values())
fallback=ExplorerReader(Path('/tmp/context-explorer-fallback'))
for text in ['a','b']:record(fallback,'response_item',msg('user',text))
assert fallback.turn_number==2
token_status = 'token totals checked' if r.breakdown.encoder else 'token totals skipped (tokenizer/cache unavailable)'
print('PASS: chronology; native and inferred turns; matched tool results; retention; compaction; ' + token_status + '.')
