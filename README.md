# Construct 3 — Anomaly Detection and Denoising with Autoencoders on Fashion-MNIST

Fresh remake. Trains autoencoders that compress 28×28 clothing images through a
small bottleneck and reconstruct them. Two applications:

1. **Anomaly detection** — train only on normal classes; flag test images with
   high reconstruction error as anomalies. Anomaly class: **Sandal (class 5)**,
   never shown during training.
2. **Denoising** — a convolutional autoencoder trained to recover clean images
   from Gaussian-corrupted inputs.

## Layout

```
models/autoencoders.py   FC / Conv / Denoising autoencoders
models/data.py           Fashion-MNIST splits (one-class setup, seed 42)
scripts/train.py         training CLI
scripts/evaluate.py      metrics + anomaly detection
scripts/figures.py       paper/presentation figures
scripts/run_all.sh       full reproduce pipeline
checkpoints/             saved weights, metrics JSON, error arrays
figures/                 generated figures
docs/                    demo script, paper notes
```

## Quick start

```bash
./scripts/run_all.sh          # full pipeline (~1-2 h on CPU)
python scripts/train.py --model conv --run conv_base --epochs 8
python scripts/evaluate.py --run conv_base --model conv
```

## Environment

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## Results (from the training log)

- Baselines trained on 10,000 normal images, 8 epochs, Adam 1e-3, MSE loss.
- Anomaly threshold = 95th percentile of normal-class reconstruction error.

See `checkpoints/*_metrics.json` for numbers.
