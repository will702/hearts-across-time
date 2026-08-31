export interface CameraSourceSize {
  width: number;
  height: number;
}

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceSlot {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CameraTransform {
  x: number;
  y: number;
  scale: number;
}

const safeSource = (source: CameraSourceSize): CameraSourceSize => ({
  width: source.width > 0 ? source.width : 16,
  height: source.height > 0 ? source.height : 9,
});

export function containCameraTransform(
  slot: FaceSlot,
  source: CameraSourceSize,
  sizeFactor = 1,
): CameraTransform {
  const safe = safeSource(source);
  return {
    x: slot.x,
    y: slot.y,
    scale: Math.min(slot.width / safe.width, slot.height / safe.height) * sizeFactor,
  };
}

export function trackFaceTransform(
  source: CameraSourceSize,
  face: FaceBox,
  slot: FaceSlot,
  occupancy = 0.8,
): CameraTransform {
  const safe = safeSource(source);
  const faceWidth = Math.max(1, face.width);
  const faceHeight = Math.max(1, face.height);
  const scale = Math.min(
    slot.width * occupancy / faceWidth,
    slot.height * occupancy / faceHeight,
  );
  const mirroredFaceX = safe.width - (face.x + faceWidth / 2);
  const faceY = face.y + faceHeight / 2;
  return {
    x: slot.x - (mirroredFaceX - safe.width / 2) * scale,
    y: slot.y - (faceY - safe.height / 2) * scale,
    scale,
  };
}

export function trackFaceGroupTransform(
  source: CameraSourceSize,
  faces: readonly FaceBox[],
  slots: readonly FaceSlot[],
  occupancy = 0.8,
): CameraTransform | undefined {
  if (faces.length === 0 || slots.length === 0) return undefined;
  if (faces.length === 1 || slots.length === 1) {
    return trackFaceTransform(source, faces[0], slots[0], occupancy);
  }

  const safe = safeSource(source);
  const mirroredFaces = faces.slice(0, slots.length).map(face => ({
    ...face,
    centerX: safe.width - (face.x + face.width / 2),
    centerY: face.y + face.height / 2,
  })).sort((a, b) => a.centerX - b.centerX);
  const orderedSlots = slots.slice(0, mirroredFaces.length).sort((a, b) => a.x - b.x);
  const faceLeft = Math.min(...mirroredFaces.map(face => face.centerX - face.width / 2));
  const faceRight = Math.max(...mirroredFaces.map(face => face.centerX + face.width / 2));
  const faceTop = Math.min(...mirroredFaces.map(face => face.centerY - face.height / 2));
  const faceBottom = Math.max(...mirroredFaces.map(face => face.centerY + face.height / 2));
  const slotLeft = Math.min(...orderedSlots.map(slot => slot.x - slot.width / 2));
  const slotRight = Math.max(...orderedSlots.map(slot => slot.x + slot.width / 2));
  const slotTop = Math.min(...orderedSlots.map(slot => slot.y - slot.height / 2));
  const slotBottom = Math.max(...orderedSlots.map(slot => slot.y + slot.height / 2));
  const scale = Math.min(
    (slotRight - slotLeft) * occupancy / Math.max(1, faceRight - faceLeft),
    (slotBottom - slotTop) * occupancy / Math.max(1, faceBottom - faceTop),
  );
  const faceCenterX = (faceLeft + faceRight) / 2;
  const faceCenterY = (faceTop + faceBottom) / 2;
  const slotCenterX = (slotLeft + slotRight) / 2;
  const slotCenterY = (slotTop + slotBottom) / 2;
  return {
    x: slotCenterX - (faceCenterX - safe.width / 2) * scale,
    y: slotCenterY - (faceCenterY - safe.height / 2) * scale,
    scale,
  };
}

export function smoothCameraTransform(
  current: CameraTransform,
  target: CameraTransform,
  deltaMs: number,
  response = 8,
): CameraTransform {
  const amount = 1 - Math.exp(-response * Math.max(0, deltaMs) / 1000);
  return {
    x: current.x + (target.x - current.x) * amount,
    y: current.y + (target.y - current.y) * amount,
    scale: current.scale + (target.scale - current.scale) * amount,
  };
}

export function cameraDisplaySize(
  source: CameraSourceSize,
  transform: CameraTransform,
): CameraSourceSize {
  const safe = safeSource(source);
  return {
    width: safe.width * transform.scale,
    height: safe.height * transform.scale,
  };
}
