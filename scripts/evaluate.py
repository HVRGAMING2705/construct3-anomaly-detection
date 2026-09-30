# Construct 3 — evaluation script (fresh implementation)
# Computes: MSE/MAE on test_normal; anomaly scores (per-image MSE);
# threshold = 95th percentile of normal errors; precision/recall/F1,
# ROC-AUC, PR-AUC; saves metrics + per-image errors for figures.
# Usage: python scripts/evaluate.py --run fc_base --model fc [--noise-std 0.3]

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import (precision_recall_fscore_support, roc_auc_score,
                             average_precision_score)

from models.autoencoders import (FCAutoencoder, ConvAutoencoder,
                                 DenoisingAutoencoder, set_seed)
from models.data import build_splits

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CKPT = os.path.join(ROOT, "checkpoints")


def build_model(model_type, cfg):
    if model_type == "fc":
        return FCAutoencoder(latent_dim=cfg["latent"], use_bn=not cfg["no_bn"],
                             dropout=cfg["dropout"])
    if model_type == "conv":
        return ConvAutoencoder(latent_dim=cfg["latent"])
    backbone = ConvAutoencoder(latent_dim=cfg["latent"])
    return DenoisingAutoencoder(backbone, noise_std=cfg.get("noise_std", 0.3))


@torch.no_grad()
def per_image_mse(model, loader, device, denoising=False):
    errs, labels = [], []
    model.eval()
    for x, y in loader:
        x = x.to(device)
        if denoising:
            out = model.backbone(x)  # clean reconstruction at eval
        else:
            out = model(x)
        se = ((out - x) ** 2).mean(dim=(1, 2, 3)).cpu().numpy()
        errs.append(se)
        labels.append(y.numpy())
    return np.concatenate(errs), np.concatenate(labels)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", required=True)
    ap.add_argument("--model", choices=["fc", "conv", "denoising_conv"], required=True)
    args = ap.parse_args()

    set_seed(42)
    device = torch.device("cpu")
    ckpt = torch.load(os.path.join(CKPT, f"{args.run}.pt"),
                      map_location="cpu", weights_only=False)
    cfg = ckpt["config"]
    denoising = args.model == "denoising_conv"

    model = build_model(args.model, cfg)
    model.load_state_dict(ckpt["state_dict"])
    model.to(device)

    loaders = build_splits(root=os.path.join(ROOT, "data"))
    normal_err, _ = per_image_mse(model, loaders["test_normal"], device, denoising)
    anom_err, _ = per_image_mse(model, loaders["test_anomaly"], device, denoising)

    mse_normal = float(normal_err.mean())
    mae_normal = float(np.abs(normal_err).mean())  # mean absolute error of per-image MSE
    threshold = float(np.percentile(normal_err, 95))

    y_true = np.array([0] * len(normal_err) + [1] * len(anom_err))
    scores = np.concatenate([normal_err, anom_err])
    y_pred = (scores > threshold).astype(int)

    prec, rec, f1, _ = precision_recall_fscore_support(
        y_true, y_pred, average="binary", zero_division=0)
    roc_auc = float(roc_auc_score(y_true, scores))
    pr_auc = float(average_precision_score(y_true, scores))

    metrics = {
        "run": args.run,
        "params": ckpt["params"],
        "test_normal_mse": mse_normal,
        "test_normal_rmse": float(np.sqrt(mse_normal)),
        "test_normal_mae": mae_normal,
        "threshold_95pct": threshold,
        "precision": float(prec),
        "recall": float(rec),
        "f1": float(f1),
        "roc_auc": roc_auc,
        "pr_auc": pr_auc,
        "n_normal_test": len(normal_err),
        "n_anomaly_test": len(anom_err),
    }
    with open(os.path.join(CKPT, f"{args.run}_metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)
    np.savez(os.path.join(CKPT, f"{args.run}_errors.npz"),
             normal=normal_err, anomaly=anom_err, threshold=threshold)
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
