import traceback
import sys
sys.path.insert(0, '.')
from main import compute_latent
try:
    result = compute_latent('conv_base')
    print('Success:', list(result.keys()))
except Exception as e:
    traceback.print_exc()