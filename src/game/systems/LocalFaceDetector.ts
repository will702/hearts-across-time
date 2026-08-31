export interface LocalDetectedFace {
  boundingBox: DOMRectReadOnly;
}

export interface LocalFaceDetector {
  detect(source: CanvasImageSource): Promise<LocalDetectedFace[]>;
  close(): void;
}

export async function createLocalFaceDetector(): Promise<LocalFaceDetector> {
  const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
  const useSimd = await FilesetResolver.isSimdSupported();
  const assetUrl = (path: string): string => new URL(path, document.baseURI).href;
  const detector = await FaceDetector.createFromOptions({
    wasmLoaderPath: assetUrl(useSimd
      ? 'assets/mediapipe/vision_wasm_internal.js'
      : 'assets/mediapipe/vision_wasm_nosimd_internal.js'),
    wasmBinaryPath: assetUrl(useSimd
      ? 'assets/mediapipe/vision_wasm_internal.wasm'
      : 'assets/mediapipe/vision_wasm_nosimd_internal.wasm'),
  }, {
    baseOptions: {
      modelAssetPath: assetUrl('assets/models/blaze_face_short_range.tflite'),
    },
    runningMode: 'VIDEO',
    minDetectionConfidence: 0.55,
    minSuppressionThreshold: 0.3,
  });

  return {
    async detect(source): Promise<LocalDetectedFace[]> {
      const result = detector.detectForVideo(source as HTMLVideoElement, performance.now());
      return result.detections.flatMap((detection) => {
        const box = detection.boundingBox;
        if (!box) return [];
        return [{
          boundingBox: new DOMRectReadOnly(box.originX, box.originY, box.width, box.height),
        }];
      });
    },
    close(): void {
      detector.close();
    },
  };
}
