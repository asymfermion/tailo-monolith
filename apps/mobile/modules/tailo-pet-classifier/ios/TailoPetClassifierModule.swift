import CoreML
import ExpoModulesCore
import Photos
import UIKit
import Vision

public class TailoPetClassifierModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TailoPetClassifier")

    AsyncFunction("classify") { (uri: String) async throws -> [String: Any] in
      let image = try await loadImage(uri: uri)
      let result = try classifyPet(in: image)

      return [
        "label": result.label,
        "confidence": result.confidence,
      ]
    }
  }
}

private enum TailoPetClassifierError: Error {
  case imageNotFound
  case invalidImage
  case noClassification
}

private struct PetClassificationResult {
  let label: String
  let confidence: Double
}

private let minimumAnimalConfidence: VNConfidence = 0.35

private func loadImage(uri: String) async throws -> UIImage {
  if uri.hasPrefix("ph://") {
    return try await loadPhotosImage(localIdentifier: String(uri.dropFirst(5)))
  }

  if let url = URL(string: uri), url.isFileURL {
    guard let image = UIImage(contentsOfFile: url.path) else {
      throw TailoPetClassifierError.imageNotFound
    }
    return image
  }

  if let image = UIImage(contentsOfFile: uri) {
    return image
  }

  throw TailoPetClassifierError.imageNotFound
}

private func loadPhotosImage(localIdentifier: String) async throws -> UIImage {
  try await withCheckedThrowingContinuation { continuation in
    let assets = PHAsset.fetchAssets(
      withLocalIdentifiers: [localIdentifier],
      options: nil
    )

    guard let asset = assets.firstObject else {
      continuation.resume(throwing: TailoPetClassifierError.imageNotFound)
      return
    }

    let lock = NSLock()
    var hasResumed = false

    func resumeOnce(with result: Result<UIImage, Error>) {
      lock.lock()
      defer { lock.unlock() }

      guard !hasResumed else {
        return
      }

      hasResumed = true

      switch result {
      case .success(let image):
        continuation.resume(returning: image)
      case .failure(let error):
        continuation.resume(throwing: error)
      }
    }

    let options = PHImageRequestOptions()
    options.deliveryMode = .highQualityFormat
    options.isNetworkAccessAllowed = true
    options.isSynchronous = false
    options.resizeMode = .fast

    PHImageManager.default().requestImage(
      for: asset,
      targetSize: CGSize(width: 384, height: 384),
      contentMode: .aspectFill,
      options: options
    ) { image, info in
      if let cancelled = info?[PHImageCancelledKey] as? Bool, cancelled {
        resumeOnce(with: .failure(TailoPetClassifierError.imageNotFound))
        return
      }

      if let error = info?[PHImageErrorKey] as? Error {
        resumeOnce(with: .failure(error))
        return
      }

      if let degraded = info?[PHImageResultIsDegradedKey] as? Bool, degraded {
        return
      }

      guard let image else {
        resumeOnce(with: .failure(TailoPetClassifierError.imageNotFound))
        return
      }

      resumeOnce(with: .success(image))
    }
  }
}

private func classifyPet(in image: UIImage) throws -> PetClassificationResult {
  guard let cgImage = image.cgImage else {
    throw TailoPetClassifierError.invalidImage
  }

  if let bundled = try classifyWithBundledModel(cgImage: cgImage, image: image) {
    return bundled
  }

  if let animal = try classifyWithAnimals(cgImage: cgImage, image: image) {
    return animal
  }

  return PetClassificationResult(label: "other", confidence: 0)
}

private func classifyWithAnimals(
  cgImage: CGImage,
  image: UIImage
) throws -> PetClassificationResult? {
  let request = VNRecognizeAnimalsRequest()
  let handler = VNImageRequestHandler(
    cgImage: cgImage,
    orientation: image.cgImagePropertyOrientation,
    options: [:]
  )
  try handler.perform([request])

  guard let observations = request.results, !observations.isEmpty else {
    return nil
  }

  guard let bestObservation = observations.max(by: { $0.confidence < $1.confidence }),
        let topLabel = bestObservation.labels.first else {
    return nil
  }

  let petLabel = normalizeAnimalIdentifier(topLabel.identifier)

  guard petLabel == "dog" || petLabel == "cat" else {
    return nil
  }

  guard topLabel.confidence >= minimumAnimalConfidence else {
    return nil
  }

  return PetClassificationResult(
    label: petLabel,
    confidence: Double(topLabel.confidence)
  )
}

private func classifyWithBundledModel(
  cgImage: CGImage,
  image: UIImage
) throws -> PetClassificationResult? {
  guard let modelURL = Bundle.main.url(
    forResource: "TailoPetClassifier",
    withExtension: "mlmodelc"
  ) else {
    return nil
  }

  let coreMLModel = try MLModel(contentsOf: modelURL)
  let visionModel = try VNCoreMLModel(for: coreMLModel)
  let request = VNCoreMLRequest(model: visionModel)
  request.imageCropAndScaleOption = .centerCrop

  let handler = VNImageRequestHandler(
    cgImage: cgImage,
    orientation: image.cgImagePropertyOrientation,
    options: [:]
  )
  try handler.perform([request])

  guard let observation = request.results?.first as? VNClassificationObservation else {
    throw TailoPetClassifierError.noClassification
  }

  let label = normalizeAnimalIdentifier(observation.identifier)

  guard label == "dog" || label == "cat" else {
    return nil
  }

  guard observation.confidence >= minimumAnimalConfidence else {
    return nil
  }

  return PetClassificationResult(label: label, confidence: Double(observation.confidence))
}

private func normalizeAnimalIdentifier(_ identifier: String) -> String {
  let normalized = identifier
    .lowercased()
    .trimmingCharacters(in: .whitespacesAndNewlines)

  switch normalized {
  case "dog", "cat":
    return normalized
  default:
    break
  }

  if normalized.hasSuffix(".dog") || normalized.hasSuffix("/dog") {
    return "dog"
  }

  if normalized.hasSuffix(".cat") || normalized.hasSuffix("/cat") {
    return "cat"
  }

  return "other"
}

private extension UIImage {
  var cgImagePropertyOrientation: CGImagePropertyOrientation {
    switch imageOrientation {
    case .up:
      return .up
    case .down:
      return .down
    case .left:
      return .left
    case .right:
      return .right
    case .upMirrored:
      return .upMirrored
    case .downMirrored:
      return .downMirrored
    case .leftMirrored:
      return .leftMirrored
    case .rightMirrored:
      return .rightMirrored
    @unknown default:
      return .up
    }
  }
}
