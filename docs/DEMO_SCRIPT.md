# Construct 3 — Presentation Demo Script (fresh remake)

20-minute presentation timeline. Files: `Construct3_Presentation.pptx`,
checkpoints in `checkpoints/`, figures in `figures/`.

## Setup (2 min before)

- Slides open; terminal ready in project root with venv python.
- Quick live command: `python scripts/evaluate.py --run conv_base --model conv`
  (prints metrics in ~10 s; use if asked for "live" proof).

## Timeline

| Min | Slide | Say / do |
|-----|-------|----------|
| 0–2 | Title + agenda | "We train autoencoders that squeeze clothing images through a tiny bottleneck and rebuild them. Two jobs: find odd items by high rebuild error, and clean noisy images." |
| 2–4 | Motivation | Real-world hook: factories need to spot defective products without labeling every defect. One-class training = learn 'normal', flag the rest. |
| 4–7 | Methodology | Show the two architectures (FC vs Conv). Point out the bottleneck (32 numbers), the sigmoid output, the MSE loss. Denoising variant: corrupt input, compare against clean target. |
| 7–11 | Results | Loss curves (both models converge cleanly, no overfit). Recon gallery: FC is blurry, conv is sharper. Anomaly numbers: threshold = 95th percentile of normal error; report ROC-AUC / PR-AUC from `checkpoints/*_metrics.json`. |
| 11–13 | ROC/PR + latent | "ROC-AUC says how well errors separate Sandals from normal." Latent PCA/t-SNE: Sandals form their own cluster — the bottleneck really learns shape. |
| 13–16 | Ablations | Table: no batch-norm → worse; no dropout → similar/overfit. Denoising: PSNR-style gallery, noisy → clean. |
| 16–18 | Limits | One seed, 10k training subset, 8 epochs; anomaly = one fixed class; no real factory images; MSE only (no SSIM). |
| 18–20 | Q&A | Backup slides: per-class error breakdown, worst-8 anomaly gallery. |

## Likely questions (short answers)

- "Why Fashion-MNIST?" — Small, clean, grayscale; lets us finish training on CPU and the class structure makes anomalies interpretable.
- "Why MSE?" — Simple, differentiable; high error correlates with 'unseen pattern'. Better perceptual losses exist (SSIM) — listed as future work.
- "Why Sandal?" — Visually distinct from the other 9 classes, so a true test of detecting an unseen category.
- "Could this run in a factory?" — Needs real product images and labeled defects for validation; the pipeline is designed to swap the dataset in.
