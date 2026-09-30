import json
import os
import sys
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import torch
import torch.nn as nn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.autoencoders import (ConvAutoencoder, DenoisingAutoencoder, FCAutoencoder,
                                  count_params, set_seed)
from models.data import build_splits
from scripts.evaluate import per_image_mse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CKPT_DIR = os.path.join(ROOT, "checkpoints")
DATA_DIR = os.path.join(ROOT, "data")
FIGURES_DIR = os.path.join(ROOT, "figures")
REGISTRY_PATH = os.path.join(CKPT_DIR, "registry.json")

app = FastAPI(title="Construct3 API", version="1.0.0")

# Add debug middleware FIRST
print("[MAIN.PY] Adding debug middleware", flush=True)

@app.middleware("http")
async def debug_middleware(request, call_next):
    print(f"[MIDDLEWARE] Request: {request.method} {request.url.path}", flush=True)
    try:
        response = await call_next(request)
        print(f"[MIDDLEWARE] Response: {response.status_code}", flush=True)
        return response
    except Exception as e:
        print(f"[MIDDLEWARE ERROR] {e}", flush=True)
        import traceback
        traceback.print_exc()
        raise

print("[MAIN.PY] Debug middleware added", flush=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

device = torch.device("cpu")
loaders = build_splits(root=DATA_DIR)

MODEL_CACHE: Dict[str, nn.Module] = {}
METRICS_CACHE: Dict[str, dict] = {}
LATENT_CACHE: Dict[str, dict] = {}
THRESHOLD_CACHE: Dict[str, dict] = {}
TRAINING_SESSIONS: Dict[str, dict] = {}

class TrainConfig(BaseModel):
    model: str
    run: str
    epochs: int = 8
    lr: float = 1e-3
    latent: int = 32
    dropout: float = 0.1
    no_bn: bool = False
    noise_std: float = 0.3
    seed: int = 42

class CompareRequest(BaseModel):
    runs: List[str]

class ThresholdRequest(BaseModel):
    run: str
    percentile: float

def load_registry() -> List[dict]:
    if os.path.exists(REGISTRY_PATH):
        with open(REGISTRY_PATH, "r") as f:
            return json.load(f)
    # Projects created before the registry was introduced already have valid
    # checkpoints and metrics. Surface those runs rather than presenting an
    # empty dashboard until a new training job completes.
    discovered = []
    for checkpoint_path in sorted(Path(CKPT_DIR).glob("*.pt")):
        try:
            checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
            config = checkpoint.get("config", {})
            discovered.append({
                "run": checkpoint_path.stem,
                "model": config.get("model", "unknown"),
                "epochs": config.get("epochs", 0),
                "timestamp": datetime.fromtimestamp(checkpoint_path.stat().st_mtime).isoformat(),
                "config": config,
            })
        except Exception as exc:
            print(f"Failed to register {checkpoint_path.name}: {exc}")
    if discovered:
        save_registry(discovered)
    return discovered

def save_registry(registry: List[dict]):
    with open(REGISTRY_PATH, "w") as f:
        json.dump(registry, f, indent=2)

def build_model(model_type: str, cfg: dict) -> nn.Module:
    if model_type == "fc":
        return FCAutoencoder(latent_dim=cfg["latent"], use_bn=not cfg["no_bn"], dropout=cfg["dropout"])
    if model_type == "conv":
        return ConvAutoencoder(latent_dim=cfg["latent"])
    backbone = ConvAutoencoder(latent_dim=cfg["latent"])
    return DenoisingAutoencoder(backbone, noise_std=cfg.get("noise_std", 0.3))

def get_model(run: str) -> nn.Module:
    if run in MODEL_CACHE:
        return MODEL_CACHE[run]
    ckpt_path = os.path.join(CKPT_DIR, f"{run}.pt")
    if not os.path.exists(ckpt_path):
        raise HTTPException(status_code=404, detail=f"Checkpoint {run} not found")
    ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
    cfg = ckpt["config"]
    model_type = cfg.get("model", "fc")
    if model_type not in ["fc", "conv", "denoising_conv"]:
        model_type = "fc" if "fc" in run else ("conv" if "conv" in run else "denoising_conv")
    model = build_model(model_type, cfg)
    model.load_state_dict(ckpt["state_dict"])
    model.to(device)
    model.eval()
    MODEL_CACHE[run] = model
    return model

def get_metrics(run: str) -> dict:
    if run in METRICS_CACHE:
        return METRICS_CACHE[run]
    metrics_path = os.path.join(CKPT_DIR, f"{run}_metrics.json")
    if not os.path.exists(metrics_path):
        raise HTTPException(status_code=404, detail=f"Metrics for {run} not found")
    with open(metrics_path, "r") as f:
        metrics = json.load(f)
    METRICS_CACHE[run] = metrics
    return metrics

def compute_latent(run: str) -> dict:
    if run in LATENT_CACHE:
        return LATENT_CACHE[run]
    model = get_model(run)
    ckpt = torch.load(os.path.join(CKPT_DIR, f"{run}.pt"), map_location="cpu", weights_only=False)
    cfg = ckpt["config"]
    denoising = "denoising" in run or cfg.get("model") == "denoising_conv"

    latents = []
    labels = []
    is_anomaly = []

    with torch.no_grad():
        for loader_name, loader in [("test_normal", loaders["test_normal"]), ("test_anomaly", loaders["test_anomaly"])]:
            for x, y in loader:
                x = x.to(device)
                if denoising and hasattr(model, "backbone"):
                    z = model.backbone.encode(x)
                else:
                    z = model.encode(x)
                latents.append(z.cpu().numpy())
                labels.extend(y.numpy().tolist())
                is_anomaly.extend([loader_name == "test_anomaly"] * len(y))

    latents = np.vstack(latents)
    from sklearn.decomposition import PCA
    from sklearn.manifold import TSNE

    pca = PCA(n_components=2)
    pca_coords = pca.fit_transform(latents)

    tsne = TSNE(n_components=2, random_state=42, perplexity=30, max_iter=1000)
    tsne_coords = tsne.fit_transform(latents)

    result = {
        "pca": pca_coords.tolist(),
        "tsne": tsne_coords.tolist(),
        "labels": labels,
        "is_anomaly": is_anomaly,
        "explained_variance": pca.explained_variance_ratio_.tolist(),
    }
    LATENT_CACHE[run] = result
    return result

def compute_threshold_sweep(run: str) -> dict:
    cache_key = f"{run}_sweep"
    if cache_key in THRESHOLD_CACHE:
        return THRESHOLD_CACHE[cache_key]
    model = get_model(run)
    ckpt = torch.load(os.path.join(CKPT_DIR, f"{run}.pt"), map_location="cpu", weights_only=False)
    cfg = ckpt["config"]
    denoising = "denoising" in run or cfg.get("model") == "denoising_conv"

    normal_err, _ = per_image_mse(model, loaders["test_normal"], device, denoising)
    anom_err, _ = per_image_mse(model, loaders["test_anomaly"], device, denoising)

    from sklearn.metrics import precision_recall_fscore_support, roc_auc_score, average_precision_score

    y_true = np.array([0] * len(normal_err) + [1] * len(anom_err))
    scores = np.concatenate([normal_err, anom_err])

    percentiles = np.linspace(1, 99, 99)
    sweep = []

    for p in percentiles:
        threshold = float(np.percentile(normal_err, p))
        y_pred = (scores > threshold).astype(int)
        prec, rec, f1, _ = precision_recall_fscore_support(y_true, y_pred, average="binary", zero_division=0)
        sweep.append({
            "percentile": float(p),
            "threshold": threshold,
            "precision": float(prec),
            "recall": float(rec),
            "f1": float(f1),
        })

    roc_auc = float(roc_auc_score(y_true, scores))
    pr_auc = float(average_precision_score(y_true, scores))

    result = {
        "sweep": sweep,
        "roc_auc": roc_auc,
        "pr_auc": pr_auc,
        "normal_errors": normal_err.tolist(),
        "anomaly_errors": anom_err.tolist(),
    }
    THRESHOLD_CACHE[cache_key] = result
    return result

@app.on_event("startup")
async def startup():
    os.makedirs(CKPT_DIR, exist_ok=True)
    os.makedirs(FIGURES_DIR, exist_ok=True)
    for f in os.listdir(CKPT_DIR):
        if f.endswith(".pt"):
            run = f[:-3]
            try:
                get_model(run)
                get_metrics(run)
            except Exception as e:
                print(f"Failed to warm up {run}: {e}")
    print("Backend startup complete. Models loaded.")

@app.get("/api/health")
async def health():
    return {"status": "ok", "models_loaded": list(MODEL_CACHE.keys())}

@app.get("/api/runs")
async def list_runs():
    registry = load_registry()
    runs = []
    for entry in registry:
        run = entry["run"]
        try:
            metrics = get_metrics(run)
            runs.append({
                "run": run,
                "model": entry.get("model", "unknown"),
                "epochs": entry.get("epochs", 0),
                "timestamp": entry.get("timestamp"),
                "params": metrics.get("params"),
                "roc_auc": metrics.get("roc_auc"),
                "f1": metrics.get("f1"),
                "mse": metrics.get("test_normal_mse"),
            })
        except Exception:
            # Filter out runs with missing metrics/errors
            continue
    return {"runs": runs}

@app.post("/api/train")
async def train_model(config: TrainConfig):
    if config.run in [e["run"] for e in load_registry()]:
        raise HTTPException(status_code=400, detail="Run name already exists")

    session_id = str(uuid.uuid4())
    TRAINING_SESSIONS[session_id] = {
        "status": "starting",
        "config": config.dict(),
        "history": {"train_loss": [], "val_loss": []},
        "current_epoch": 0,
        "total_epochs": config.epochs,
    }

    import asyncio
    asyncio.create_task(run_training(session_id, config))
    return {"session_id": session_id, "status": "started"}

async def run_training(session_id: str, config: TrainConfig):
    try:
        set_seed(config.seed)
        use_bn = not config.no_bn

        if config.model == "fc":
            model = FCAutoencoder(latent_dim=config.latent, use_bn=use_bn, dropout=config.dropout)
        elif config.model == "conv":
            model = ConvAutoencoder(latent_dim=config.latent)
        else:
            backbone = ConvAutoencoder(latent_dim=config.latent)
            model = DenoisingAutoencoder(backbone, noise_std=config.noise_std)

        model.to(device)
        opt = torch.optim.Adam(model.parameters(), lr=config.lr, weight_decay=1e-4)
        sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=config.epochs)
        loss_fn = nn.MSELoss()

        TRAINING_SESSIONS[session_id]["status"] = "training"

        for ep in range(1, config.epochs + 1):
            model.train()
            train_loss, n = 0.0, 0
            for x, _ in loaders["train"]:
                x = x.to(device)
                opt.zero_grad()
                out = model(x)
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
                    if isinstance(model, DenoisingAutoencoder):
                        out = model.backbone(x)
                    else:
                        out = model(x)
                    val_loss += loss_fn(out, x).item() * x.size(0)
                    n += x.size(0)
            val_loss /= n
            sched.step()

            TRAINING_SESSIONS[session_id]["history"]["train_loss"].append(train_loss)
            TRAINING_SESSIONS[session_id]["history"]["val_loss"].append(val_loss)
            TRAINING_SESSIONS[session_id]["current_epoch"] = ep

            await broadcast_training_update(session_id, {
                "epoch": ep,
                "train_loss": train_loss,
                "val_loss": val_loss,
                "progress": ep / config.epochs,
            })

        best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
        torch.save({
            "state_dict": best_state,
            "config": config.dict(),
            "params": count_params(model),
            "history": TRAINING_SESSIONS[session_id]["history"],
        }, os.path.join(CKPT_DIR, f"{config.run}.pt"))

        registry = load_registry()
        registry.append({
            "run": config.run,
            "model": config.model,
            "epochs": config.epochs,
            "timestamp": datetime.now().isoformat(),
            "config": config.dict(),
        })
        save_registry(registry)

        MODEL_CACHE.pop(config.run, None)
        METRICS_CACHE.pop(config.run, None)

        TRAINING_SESSIONS[session_id]["status"] = "completed"
        await broadcast_training_update(session_id, {"status": "completed"})

    except Exception as e:
        TRAINING_SESSIONS[session_id]["status"] = "error"
        TRAINING_SESSIONS[session_id]["error"] = str(e)
        await broadcast_training_update(session_id, {"status": "error", "error": str(e)})

