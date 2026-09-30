import sys
sys.path.insert(0, r'C:\Users\Vikranth Reddy\Downloads\Construct3_Project\construct3_remake\backend')
import asyncio
from main import compute_latent

async def test():
    try:
        result = compute_latent('conv_base')
        print('Success:', list(result.keys()))
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test())