import sys
sys.path.insert(0, '.')
from main import LATENT_CACHE, THRESHOLD_CACHE, METRICS_CACHE, MODEL_CACHE
LATENT_CACHE.clear()
THRESHOLD_CACHE.clear()
METRICS_CACHE.clear()
MODEL_CACHE.clear()
print('Caches cleared')