async def broadcast_training_update(session_id: str, data: dict):
    pass

@app.websocket("/ws/train/{session_id}")
async def ws_train(websocket: WebSocket, session_id: str):
    await websocket.accept()
    try:
        while True:
            if session_id in TRAINING_SESSIONS:
                session = TRAINING_SESSIONS[session_id]
                await websocket.send_json({
                    "status": session["status"],
                    "current_epoch": session.get("current_epoch", 0),
                    "total_epochs": session.get("total_epochs", 0),
                    "history": session.get("history", {"train_loss": [], "val_loss": []}),
                    "error": session.get("error"),
                })
                if session["status"] in ["completed", "error"]:
                    break
            else:
                await websocket.send_json({"status": "not_found"})
                break
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"status": "error", "error": str(e)})

@app.post("/api/evaluate")
async def evaluate_run(run: str = Form(...), model: str = Form(...)):
    metrics = get_metrics(run)
    return metrics

@app.post("/api/detect")
async def detect_anomaly(run: str = Form(...), file: UploadFile = File(...)):
    model = get_model(run)
    ckpt = torch.load(os.path.join(CKPT_DIR, f"{run}.pt"), map_location="cpu", weights_only=False)
    cfg = ckpt["config"]
    denoising = "denoising" in run or cfg.get("model") == "denoising_conv"

    from PIL import Image
    import io

    contents = await file.read()
    img = Image.open(io.BytesIO(contents)).convert("L").resize((28, 28))
    img_tensor = torch.from_numpy(np.array(img)).float() / 255.0
    img_tensor = img_tensor.unsqueeze(0).unsqueeze(0).to(device)

    with torch.no_grad():
        if denoising:
            out = model.backbone(img_tensor)
        else:
            out = model(img_tensor)
        mse = torch.mean((out - img_tensor) ** 2).item()

    metrics = get_metrics(run)
    threshold = metrics["threshold_95pct"]
    is_anomaly = mse > threshold

    heatmap = (torch.abs(out - img_tensor).squeeze().cpu().numpy() * 255).astype(np.uint8)

    return {
        "mse": mse,
        "threshold": threshold,
        "is_anomaly": bool(is_anomaly),
        "verdict": "ANOMALY" if is_anomaly else "NORMAL",
        "original": img_tensor.squeeze().cpu().numpy().tolist(),
        "reconstruction": out.squeeze().cpu().numpy().tolist(),
        "heatmap": heatmap.tolist(),
    }

