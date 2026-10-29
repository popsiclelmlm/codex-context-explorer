"""API-equivalent token cost estimates; never reports ChatGPT plan charges."""
from decimal import Decimal

PRICE_DATE = '2026-10-13'
CATALOG = {
    'gpt-6.1-sol': {
        'input': '2', 'cache_read': '0.10', 'cache_write': '2.50', 'output': '10',
        'long_threshold': 272000, 'long_input_factor': '2', 'long_output_factor': '1.5',
        'source': 'https://developers.openai.com/api/docs/models/gpt-6.1-sol',
    },
}
COMPONENTS = ('input', 'cache_read', 'cache_write', 'output')


def request_cost(model, usage):
    price = CATALOG.get(model)
    if not price or not isinstance(usage, dict):
        return None
    values = [usage.get(k) for k in ('input_tokens', 'cached_input_tokens',
                                    'cache_write_input_tokens', 'output_tokens')]
    if any(type(n) is not int or n < 0 for n in values):
        return None
    input_tokens, cached, written, output = values
    if cached + written > input_tokens:
        return None
    long = input_tokens > price['long_threshold']
    input_factor = Decimal(price['long_input_factor']) if long else Decimal(1)
    output_factor = Decimal(price['long_output_factor']) if long else Decimal(1)
    counts = {'input': input_tokens - cached - written, 'cache_read': cached,
              'cache_write': written, 'output': output}
    costs = {key: Decimal(counts[key]) * Decimal(price[key]) *
             (output_factor if key == 'output' else input_factor) / Decimal(1000000)
             for key in COMPONENTS}
    return {'components': costs, 'usd': sum(costs.values()), 'long_context': long,
            'input_tokens': input_tokens, 'output_tokens': output}


class CostAccumulator:
    def __init__(self):
        self.components = {key: Decimal(0) for key in COMPONENTS}
        self.requests = 0
        self.skipped = 0
        self.long_requests = 0
        self.input_tokens = 0
        self.output_tokens = 0
        self.unpriced_models = set()
        self.models = set()

    def add(self, model, usage):
        result = request_cost(model, usage)
        if result is None:
            self.skipped += 1
            self.unpriced_models.add(model)
            return
        self.requests += 1
        self.models.add(model)
        self.long_requests += int(result['long_context'])
        self.input_tokens += result['input_tokens']
        self.output_tokens += result['output_tokens']
        for key, cost in result['components'].items():
            self.components[key] += cost

    def snapshot(self, session_usage):
        total_tokens = session_usage.get('total_tokens') if session_usage else None
        covered_tokens = self.input_tokens + self.output_tokens
        complete = bool(session_usage and self.requests and not self.skipped and
                        self.input_tokens == session_usage['input_tokens'] and
                        self.output_tokens == session_usage['output_tokens'])
        coverage = round(covered_tokens / total_tokens * 100, 2) if total_tokens else None
        prices = [{'model': model, **CATALOG[model]} for model in sorted(self.models)]
        return {'usd': float(sum(self.components.values())) if self.requests else None,
                'components_usd': {k: float(v) for k, v in self.components.items()},
                'priced_requests': self.requests, 'skipped_requests': self.skipped,
                'long_context_requests': self.long_requests,
                'coverage_percent': coverage, 'complete_usage_coverage': complete,
                'unpriced_models': sorted(self.unpriced_models), 'prices': prices,
                'price_date': PRICE_DATE, 'assumed_tier': 'standard',
                'tier_factors': {'standard': 1, 'fast': 2, 'ultrafast': 6},
                'currency': 'USD', 'billing_type': 'api_equivalent_estimate'}
