import sys
sys.path.insert(0, r'C:\Users\Vikranth Reddy\Downloads\Construct3_Project\construct3_remake\backend')
from main import compute_latent
try:
    result = compute_latent('conv_base')
    print('Success:', list(result.keys()))
except Exception as e:
    import traceback
    traceback.print_exc()