@app.post("/api/denoise")
async def denoise_image(run: str = Form(...), noise_std: float = Form(0.3), file: UploadFile = File(...)):
    model = get_model(run)
    ckpt = torch.load(os.path.join(CKPT_DIR, f"{run}.pt"), map_location="cpu", weights_only=False)
    cfg = ckpt["config"]

    from PIL import Image
    import io

    contents = await file.read()
    img = Image.open(io.BytesIO(contents)).convert("L").resize((28, 28))
    img_tensor = torch.from_numpy(np.array(img)).float() / 255.0
    img_tensor = img_tensor.unsqueeze(0).unsqueeze(0).to(device)

    noise = torch.randn_like(img_tensor) * noise_std
    noisy = torch.clamp(img_tensor + noise, 0.0, 1.0)

    with torch.no_grad():
        if hasattr(model, "backbone"):
            clean = model.backbone(noisy)
        else:
            clean = model(noisy)

    return {
        "original": img_tensor.squeeze().cpu().numpy().tolist(),
        "noisy": noisy.squeeze().cpu().numpy().tolist(),
        "denoised": clean.squeeze().cpu().numpy().tolist(),
        "noise_std": noise_std,
    }

@app.get("/api/figures/{run}/{figure}")
async def get_figure(run: str, figure: str):
    figure_path = os.path.join(FIGURES_DIR, f"{figure}_{run}.png")
    if not os.path.exists(figure_path):
        run_prefix = run.split('_')[0]
        figure_path = os.path.join(FIGURES_DIR, f"{figure}_{run_prefix}.png")
    if not os.path.exists(figure_path):
        figure_path = os.path.join(FIGURES_DIR, f"{figure}.png")
    if not os.path.exists(figure_path):
        raise HTTPException(status_code=404, detail="Figure not found")
    return FileResponse(figure_path)

