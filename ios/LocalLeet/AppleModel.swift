import Foundation
#if canImport(FoundationModels)
import FoundationModels
#endif

/// Apple's on-device foundation model (iOS 26+, Apple Intelligence devices).
/// No download: it ships with the OS.
enum AppleModel {
    static func availability() -> (Bool, String?) {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            switch SystemLanguageModel.default.availability {
            case .available:
                return (true, nil)
            case .unavailable(let reason):
                switch reason {
                case .deviceNotEligible:
                    return (false, "This device doesn't support Apple Intelligence.")
                case .appleIntelligenceNotEnabled:
                    return (false, "Turn on Apple Intelligence in Settings to use this model.")
                case .modelNotReady:
                    return (false, "Apple's model is still downloading. Try again later.")
                @unknown default:
                    return (false, "Apple's on-device model isn't available.")
                }
            }
        }
        #endif
        return (false, "Needs iOS 26 or newer.")
    }

    static func generate(system: String, prompt: String, maxTokens: Int, temperature: Double,
                         isCancelled: @escaping () -> Bool, onText: @escaping (String) -> Void) async throws -> String {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            let session = LanguageModelSession(instructions: system)
            let options = GenerationOptions(temperature: temperature, maximumResponseTokens: maxTokens)
            var text = ""
            for try await snapshot in session.streamResponse(to: prompt, options: options) {
                if isCancelled() { break }
                text = snapshot.content
                onText(text)
            }
            return text
        }
        #endif
        throw NativeAIError.unavailable("Needs iOS 26 or newer.")
    }
}
