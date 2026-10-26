"""
DronePilot - Phase D ONNX Export & PyTorch-vs-ONNX Numerical Parity Verification
"""

import os
import sys

# Force UTF-8 stdout/stderr on Windows to handle PyTorch ONNX exporter unicode logs
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import json
import numpy as np
import torch
import torch.nn as nn
import onnx
import onnxruntime as ort
from PIL import Image

from .model import PrecisionLandingResNeXt, SCENE_CLASSES
from .dataset import get_transforms

class ONNXExportWrapper(nn.Module):
    """
    Wrapper ensuring clean, named tensor outputs for ONNX Runtime Web.
    """
    def __init__(self, model: nn.Module):
        super().__init__()
        self.model = model

    def forward(self, x: torch.Tensor):
        preds = self.model(x)
        return (
            preds["confidence"],  # [B, 1]
            preds["center"],      # [B, 2]
            preds["bbox"],        # [B, 4]
            preds["scene_probs"], # [B, 8]
        )

def main():
    print("=== DRONEPILOT: EXPORTING MODEL TO ONNX & VERIFYING NUMERICAL PARITY ===")
    
    checkpoint_path = "models/best_precision_landing_model.pt"
    if not os.path.exists(checkpoint_path):
        print(f"Error: Missing checkpoint {checkpoint_path}. Train the model first.")
        sys.exit(1)

    device = torch.device("cpu")
    base_model = PrecisionLandingResNeXt(pretrained=False).to(device)
    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=True)
    base_model.load_state_dict(checkpoint["model_state_dict"])
    base_model.eval()

    export_model = ONNXExportWrapper(base_model).to(device)
    export_model.eval()

    # Create dummy input [1, 3, 224, 224]
    dummy_input = torch.randn(1, 3, 224, 224, dtype=torch.float32)

    os.makedirs("models", exist_ok=True)
    os.makedirs("public/models", exist_ok=True)

    onnx_paths = [
        "models/precision_landing_resnext50.onnx",
        "public/models/precision_landing_resnext50.onnx",
    ]

    primary_onnx_path = onnx_paths[0]
    print(f"Exporting PyTorch model to ONNX: {primary_onnx_path}...")

    input_names = ["image"]
    output_names = ["confidence", "center", "bbox", "scene_probs"]

    torch.onnx.export(
        export_model,
        dummy_input,
        primary_onnx_path,
        export_params=True,
        opset_version=18,
        do_constant_folding=True,
        input_names=input_names,
        output_names=output_names,
        dynamic_axes={
            "image": {0: "batch_size"},
            "confidence": {0: "batch_size"},
            "center": {0: "batch_size"},
            "bbox": {0: "batch_size"},
            "scene_probs": {0: "batch_size"},
        },
    )

    # Embed all tensor weights into a single self-contained ONNX file for browser deployment
    onnx_proto = onnx.load(primary_onnx_path, load_external_data=True)
    onnx.save_model(onnx_proto, primary_onnx_path, save_as_external_data=False)

    # Copy self-contained model to public/models so Next.js static asset server serves it
    import shutil
    shutil.copyfile(primary_onnx_path, onnx_paths[1])

    onnx_size_mb = os.path.getsize(primary_onnx_path) / (1024 * 1024)
    print(f"ONNX Export Successful (Self-Contained)! File Size: {onnx_size_mb:.2f} MB")

    # 1. Verify ONNX structure
    print("Checking ONNX model structure...")
    onnx_proto = onnx.load(primary_onnx_path)
    onnx.checker.check_model(onnx_proto)
    print("✓ ONNX checker passed with zero structural errors.")

    # 2. Verify in ONNX Runtime
    print("Loading model in ONNX Runtime InferenceSession...")
    session = ort.InferenceSession(primary_onnx_path, providers=["CPUExecutionProvider"])

    for node in session.get_inputs():
        print(f"  Input:  {node.name} -> shape: {node.shape}, type: {node.type}")
    for node in session.get_outputs():
        print(f"  Output: {node.name} -> shape: {node.shape}, type: {node.type}")

    # 3. Numerical Parity Check on Real Test Samples
    test_jsonl = "precision_landing_dataset_250/splits/test.jsonl"
    with open(test_jsonl, "r", encoding="utf-8") as f:
        test_samples = [json.loads(line) for line in f if line.strip()]

    sample = test_samples[0]
    img_path = os.path.join("precision_landing_dataset_250", sample["imageFilename"])
    print(f"\nEvaluating numerical parity on real test sample: {sample['sampleId']} ({sample['imageFilename']})...")

    img = Image.open(img_path).convert("RGB")
    transform = get_transforms()
    test_tensor = transform(img).unsqueeze(0) # [1, 3, 224, 224]

    with torch.no_grad():
        pt_conf, pt_center, pt_bbox, pt_scene = export_model(test_tensor)

    ort_inputs = {"image": test_tensor.numpy()}
    ort_outputs = session.run(output_names, ort_inputs)
    ort_conf, ort_center, ort_bbox, ort_scene = ort_outputs

    diff_conf = float(np.max(np.abs(pt_conf.numpy() - ort_conf)))
    diff_center = float(np.max(np.abs(pt_center.numpy() - ort_center)))
    diff_bbox = float(np.max(np.abs(pt_bbox.numpy() - ort_bbox)))
    diff_scene = float(np.max(np.abs(pt_scene.numpy() - ort_scene)))

    print(f"  Parity - Confidence Max Abs Diff: {diff_conf:.6e}")
    print(f"  Parity - Center Max Abs Diff:     {diff_center:.6e}")
    print(f"  Parity - BBox Max Abs Diff:       {diff_bbox:.6e}")
    print(f"  Parity - Scene Max Abs Diff:      {diff_scene:.6e}")

    tolerance = 1e-4
    if all(d < tolerance for d in [diff_conf, diff_center, diff_bbox, diff_scene]):
        print(f"✓ NUMERICAL PARITY VERIFIED: PyTorch and ONNX match within tolerance {tolerance}!")
    else:
        print(f"❌ PARITY FAILURE: Exceeds numerical tolerance {tolerance}")
        sys.exit(1)

    parity_summary = {
        "onnx_model_path": primary_onnx_path,
        "onnx_size_mb": round(onnx_size_mb, 2),
        "input_tensor": "image [1, 3, 224, 224] float32",
        "output_tensors": {
            "confidence": "[1, 1] float32",
            "center": "[1, 2] float32",
            "bbox": "[1, 4] float32",
            "scene_probs": "[1, 8] float32",
        },
        "parity_max_abs_diffs": {
            "confidence": diff_conf,
            "center": diff_center,
            "bbox": diff_bbox,
            "scene": diff_scene,
        },
        "sample_predictions": {
            "confidence": float(ort_conf[0][0]),
            "center": [float(ort_center[0][0]), float(ort_center[0][1])],
            "bbox": [float(ort_bbox[0][i]) for i in range(4)],
            "predicted_scene": SCENE_CLASSES[int(np.argmax(ort_scene[0]))],
        },
    }

    with open("models/onnx_parity_report.json", "w", encoding="utf-8") as f:
        json.dump(parity_summary, f, indent=2)

if __name__ == "__main__":
    main()
