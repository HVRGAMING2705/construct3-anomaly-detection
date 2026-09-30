# Construct 3 — training script (fresh implementation)
# Usage:
#   python scripts/train.py --model fc --run fc_base --epochs 8
#   python scripts/train.py --model conv --run conv_base --epochs 8
#   python scripts/train.py --model denoising_conv --run den_base --epochs 8
#   python scripts/train.py --model fc --run fc_no_bn --epochs 4 --no-bn
#   python scripts/train.py --model fc --run fc_no_drop --epochs 4 --dropout 0.0

import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import torch
import torch.nn as nn

from models.autoencoders import (FCAutoencoder, ConvAutoencoder,
                                 DenoisingAutoencoder, set_seed, count_params)
from models.data import build_splits

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CKPT = os.path.join(ROOT, "checkpoints")


def train_one(model, loaders, device, epochs, lr, run_name, corrupt_val=False):
    model.to(device)
    opt = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=epochs)
    loss_fn = nn.MSELoss()

    history = {"train_loss": [], "val_loss": []}
    best_val = float("inf")
    best_state = None

    for ep in range(1, epochs + 1):
        model.train()
        train_loss, n = 0.0, 0
        t0 = time.time()
        for x, _ in loaders["train"]:
            x = x.to(device)
            opt.zero_grad()
            out = model(x)
            if isinstance(model, DenoisingAutoencoder):
                loss = loss_fn(out, x)  # reconstruct the CLEAN target
            else:
                loss = loss_fn(out, x)
            loss.backward()
            opt.step()
            train_loss += loss.item() * x.size(0)
            n += x.size(0)
        train_loss /= n

        model.eval()
        val_loss, n = 0.0, 0
        with torch.no_grad():
            for x, _ in loaders["val"]:
                x = x.to(device)
                if corrupt_val and isinstance(model, DenoisingAutoencoder):
                    out = model(x)
                else:
                    out = model.backbone(x) if isinstance(model, DenoisingAutoencoder) else model(x)
                val_loss += loss_fn(out, x).item() * x.size(0)
                n += x.size(0)
        val_loss /= n
        sched.step()

        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)
        if val_loss < best_val:
            best_val = val_loss
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
        print(f"[{run_name}] epoch {ep}/{epochs} "
              f"train={train_loss:.5f} val={val_loss:.5f} "
              f"({time.time()-t0:.0f}s)", flush=True)

    return best_state, history


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", choices=["fc", "conv", "denoising_conv"], required=True)
    ap.add_argument("--run", required=True)
    ap.add_argument("--epochs", type=int, default=8)
    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--latent", type=int, default=32)
    ap.add_argument("--dropout", type=float, default=0.1)
    ap.add_argument("--no-bn", action="store_true")
    ap.add_argument("--noise-std", type=float, default=0.3)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    set_seed(args.seed)
    device = torch.device("cpu")

    use_bn = not args.no_bn
    if args.model == "fc":
        model = FCAutoencoder(latent_dim=args.latent, use_bn=use_bn,
                              dropout=args.dropout)
    elif args.model == "conv":
        model = ConvAutoencoder(latent_dim=args.latent)
    else:
        backbone = ConvAutoencoder(latent_dim=args.latent)
        model = DenoisingAutoencoder(backbone, noise_std=args.noise_std)

    print(f"[{args.run}] params: {count_params(model):,}", flush=True)
    loaders = build_splits(root=os.path.join(ROOT, "data"))

    os.makedirs(CKPT, exist_ok=True)
    best_state, history = train_one(model, loaders, device, args.epochs,
                                    args.lr, args.run,
                                    corrupt_val=(args.model == "denoising_conv"))

    torch.save({
        "state_dict": best_state,
        "config": vars(args),
        "params": count_params(model),
        "history": history,
    }, os.path.join(CKPT, f"{args.run}.pt"))
    with open(os.path.join(CKPT, f"{args.run}_history.json"), "w") as f:
        json.dump(history, f)
    print(f"[{args.run}] saved.", flush=True)


if __name__ == "__main__":
    main()
