// ==========================================================
// DRONE PILOT — 3D-TO-2D CAMERA PROJECTION & BOUNDING BOX PIPELINE
// Mathematical pinhole camera model for synthetic dataset labeling,
// helipad perimeter projection, FOV clipping, and relative pose.
// ==========================================================

import * as THREE from "three";
import {
  BoundingBox2D,
  NormalizedCenter2D,
  PixelCenter2D,
  RelativePose,
  TargetVisibility,
  InvalidReasonCode,
  Vector3D,
} from "./dataset-schema";

export interface ProjectionResult {
  centerNorm: NormalizedCenter2D;
  centerPixel: PixelCenter2D;
  bboxNorm: BoundingBox2D;
  bboxPixel: BoundingBox2D;
  apparentRadiusPixels: number;
  isTruncated: boolean;
  visibility: TargetVisibility;
  isValidTarget: boolean;
  invalidReasonCode: InvalidReasonCode;
  relativePose: RelativePose;
}

/**
 * Creates and orients a downward-facing (nadir) perspective camera
 * affixed to the drone airframe with optional attitude tilt.
 */
export function createDownwardCamera(
  dronePos: Vector3D,
  droneAttitudeDeg: { pitchDeg: number; rollDeg: number; yawDeg: number },
  fovDegrees = 75,
  aspect = 1.0,
  near = 0.1,
  far = 2000
): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(fovDegrees, aspect, near, far);

  // Position at underside of drone airframe (-8cm vertical offset)
  camera.position.set(dronePos.x, dronePos.y - 0.08, dronePos.z);

  // Default Nadir orientation: looking straight down along -Y,
  // camera top edge (+Y_cam in screen space) points along drone forward (-Z_world).
  const euler = new THREE.Euler(
    -Math.PI / 2 + (droneAttitudeDeg.pitchDeg * Math.PI) / 180,
    (droneAttitudeDeg.yawDeg * Math.PI) / 180,
    (droneAttitudeDeg.rollDeg * Math.PI) / 180,
    "YXZ"
  );
  camera.quaternion.setFromEuler(euler);
  camera.updateMatrixWorld(true);

  return camera;
}

/**
 * Projects a 3D world position through the camera into Normalized Device Coordinates (NDC).
 * Returns NDC (x: [-1, 1], y: [-1, 1], z: [-1, 1]) and whether point is in front of camera lens.
 */
export function projectWorldToNdc(
  worldPoint: THREE.Vector3,
  camera: THREE.PerspectiveCamera
): { ndcX: number; ndcY: number; ndcZ: number; inFront: boolean } {
  // Check camera-space Z coordinate (camera looks along negative Z in its local space)
  const viewPos = worldPoint.clone().applyMatrix4(camera.matrixWorldInverse);
  const inFront = viewPos.z < -camera.near;

  const projected = worldPoint.clone().project(camera);
  return {
    ndcX: projected.x,
    ndcY: projected.y,
    ndcZ: projected.z,
    inFront,
  };
}

/**
 * Converts Three.js NDC [-1, 1] to normalized image coordinates [0, 1]
 * where (0,0) is top-left and (1,1) is bottom-right.
 */
export function ndcToNormalizedImage(ndcX: number, ndcY: number): NormalizedCenter2D {
  return {
    u: Math.max(0, Math.min(1, (ndcX + 1) / 2)),
    v: Math.max(0, Math.min(1, (1 - ndcY) / 2)),
  };
}

/**
 * Evaluates the full geometric projection of a circular helipad landing target
 * into a downward-facing camera image.
 */