@app.post("/api/compare")
async def compare_runs(request: CompareRequest):
    results = []
    for run in request.runs:
        try:
            metrics = get_metrics(run)
            results.append({
                "run": run,
                "metrics": metrics,
            })
        except Exception as e:
            results.append({"run": run, "error": str(e)})

    if len(results) >= 2:
        baseline = results[0]["metrics"]
        for r in results[1:]:
            if "metrics" in r:
                m = r["metrics"]
                r["delta"] = {
                    "mse": m["test_normal_mse"] - baseline["test_normal_mse"],
                    "roc_auc": m["roc_auc"] - baseline["roc_auc"],
                    "f1": m["f1"] - baseline["f1"],
                    "params": m["params"] - baseline["params"],
                }
    return {"comparison": results}

print("[MAIN.PY] About to register test-latent route", flush=True)

async def test_latent():
    print("[TEST] test_latent endpoint called", flush=True)
    return {"status": "ok", "message": "test endpoint works"}

app.router.add_api_route("/api/test-latent", test_latent, methods=["GET"], include_in_schema=True)

# Debug: print all routes
for route in app.router.routes:
    if hasattr(route, 'path') and 'test-latent' in route.path:
        print(f"[DEBUG] Found route: {route.path}, methods: {route.methods}, include_in_schema: {getattr(route, 'include_in_schema', 'N/A')}", flush=True)
    if hasattr(route, 'path') and 'latent' in route.path:
        print(f"[DEBUG] Latent route: {route.path}, methods: {route.methods}", flush=True)

