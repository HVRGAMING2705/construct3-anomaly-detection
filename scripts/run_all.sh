#!/bin/bash
# Construct 3 — full reproduce pipeline (fresh remake)
# Trains 3 baselines (8 epochs) + 2 ablations (4 epochs), evaluates, draws figures.
set -e
PY="/home/hatch/workspace/construct3_remake/.venv/bin/python"
cd /home/hatch/workspace/construct3_remake

$PY scripts/train.py --model fc --run fc_base --epochs 8
$PY scripts/train.py --model conv --run conv_base --epochs 8
$PY scripts/train.py --model denoising_conv --run den_base --epochs 8

$PY scripts/train.py --model fc --run fc_no_bn --epochs 4 --no-bn
$PY scripts/train.py --model fc --run fc_no_drop --epochs 4 --dropout 0.0

for pair in "fc_base fc" "conv_base conv" "den_base denoising_conv" "fc_no_bn fc" "fc_no_drop fc"; do
  set -- $pair
  $PY scripts/evaluate.py --run $1 --model $2
done

$PY scripts/figures.py --runs fc_base,conv_base,den_base --models fc,conv,denoising_conv
echo "ALL DONE"
