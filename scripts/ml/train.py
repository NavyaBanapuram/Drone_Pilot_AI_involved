"""
DronePilot - Phase D Multi-Task Model Training and Evaluation Pipeline
"""

import os
import sys
import time
import json
import random
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from .model import PrecisionLandingResNeXt, SCENE_CLASSES
from .dataset import PrecisionLandingDataset

def seed_everything(seed=42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

def compute_iou(boxA, boxB):
    # box: [xMin, yMin, xMax, yMax]
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    interArea = max(0.0, xB - xA) * max(0.0, yB - yA)
    boxAArea = max(0.0, boxA[2] - boxA[0]) * max(0.0, boxA[3] - boxA[1])
    boxBArea = max(0.0, boxB[2] - boxB[0]) * max(0.0, boxB[3] - boxB[1])

    denom = boxAArea + boxBArea - interArea
    return interArea / denom if denom > 0 else 0.0

def train_one_epoch(model, dataloader, optimizer, criterion_conf, criterion_loc, criterion_scene, device):
    model.train()
    total_loss = 0.0
    total_conf_loss = 0.0
    total_loc_loss = 0.0
    total_scene_loss = 0.0

    for batch in dataloader:
        images = batch["image"].to(device)
        is_valid = batch["is_valid"].unsqueeze(1).to(device)
        target_center = batch["center"].to(device)
        target_bbox = batch["bbox"].to(device)
        target_scene = batch["scene_idx"].to(device)

        optimizer.zero_grad()
        preds = model(images)

        # 1. Target Detection Confidence Loss
        loss_conf = criterion_conf(preds["conf_logits"], is_valid)

        # 2. Localization Loss (Masked strictly to valid targets)
        valid_mask = (is_valid.squeeze(1) > 0.5)
        if valid_mask.sum() > 0:
            loss_center = criterion_loc(preds["center"][valid_mask], target_center[valid_mask])
            loss_bbox = criterion_loc(preds["bbox"][valid_mask], target_bbox[valid_mask])
            loss_loc = loss_center + loss_bbox
        else:
            loss_loc = torch.tensor(0.0, device=device)

        # 3. Scene Classification Loss
        loss_scene = criterion_scene(preds["scene_logits"], target_scene)

        loss = loss_conf + 2.0 * loss_loc + 0.5 * loss_scene
        loss.backward()
        optimizer.step()

        total_loss += loss.item() * len(images)
        total_conf_loss += loss_conf.item() * len(images)
        total_loc_loss += loss_loc.item() * len(images)
        total_scene_loss += loss_scene.item() * len(images)

    n = len(dataloader.dataset)
    return {
        "loss": total_loss / n,
        "conf_loss": total_conf_loss / n,
        "loc_loss": total_loc_loss / n,
        "scene_loss": total_scene_loss / n,
    }

def evaluate(model, dataloader, device):
    model.eval()
    tp = fp = tn = fn = 0
    center_errors_px = []
    center_errors_norm = []
    ious = []
    scene_correct = 0

    with torch.no_grad():
        for batch in dataloader:
            images = batch["image"].to(device)
            is_valid = batch["is_valid"].cpu().numpy()
            target_center = batch["center"].cpu().numpy()
            target_bbox = batch["bbox"].cpu().numpy()
            target_scene = batch["scene_idx"].cpu().numpy()

            preds = model(images)
            conf_probs = preds["confidence"].squeeze(1).cpu().numpy()
            pred_centers = preds["center"].cpu().numpy()
            pred_bboxes = preds["bbox"].cpu().numpy()
            pred_scenes = preds["scene_logits"].argmax(dim=1).cpu().numpy()

            for i in range(len(images)):
                pred_valid = conf_probs[i] >= 0.5
                actual_valid = is_valid[i] >= 0.5

                if actual_valid and pred_valid:
                    tp += 1
                elif not actual_valid and pred_valid:
                    fp += 1
                elif not actual_valid and not pred_valid:
                    tn += 1
                else:
                    fn += 1

                if pred_scenes[i] == target_scene[i]:
                    scene_correct += 1

                # If ground truth was valid, measure localization accuracy
                if actual_valid:
                    du = abs(pred_centers[i][0] - target_center[i][0])
                    dv = abs(pred_centers[i][1] - target_center[i][1])
                    norm_err = float(np.hypot(du, dv))
                    px_err = norm_err * 224.0
                    center_errors_norm.append(norm_err)
                    center_errors_px.append(px_err)

                    iou = compute_iou(pred_bboxes[i], target_bbox[i])
                    ious.append(iou)

    total = len(dataloader.dataset)
    accuracy = (tp + tn) / total if total > 0 else 0.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0

    return {
        "samples": total,
        "tp": tp,
        "fp": fp,
        "tn": tn,
        "fn": fn,
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "fpr": fpr,
        "mean_center_pixel_error": float(np.mean(center_errors_px)) if center_errors_px else 0.0,
        "median_center_pixel_error": float(np.median(center_errors_px)) if center_errors_px else 0.0,
        "mean_center_norm_error": float(np.mean(center_errors_norm)) if center_errors_norm else 0.0,
        "mean_iou": float(np.mean(ious)) if ious else 0.0,
        "scene_accuracy": scene_correct / total if total > 0 else 0.0,
    }

def main():
    print("=== DRONEPILOT: TRAINING RESNEXT-50 PRECISION LANDING MODEL ===")
    seed_everything(42)

    device = torch.device("cpu")
    print(f"Training Device: {device} (Respecting CPU-only constraint)")

    dataset_root = os.path.abspath("precision_landing_dataset_250")
    train_jsonl = os.path.join(dataset_root, "splits", "train.jsonl")
    val_jsonl = os.path.join(dataset_root, "splits", "val.jsonl")
    test_jsonl = os.path.join(dataset_root, "splits", "test.jsonl")

    if not os.path.exists(train_jsonl):
        print(f"Error: Missing {train_jsonl}")
        sys.exit(1)

    train_ds = PrecisionLandingDataset(train_jsonl, dataset_root)
    val_ds = PrecisionLandingDataset(val_jsonl, dataset_root)
    test_ds = PrecisionLandingDataset(test_jsonl, dataset_root)

    print(f"Loaded Splits: Train={len(train_ds)}, Val={len(val_ds)}, Test={len(test_ds)}")

    train_loader = DataLoader(train_ds, batch_size=16, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=16, shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=16, shuffle=False)

    model = PrecisionLandingResNeXt(pretrained=False).to(device)
    print("ResNeXt-50 multi-task architecture initialized.")

    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    epochs = 10
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    criterion_conf = nn.BCEWithLogitsLoss()
    criterion_loc = nn.SmoothL1Loss()
    criterion_scene = nn.CrossEntropyLoss()

    best_val_f1 = -1.0
    os.makedirs("models", exist_ok=True)
    checkpoint_path = "models/best_precision_landing_model.pt"

    start_train_time = time.time()
    training_history = []

    for ep in range(1, epochs + 1):
        t0 = time.time()
        train_metrics = train_one_epoch(model, train_loader, optimizer, criterion_conf, criterion_loc, criterion_scene, device)
        val_metrics = evaluate(model, val_loader, device)
        scheduler.step()
        ep_duration = time.time() - t0

        print(
            f"Epoch {ep:2d}/{epochs:2d} ({ep_duration:4.1f}s) | "
            f"Train Loss: {train_metrics['loss']:.4f} | "
            f"Val Det F1: {val_metrics['f1']:.3f} | "
            f"Val Recall: {val_metrics['recall']:.3f} | "
            f"Val FPR: {val_metrics['fpr']:.3f} | "
            f"Val Center Err: {val_metrics['mean_center_pixel_error']:.1f}px | "
            f"Val IoU: {val_metrics['mean_iou']:.3f}"
        )

        training_history.append({
            "epoch": ep,
            "duration_s": round(ep_duration, 2),
            "train": train_metrics,
            "val": val_metrics,
        })

        if val_metrics["f1"] >= best_val_f1:
            best_val_f1 = val_metrics["f1"]
            torch.save({
                "epoch": ep,
                "model_state_dict": model.state_dict(),
                "val_metrics": val_metrics,
                "scene_classes": SCENE_CLASSES,
            }, checkpoint_path)

    total_train_duration = time.time() - start_train_time
    print(f"\nTraining completed in {total_train_duration:.1f}s. Best model checkpoint saved to {checkpoint_path}")

    # Load best checkpoint for final evaluation on held-out test split
    print("\n--- Evaluating on Held-Out Test Set (30 samples, 3 flight runs) ---")
    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=True)
    model.load_state_dict(checkpoint["model_state_dict"])
    test_metrics = evaluate(model, test_loader, device)

    print(f"Test Detection Accuracy: {test_metrics['accuracy'] * 100:.1f}%")
    print(f"Test Detection Precision: {test_metrics['precision'] * 100:.1f}%")
    print(f"Test Detection Recall:    {test_metrics['recall'] * 100:.1f}%")
    print(f"Test Detection F1 Score:  {test_metrics['f1']:.4f}")
    print(f"Test False Positive Rate: {test_metrics['fpr'] * 100:.1f}% (on negative/off-pad samples)")
    print(f"Test Mean Center Error:   {test_metrics['mean_center_pixel_error']:.2f} px ({test_metrics['mean_center_norm_error']:.4f} normalized)")
    print(f"Test Median Center Error: {test_metrics['median_center_pixel_error']:.2f} px")
    print(f"Test Mean BBox IoU:       {test_metrics['mean_iou']:.4f}")
    print(f"Test Scene Class Acc:     {test_metrics['scene_accuracy'] * 100:.1f}%")

    # Save comprehensive evaluation summary
    eval_report = {
        "model_architecture": "ResNeXt-50 (resnext50_32x4d)",
        "training_environment": "CPU (PyTorch 2.14.0+cpu)",
        "total_training_duration_seconds": round(total_train_duration, 2),
        "epochs": epochs,
        "dataset": "precision_landing_dataset_250",
        "split_counts": {
            "train": len(train_ds),
            "val": len(val_ds),
            "test": len(test_ds),
        },
        "best_checkpoint": checkpoint_path,
        "best_epoch": checkpoint["epoch"],
        "test_metrics": test_metrics,
        "training_history": training_history,
    }

    report_path = os.path.join(dataset_root, "training_and_evaluation_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(eval_report, f, indent=2)
    print(f"Evaluation report written to {report_path}")

if __name__ == "__main__":
    main()