@app.get("/api/test-debug")
async def test_debug():
    return {"status": "ok"}

@app.get("/api/latent/{run}")
async def get_latent(run: str):
    import traceback
    print(f"[DEBUG] get_latent called for run: {run}", flush=True)
    try:
        result = compute_latent(run)
        print(f"[DEBUG] get_latent success for run: {run}", flush=True)
        return result
    except Exception as e:
        print(f"[ERROR] get_latent failed for run: {run}: {e}", flush=True)
        traceback.print_exc()
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "traceback": traceback.format_exc()}
        )

@app.post("/api/threshold")
async def get_threshold_sweep(request: ThresholdRequest):
    sweep_data = compute_threshold_sweep(request.run)
    percentile = request.percentile
    normal_err = np.array(sweep_data["normal_errors"])
    threshold = float(np.percentile(normal_err, percentile))

    anom_err = np.array(sweep_data["anomaly_errors"])
    y_true = np.array([0] * len(normal_err) + [1] * len(anom_err))
    scores = np.concatenate([normal_err, anom_err])
    y_pred = (scores > threshold).astype(int)

    from sklearn.metrics import precision_recall_fscore_support
    prec, rec, f1, _ = precision_recall_fscore_support(y_true, y_pred, average="binary", zero_division=0)

    return {
        "percentile": percentile,
        "threshold": threshold,
        "precision": float(prec),
        "recall": float(rec),
        "f1": float(f1),
        "sweep": sweep_data["sweep"],
        "roc_auc": sweep_data["roc_auc"],
        "pr_auc": sweep_data["pr_auc"],
    }

@app.get("/api/registry")
async def get_registry():
    return {"registry": load_registry()}

@app.delete("/api/registry/{run}")
async def delete_run(run: str):
    registry = load_registry()
    registry = [e for e in registry if e["run"] != run]
    save_registry(registry)

    for ext in [".pt", "_metrics.json", "_history.json", "_errors.npz"]:
        path = os.path.join(CKPT_DIR, f"{run}{ext}")
        if os.path.exists(path):
            os.remove(path)

    MODEL_CACHE.pop(run, None)
    METRICS_CACHE.pop(run, None)
    LATENT_CACHE.pop(run, None)
    THRESHOLD_CACHE.pop(f"{run}_sweep", None)

    return {"status": "deleted"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