export function evaluateHelipadProjection(
  camera: THREE.PerspectiveCamera,
  dronePos: Vector3D,
  droneAttitudeDeg: { pitchDeg: number; rollDeg: number; yawDeg: number },
  helipadCenter: Vector3D,
  helipadRadiusMeters: number,
  helipadHeadingDeg = 0,
  imageWidth = 224,
  imageHeight = 224
): ProjectionResult {
  const padVec = new THREE.Vector3(helipadCenter.x, helipadCenter.y, helipadCenter.z);

  // 1. Project Helipad Center
  const centerNdc = projectWorldToNdc(padVec, camera);
  const centerRawU = (centerNdc.ndcX + 1) / 2;
  const centerRawV = (1 - centerNdc.ndcY) / 2;
  const centerNorm: NormalizedCenter2D = {
    u: Math.max(0, Math.min(1, centerRawU)),
    v: Math.max(0, Math.min(1, centerRawV)),
  };
  const centerPixel: PixelCenter2D = {
    x: Math.round(centerRawU * imageWidth * 10) / 10,
    y: Math.round(centerRawV * imageHeight * 10) / 10,
  };

  // 2. Relative Pose Computation in Aircraft Reference Frame
  const dxWorld = helipadCenter.x - dronePos.x;
  const dyWorld = dronePos.y - helipadCenter.y; // altitude above pad surface
  const dzWorld = helipadCenter.z - dronePos.z;

  const yawRad = (droneAttitudeDeg.yawDeg * Math.PI) / 180;
  // Rotate into drone-forward/lateral frame
  const relLateralM = dxWorld * Math.cos(yawRad) - dzWorld * Math.sin(yawRad);
  const relLongitudinalM = dxWorld * Math.sin(yawRad) + dzWorld * Math.cos(yawRad);
  let dYawDeg = droneAttitudeDeg.yawDeg - helipadHeadingDeg;
  while (dYawDeg > 180) dYawDeg -= 360;
  while (dYawDeg < -180) dYawDeg += 360;

  const distance3d = Math.hypot(dxWorld, dyWorld, dzWorld);

  const relativePose: RelativePose = {
    dx: Math.round(relLateralM * 100) / 100,
    dy: Math.round(dyWorld * 100) / 100,
    dz: Math.round(relLongitudinalM * 100) / 100,
    dYawDeg: Math.round(dYawDeg * 10) / 10,
    distance3d: Math.round(distance3d * 100) / 100,
  };

  // Check if center is behind camera lens
  if (!centerNdc.inFront || dyWorld <= 0.05) {
    return {
      centerNorm,
      centerPixel,
      bboxNorm: { xMin: 0, yMin: 0, xMax: 0, yMax: 0 },
      bboxPixel: { xMin: 0, yMin: 0, xMax: 0, yMax: 0 },
      apparentRadiusPixels: 0,
      isTruncated: true,
      visibility: "BEHIND_CAMERA",
      isValidTarget: false,
      invalidReasonCode: "BEHIND_CAMERA",
      relativePose,
    };
  }

  // 3. Project 32 perimeter vertices around the circular helipad
  const sampleCount = 32;
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  let isTruncated = false;
  let pointsInFront = 0;

  for (let i = 0; i < sampleCount; i++) {
    const angle = (i / sampleCount) * Math.PI * 2;
    const px = helipadCenter.x + Math.cos(angle) * helipadRadiusMeters;
    const pz = helipadCenter.z + Math.sin(angle) * helipadRadiusMeters;
    const rimPoint = new THREE.Vector3(px, helipadCenter.y, pz);

    const rimNdc = projectWorldToNdc(rimPoint, camera);
    if (rimNdc.inFront) {
      pointsInFront++;
      const u = (rimNdc.ndcX + 1) / 2;
      const v = (1 - rimNdc.ndcY) / 2;

      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;

      if (u < 0 || u > 1 || v < 0 || v > 1) {
        isTruncated = true;
      }
    } else {
      isTruncated = true;
    }
  }

  // 4. Bounding Box & Visibility Assessment
  const bboxRawNorm: BoundingBox2D = {
    xMin: minU !== Infinity ? minU : 0,
    yMin: minV !== Infinity ? minV : 0,
    xMax: maxU !== -Infinity ? maxU : 0,
    yMax: maxV !== -Infinity ? maxV : 0,
  };

  const isCompletelyOutOfFrame =
    bboxRawNorm.xMax < 0 ||
    bboxRawNorm.xMin > 1 ||
    bboxRawNorm.yMax < 0 ||
    bboxRawNorm.yMin > 1 ||
    pointsInFront === 0;

  const clampedBboxNorm: BoundingBox2D = {
    xMin: Math.max(0, Math.min(1, bboxRawNorm.xMin)),
    yMin: Math.max(0, Math.min(1, bboxRawNorm.yMin)),
    xMax: Math.max(0, Math.min(1, bboxRawNorm.xMax)),
    yMax: Math.max(0, Math.min(1, bboxRawNorm.yMax)),
  };

  const bboxPixel: BoundingBox2D = {
    xMin: Math.round(clampedBboxNorm.xMin * imageWidth),
    yMin: Math.round(clampedBboxNorm.yMin * imageHeight),
    xMax: Math.round(clampedBboxNorm.xMax * imageWidth),
    yMax: Math.round(clampedBboxNorm.yMax * imageHeight),
  };

  const apparentRadiusPixels =
    Math.round(
      Math.max(
        (bboxPixel.xMax - bboxPixel.xMin) / 2,
        (bboxPixel.yMax - bboxPixel.yMin) / 2
      ) * 10
    ) / 10;

  // Visibility determination
  let visibility: TargetVisibility = "FULLY_VISIBLE";
  let isValidTarget = true;
  let invalidReasonCode: InvalidReasonCode = "NONE";

  const tiltTotal = Math.hypot(droneAttitudeDeg.pitchDeg, droneAttitudeDeg.rollDeg);

  if (isCompletelyOutOfFrame) {
    visibility = "OUT_OF_FRAME";
    isValidTarget = false;
    invalidReasonCode = "OUT_OF_FRAME";
  } else if (dyWorld > 40.0) {
    visibility = "EXCESSIVE_DISTANCE";
    isValidTarget = false;
    invalidReasonCode = "ALTITUDE_OUT_OF_RANGE";
  } else if (tiltTotal > 28.0) {
    visibility = isTruncated ? "PARTIALLY_VISIBLE" : "FULLY_VISIBLE";
    isValidTarget = false;
    invalidReasonCode = "EXTREME_TILT";
  } else if (isTruncated) {
    visibility = "PARTIALLY_VISIBLE";
    // If center is outside or apparent size is tiny, mark invalid
    if (centerRawU < 0 || centerRawU > 1 || centerRawV < 0 || centerRawV > 1) {
      isValidTarget = false;
      invalidReasonCode = "TOO_FAR_OFF_AXIS";
    } else {
      isValidTarget = true;
    }
  } else {
    visibility = "FULLY_VISIBLE";
    isValidTarget = true;
  }

  return {
    centerNorm,
    centerPixel,
    bboxNorm: clampedBboxNorm,
    bboxPixel,
    apparentRadiusPixels,
    isTruncated,
    visibility,
    isValidTarget,
    invalidReasonCode,
    relativePose,
  };
}
