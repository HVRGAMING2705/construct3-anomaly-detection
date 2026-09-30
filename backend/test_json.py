import sys
sys.path.insert(0, r'C:\Users\Vikranth Reddy\Downloads\Construct3_Project\construct3_remake\backend')
from main import compute_latent
import json
result = compute_latent('conv_base')
print('Keys:', list(result.keys()))
for k, v in result.items():
    if isinstance(v, list):
        print(f'{k}: len={len(v)}, first_type={type(v[0]) if v else "empty"}')
    else:
        print(f'{k}: {type(v)}')
# Try JSON serialization
json_str = json.dumps(result)
print('JSON size:', len(json_str))