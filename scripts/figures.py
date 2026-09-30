# Construct 3 — figure generation (fresh implementation)
# Generates all paper/presentation figures from trained checkpoints.
# Usage: python scripts/figures.py --runs fc_base,conv_base,den_base

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import torch
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from sklearn.metrics import roc_curve, precision_recall_curve, auc

from models.autoencoders import (FCAutoencoder, ConvAutoencoder,
                                 DenoisingAutoencoder, set_seed)
from models.data import build_splits, CLASSES

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIG = os.path.join(ROOT, "figures")
CKPT = os.path.join(ROOT, "checkpoints")
os.makedirs(FIG, exist_ok=True)


def build_model(model_type, cfg):
    if model_type == "fc":
        return FCAutoencoder(latent_dim=cfg["latent"], use_bn=not cfg["no_bn"],
                             dropout=cfg["dropout"])
    if model_type == "conv":
        return ConvAutoencoder(latent_dim=cfg["latent"])
    return DenoisingAutoencoder(ConvAutoencoder(latent_dim=cfg["latent"]),
                               noise_std=cfg.get("noise_std", 0.3))


def load_run(run, model_map):
    mt = model_map[run]
    ckpt = torch.load(os.path.join(CKPT, f"{run}.pt"), map_location="cpu",
                      weights_only=False)
    model = build_model(mt, ckpt["config"])
    model.load_state_dict(ckpt["state_dict"])
    model.eval()
    denoising = mt == "denoising_conv"
    return model, ckpt, denoising


def load_history(run):
    import json
    with open(os.path.join(CKPT, f"{run}_history.json")) as f:
        return json.load(f)


def fig_loss_curves(runs):
    plt.figure(figsize=(6.4, 4.2))
    for r in runs:
        h = load_history(r)
        ep = range(1, len(h["train_loss"]) + 1)
        plt.plot(ep, h["train_loss"], "--", label=f"{r} train")
        plt.plot(ep, h["val_loss"], "-", label=f"{r} val")
    plt.xlabel("Epoch")
    plt.ylabel("MSE loss")
    plt.title("Training and validation loss")
    plt.legend(fontsize=7, ncol=2)
    plt.tight_layout()
    plt.savefig(os.path.join(FIG, "loss_curves.png"), dpi=150)
    plt.close()


def fig_recon_gallery(model, loaders, denoising, name, n=8):
    x, _ = next(iter(loaders["test_normal"]))
    x = x[:n]
    with torch.no_grad():
        if denoising:
            noisy = torch.clamp(x + torch.randn_like(x) * 0.3, 0, 1)
            recon = model.backbone(noisy)
            rows, titles = [x, noisy, recon], ["input", "noisy", "reconstructed"]
        else:
            recon = model(x)
            rows, titles = [x, recon], ["input", "reconstructed"]
    fig, axes = plt.subplots(len(rows), n, figsize=(n * 1.1, len(rows) * 1.1))
    for r_i, row in enumerate(rows):
        for c_i in range(n):
            axes[r_i, c_i].imshow(row[c_i, 0].numpy(), cmap="gray", vmin=0, vmax=1)
            axes[r_i, c_i].axis("off")
        axes[r_i, 0].set_ylabel(titles[r_i], rotation=0, labelpad=30,
                                va="center", fontsize=9)
    plt.suptitle(f"Reconstruction gallery — {name}", fontsize=10)
    plt.tight_layout()
    plt.savefig(os.path.join(FIG, f"recon_{name}.png"), dpi=150)
    plt.close()


def fig_error_hist(runs):
    plt.figure(figsize=(6.4, 4.2))
    for r in runs:
        d = np.load(os.path.join(CKPT, f"{r}_errors.npz"))
        plt.hist(d["normal"], bins=60, alpha=0.45, label=f"{r} normal")
        plt.hist(d["anomaly"], bins=60, alpha=0.45, label=f"{r} anomaly")
    plt.xlabel("Per-image MSE")
    plt.ylabel("Count")
    plt.title("Reconstruction error: normal vs anomaly (Sandal)")
    plt.legend(fontsize=7, ncol=2)
    plt.tight_layout()
    plt.savefig(os.path.join(FIG, "error_hist.png"), dpi=150)
    plt.close()


