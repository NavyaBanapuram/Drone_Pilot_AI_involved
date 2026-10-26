# DronePilot — ONNX Model Distribution & Clean Checkout Guide

## Overview

The DronePilot precision-landing vision pipeline uses a trained ResNeXt-50 multi-task deep neural network exported to ONNX format.

- **Runtime Path:** `public/models/precision_landing_resnext50.onnx`
- **File Size:** `100,481,863 bytes` (~95.82 MiB / 100.48 MB)
- **SHA-256 Digest:** `a0a90a29348b720206b763ceeff625af1564bd4ec0c93b5052dd4f6faf90774e`
- **PyTorch Training Checkpoint:** `models/best_precision_landing_model.pt` (`100,714,503 bytes`, SHA-256: `774cb6a532aec2315be06f0138028ec737479272da4efca8896aef0c2614c0a9`)

---

## GitHub 100 MB Limit Protection

GitHub enforces a strict 100 MB per-file push limit. Because the model file is 100.48 MB, committing it directly to Git causes push rejections.

To protect developers from accidentally staging or pushing these files:
- `.gitignore` explicitly ignores:
  ```gitignore
  # large machine learning model checkpoints (> 100 MB)
  models/*.pt
  models/*.onnx
  public/models/*.onnx
  public/models/*.onnx.data
  *.onnx
  *.pt
  precision_landing_dataset_250/images/
  ```

---

## Clean Checkout Workflow

When cloning a fresh copy of DronePilot from GitHub, the heavy model artifact is excluded. Follow these steps:

### 1. Standard Setup
```bash
git clone <repo-url>
cd Drone-Pilot-main
npm install
```

### 2. Model Setup Options

Run the built-in model verification and setup tool:
```bash
npm run model:verify
# or
npm run model:setup
```

Depending on your environment, obtain the model via one of three methods:

#### Method A: Automatic Download via Environment Variable
If your team or CI hosts the model release artifact:
```bash
# Set the download URL in your environment:
export DRONEPILOT_MODEL_URL="https://<your-host>/precision_landing_resnext50.onnx"
# On Windows cmd:
set DRONEPILOT_MODEL_URL=https://<your-host>/precision_landing_resnext50.onnx

# Run automated setup:
npm run model:setup
```

#### Method B: Export from PyTorch Checkpoint
If you have the PyTorch checkpoint (`models/best_precision_landing_model.pt`) or retrained the model:
```bash
python -m scripts.ml.export_onnx
```
This automatically exports the model and places the verified self-contained ONNX file directly into `public/models/precision_landing_resnext50.onnx`.

#### Method C: Manual Placement
Copy your verified `precision_landing_resnext50.onnx` file directly into `public/models/`.

---

## Safe Degradation Without the Model

If `public/models/precision_landing_resnext50.onnx` is not present:
- The DronePilot flight simulator, 6-DoF physics engine, manual stick inputs, aerodynamics, audio, and HUD remain **100% operational**.
- The vision inference engine catches the missing file gracefully, logs an informative notice, and marks the vision status as `ERROR`.
- The Landing Assist FSM stays strictly in the `DISABLED` state and issues **zero guidance commands**, preventing any flight interference or control hijacking.
