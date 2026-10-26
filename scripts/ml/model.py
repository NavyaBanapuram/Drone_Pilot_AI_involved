"""
DronePilot - Precision Landing ResNeXt-50 Multi-Task Architecture

Backbone: ResNeXt-50 (resnext50_32x4d)
Heads:
  - confidence: [B, 1] (Target presence probability [0, 1])
  - center: [B, 2] (Normalized optical center (u, v) in [0, 1])
  - bbox: [B, 4] (Normalized bounding box (xMin, yMin, xMax, yMax) in [0, 1])
  - scene: [B, 8] (8-class environmental scene classification)
"""

import torch
import torch.nn as nn
import torchvision.models as models

SCENE_CLASSES = [
    "Building",
    "Field",
    "Lawn",
    "Mountain",
    "Road",
    "Vehicles",
    "WaterArea",
    "Wilderness",
]

class PrecisionLandingResNeXt(nn.Module):
    def __init__(self, pretrained=False):
        super().__init__()
        
        # Instantiate ResNeXt-50 32x4d backbone
        # When pretrained is True and available, uses IMAGENET1K_V2 weights
        weights = models.ResNeXt50_32X4D_Weights.DEFAULT if pretrained else None
        try:
            base_model = models.resnext50_32x4d(weights=weights)
        except Exception:
            # Fallback to weights=None if network is unavailable
            base_model = models.resnext50_32x4d(weights=None)

        # Extract feature representation before classification head
        self.conv1 = base_model.conv1
        self.bn1 = base_model.bn1
        self.relu = base_model.relu
        self.maxpool = base_model.maxpool

        self.layer1 = base_model.layer1
        self.layer2 = base_model.layer2
        self.layer3 = base_model.layer3
        self.layer4 = base_model.layer4
        self.avgpool = base_model.avgpool

        feat_dim = 2048

        # 1. Target Detection Confidence Head: Linear(2048 -> 1)
        self.confidence_head = nn.Sequential(
            nn.Linear(feat_dim, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(256, 1),
        )

        # 2. Target Center Localization Head: Linear(2048 -> 2)
        self.center_head = nn.Sequential(
            nn.Linear(feat_dim, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(256, 2),
            nn.Sigmoid(), # Constrained to [0, 1] normalized image coordinates
        )

        # 3. Bounding Box Head: Linear(2048 -> 4)
        self.bbox_head = nn.Sequential(
            nn.Linear(feat_dim, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(256, 4),
            nn.Sigmoid(), # Constrained to [0, 1] normalized image coordinates
        )

        # 4. Environmental Scene Category Head: Linear(2048 -> 8)
        self.scene_head = nn.Sequential(
            nn.Linear(feat_dim, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(256, len(SCENE_CLASSES)),
        )

    def extract_features(self, x: torch.Tensor) -> torch.Tensor:
        x = self.conv1(x)
        x = self.bn1(x)
        x = self.relu(x)
        x = self.maxpool(x)

        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)

        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        return x

    def forward(self, x: torch.Tensor):
        feats = self.extract_features(x)

        conf_logits = self.confidence_head(feats)
        confidence = torch.sigmoid(conf_logits)
        center = self.center_head(feats)
        bbox = self.bbox_head(feats)
        scene_logits = self.scene_head(feats)

        return {
            "conf_logits": conf_logits,
            "confidence": confidence,
            "center": center,
            "bbox": bbox,
            "scene_logits": scene_logits,
            "scene_probs": torch.softmax(scene_logits, dim=1),
        }