def fig_roc_pr(runs):
    fig, axes = plt.subplots(1, 2, figsize=(10, 4.2))
    for r in runs:
        d = np.load(os.path.join(CKPT, f"{r}_errors.npz"))
        y_true = np.array([0] * len(d["normal"]) + [1] * len(d["anomaly"]))
        scores = np.concatenate([d["normal"], d["anomaly"]])
        fpr, tpr, _ = roc_curve(y_true, scores)
        axes[0].plot(fpr, tpr, label=f"{r} (AUC={auc(fpr, tpr):.3f})")
        prec, rec, _ = precision_recall_curve(y_true, scores)
        axes[1].plot(rec, prec, label=f"{r} (AP={auc(rec, prec):.3f})")
    axes[0].plot([0, 1], [0, 1], "k--", lw=1)
    axes[0].set_xlabel("FPR"); axes[0].set_ylabel("TPR"); axes[0].set_title("ROC")
    axes[1].set_xlabel("Recall"); axes[1].set_ylabel("Precision"); axes[1].set_title("Precision–Recall")
    axes[0].legend(fontsize=7); axes[1].legend(fontsize=7)
    plt.tight_layout()
    plt.savefig(os.path.join(FIG, "roc_pr.png"), dpi=150)
    plt.close()


@torch.no_grad()
def collect_latents(model, loader, denoising, max_points=2500):
    zs, ys = [], []
    for x, y in loader:
        z = model.encode(x) if not denoising else model.backbone.encode(x)
        zs.append(z.numpy()); ys.append(y.numpy())
        if sum(len(a) for a in zs) >= max_points:
            break
    return np.concatenate(zs)[:max_points], np.concatenate(ys)[:max_points]


def fig_latent(model, loaders, denoising, name):
    z, y = collect_latents(model, loaders["test_normal"], denoising)
    za, ya = collect_latents(model, loaders["test_anomaly"], denoising)
    z_all = np.concatenate([z, za]); y_all = np.concatenate([y, ya])

    fig, axes = plt.subplots(1, 2, figsize=(11, 4.4))
    p = PCA(n_components=2).fit_transform(z_all)
    sc = axes[0].scatter(p[:, 0], p[:, 1], c=y_all, cmap="tab10", s=6, alpha=0.7)
    axes[0].set_title(f"PCA of latent space — {name}")
    axes[0].set_xlabel("PC1"); axes[0].set_ylabel("PC2")
    plt.colorbar(sc, ax=axes[0], ticks=range(10)).set_ticklabels(CLASSES)

    t = TSNE(n_components=2, perplexity=30, random_state=42,
             init="pca", learning_rate="auto").fit_transform(z_all)
    sc2 = axes[1].scatter(t[:, 0], t[:, 1], c=y_all, cmap="tab10", s=6, alpha=0.7)
    axes[1].set_title(f"t-SNE of latent space — {name}")
    axes[1].set_xlabel("t-SNE 1"); axes[1].set_ylabel("t-SNE 2")
    plt.colorbar(sc2, ax=axes[1], ticks=range(10)).set_ticklabels(CLASSES)
    plt.tight_layout()
    plt.savefig(os.path.join(FIG, f"latent_{name}.png"), dpi=150)
    plt.close()


def fig_anomaly_gallery(model, loaders, denoising, name, n=8):
    xa, _ = next(iter(loaders["test_anomaly"]))
    with torch.no_grad():
        if denoising:
            recon = model.backbone(xa[:n])
        else:
            recon = model(xa[:n])
    se = ((recon - xa[:n]) ** 2).mean(dim=(1, 2, 3)).numpy()
    order = np.argsort(-se)[:n]
    fig, axes = plt.subplots(2, n, figsize=(n * 1.1, 2.4))
    for i, idx in enumerate(order):
        axes[0, i].imshow(xa[idx, 0].numpy(), cmap="gray", vmin=0, vmax=1)
        axes[0, i].axis("off")
        axes[1, i].imshow(recon[idx, 0].numpy(), cmap="gray", vmin=0, vmax=1)
        axes[1, i].axis("off")
        axes[1, i].set_title(f"MSE={se[idx]:.4f}", fontsize=7)
    axes[0, 0].set_ylabel("anomaly\n(Sandal)", rotation=0, labelpad=34, va="center")
    axes[1, 0].set_ylabel("recon.", rotation=0, labelpad=34, va="center")
    plt.suptitle(f"Highest-error anomalies — {name}", fontsize=10)
    plt.tight_layout()
    plt.savefig(os.path.join(FIG, f"anomaly_{name}.png"), dpi=150)
    plt.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--runs", required=True, help="comma-separated run names")
    ap.add_argument("--models", required=True,
                    help="comma-separated model types aligned with runs")
    args = ap.parse_args()
    set_seed(42)

    runs = args.runs.split(",")
    model_map = dict(zip(runs, args.models.split(",")))
    loaders = build_splits(root=os.path.join(ROOT, "data"))

    fig_loss_curves(runs)
    fig_error_hist(runs)
    fig_roc_pr(runs)
    for r in runs:
        model, _, denoising = load_run(r, model_map)
        short = r.replace("_base", "")
        fig_recon_gallery(model, loaders, denoising, short)
        fig_anomaly_gallery(model, loaders, denoising, short)
        fig_latent(model, loaders, denoising, short)
    print("figures done:", sorted(os.listdir(FIG)))


if __name__ == "__main__":
    main()
