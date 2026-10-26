"""
DronePilot - Synthetic Precision Landing PyTorch Dataset
"""

import json
import os
from typing import List, Dict, Any
from PIL import Image
import torch
from torch.utils.data import Dataset
import torchvision.transforms as transforms
from .model import SCENE_CLASSES

# ImageNet standard normalization (must match ONNX preprocessing exactly)
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

def get_transforms():
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])

class PrecisionLandingDataset(Dataset):
    def __init__(self, jsonl_path: str, dataset_root: str):
        self.dataset_root = dataset_root
        self.records: List[Dict[str, Any]] = []

        with open(jsonl_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.trim() if hasattr(line, "trim") else line.strip()
                if line:
                    self.records.append(json.loads(line))

        self.transform = get_transforms()

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        record = self.records[idx]

        img_path = os.path.join(self.dataset_root, record["imageFilename"])
        image = Image.open(img_path).convert("RGB")
        tensor_img = self.transform(image)

        is_valid = 1.0 if record["detection"]["isValidTarget"] else 0.0

        # Normalized Center: [u, v] in [0, 1]
        center = torch.tensor(
            [record["projection"]["centerNorm"]["u"], record["projection"]["centerNorm"]["v"]],
            dtype=torch.float32,
        )

        # Normalized Bounding Box: [xMin, yMin, xMax, yMax] in [0, 1]
        bbox_norm = record["projection"]["bboxNorm"]
        bbox = torch.tensor(
            [bbox_norm["xMin"], bbox_norm["yMin"], bbox_norm["xMax"], bbox_norm["yMax"]],
            dtype=torch.float32,
        )

        # Scene Class Index: 0 to 7
        scene_name = record["sceneCategory"]
        scene_idx = SCENE_CLASSES.index(scene_name) if scene_name in SCENE_CLASSES else 0

        return {
            "image": tensor_img,
            "is_valid": torch.tensor(is_valid, dtype=torch.float32),
            "center": center,
            "bbox": bbox,
            "scene_idx": torch.tensor(scene_idx, dtype=torch.long),
            "sample_id": record["sampleId"],
            "flight_run_id": record["flightRunId"],
            "target_helipad_id": record["targetHelipadId"],
        }
