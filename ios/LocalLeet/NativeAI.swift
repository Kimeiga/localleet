import Foundation
import UIKit

struct LocalModel {
    enum Kind { case apple, gguf }
    let key: String
    let label: String
    let note: String
    let kind: Kind
    let url: URL?
    let sizeBytes: Int64
    let minRAMGB: Double
    /// Qwen3.5-family models think by default; an empty think block turns it off.
    let disableThinking: Bool
}

enum NativeAIError: LocalizedError {
    case unknownModel(String), unavailable(String), notLoaded, busy, downloadFailed(String)
    var errorDescription: String? {
        switch self {
        case .unknownModel(let k): return "Unknown model \(k)"
        case .unavailable(let why): return why
        case .notLoaded: return "No model is loaded."
        case .busy: return "The model is busy. Wait for the current answer or tap Stop."
        case .downloadFailed(let why): return "Download failed: \(why)"
        }
    }
}

/// Manages on-device models: Apple's built-in model (iOS 26+) and GGUF models
/// run with llama.cpp on the GPU (Metal). Downloads go to Application Support.
final class NativeAI: NSObject, URLSessionDownloadDelegate {
    var onEvent: (([String: Any]) -> Void)?

    static let catalog: [LocalModel] = [
        LocalModel(key: "apple", label: "Apple on-device model",
                   note: "Built into iOS 26 on Apple Intelligence devices. No download.",
                   kind: .apple, url: nil, sizeBytes: 0, minRAMGB: 0, disableThinking: false),
        LocalModel(key: "coder-1.5b", label: "Qwen2.5-Coder 1.5B",
                   note: "Small and fast coding model. Works on most iPhones.",
                   kind: .gguf,
                   url: URL(string: "https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf"),
                   sizeBytes: 1_117_320_768, minRAMGB: 3.5, disableThinking: false),
        LocalModel(key: "ornith-9b", label: "Ornith 1.5 9B",
                   note: "Much smarter, but slow. Best on iPhones with 12 GB of RAM (17 Pro and newer) or M-series iPads.",
                   kind: .gguf,
                   url: URL(string: "https://huggingface.co/ornith-ai/Ornith-1.5-9B-GGUF/resolve/main/Ornith-1.5-9B-Q4_K_M.gguf"),
                   sizeBytes: 5_780_090_816, minRAMGB: 7.5, disableThinking: true),
    ]

    private let ramGB = Double(ProcessInfo.processInfo.physicalMemory) / 1_073_741_824
    private let llamaQueue = DispatchQueue(label: "localleet.llama", qos: .userInitiated)
    private var llama: LlamaEngine?
    private var loadedKey: String?
    private var generating = false
    private let cancelLock = NSLock()
    private var cancelled = false

    private lazy var session = URLSession(configuration: .default, delegate: self, delegateQueue: nil)
    private var downloadContinuations: [Int: (key: String, cont: CheckedContinuation<Void, Error>)] = [:]
    private var lastProgressEmit: [Int: Date] = [:]
    private let stateLock = NSLock()

    // MARK: - Dispatch

    func handle(method: String, params: [String: Any]) async throws -> Any {
        switch method {
        case "list":
            return list()
        case "load":
            try await load(key: params["key"] as? String ?? "")
            return true
        case "chat":
            return try await chat(params)
        case "stop":
            setCancelled(true)
            return true
        case "delete":
            try delete(key: params["key"] as? String ?? "")
            return true
        case "unload":
            unload()
            return true
        default:
            throw NativeAIError.unavailable("Unknown method \(method)")
        }
    }

    // MARK: - Catalog

    private func model(_ key: String) throws -> LocalModel {
        guard let m = Self.catalog.first(where: { $0.key == key }) else { throw NativeAIError.unknownModel(key) }
        return m
    }

    private static var modelsDir: URL {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Models", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    private func fileURL(for m: LocalModel) -> URL? {
        guard let url = m.url else { return nil }
        return Self.modelsDir.appendingPathComponent(url.lastPathComponent)
    }

    private func isDownloaded(_ m: LocalModel) -> Bool {
        guard let file = fileURL(for: m) else { return m.kind == .apple }
        return FileManager.default.fileExists(atPath: file.path)
    }

    private func availability(_ m: LocalModel) -> (Bool, String?) {
        switch m.kind {
        case .apple:
            return AppleModel.availability()
        case .gguf:
            if ramGB + 0.25 < m.minRAMGB {
                return (false, String(format: "Needs about %.0f GB of RAM; this device has %.0f GB.", m.minRAMGB, ramGB))
            }
            return (true, nil)
        }
    }

    private func list() -> [[String: Any]] {
        Self.catalog.map { m in
            let (available, reason) = availability(m)
            return [
                "key": m.key,
                "label": m.label,
                "note": m.note,
                "engine": m.kind == .apple ? "apple" : "llama",
                "size": m.sizeBytes > 0 ? ByteCountFormatter.string(fromByteCount: m.sizeBytes, countStyle: .file) : "",
                "downloaded": isDownloaded(m),
                "available": available,
                "reason": reason ?? NSNull(),
                "loaded": loadedKey == m.key,
            ]
        }
    }

    // MARK: - Load / unload

    private func load(key: String) async throws {
        let m = try model(key)
        let (available, reason) = availability(m)
        guard available else { throw NativeAIError.unavailable(reason ?? "This model isn't available on this device.") }
        if loadedKey == key { return }
        unload()

        switch m.kind {
        case .apple:
            loadedKey = key
        case .gguf:
            guard let file = fileURL(for: m), let url = m.url else { return }
            if !FileManager.default.fileExists(atPath: file.path) {
                try await download(url, to: file, key: key)
            }
            emit(["type": "progress", "key": key, "progress": 1.0, "text": "Loading model…"])
            let engine: LlamaEngine = try await withCheckedThrowingContinuation { cont in
                llamaQueue.async {
                    do { cont.resume(returning: try LlamaEngine(path: file.path)) } catch { cont.resume(throwing: error) }
                }
            }
            llama = engine
            loadedKey = key
        }
    }

    private func unload() {
        let engine = llama
        llama = nil
        loadedKey = nil
        // Free on the llama queue so it never races a running generation.
        llamaQueue.async { _ = engine }
    }

    private func delete(key: String) throws {
        let m = try model(key)
        if loadedKey == key { unload() }
        if let file = fileURL(for: m), FileManager.default.fileExists(atPath: file.path) {
            try FileManager.default.removeItem(at: file)
        }
    }

    // MARK: - Chat

    private func setCancelled(_ value: Bool) {
        cancelLock.lock(); cancelled = value; cancelLock.unlock()
    }

    private func isCancelled() -> Bool {
        cancelLock.lock(); defer { cancelLock.unlock() }
        return cancelled
    }

    private func chat(_ params: [String: Any]) async throws -> String {
        guard let key = loadedKey, let m = Self.catalog.first(where: { $0.key == key }) else { throw NativeAIError.notLoaded }
        guard !generating else { throw NativeAIError.busy }
        let requestId = params["requestId"] as? String ?? ""
        let maxTokens = params["maxTokens"] as? Int ?? 320
        let temperature = (params["temperature"] as? Double) ?? 0.3
        let raw = params["messages"] as? [[String: Any]] ?? []
        let messages: [(role: String, content: String)] = raw.compactMap {
            guard let role = $0["role"] as? String, let content = $0["content"] as? String else { return nil }
            return (role, content)
        }
        generating = true
        setCancelled(false)
        defer { generating = false }

        let onText: (String) -> Void = { [weak self] text in
            self?.emit(["type": "token", "requestId": requestId, "text": text])
        }

        switch m.kind {
        case .apple:
            let system = messages.first(where: { $0.role == "system" })?.content ?? ""
            let turns = messages.filter { $0.role != "system" }
            let transcript = turns.dropLast().map { ($0.role == "user" ? "Student: " : "Tutor: ") + $0.content }
            let latest = turns.last?.content ?? ""
            let prompt = (transcript + ["Student: " + latest]).joined(separator: "\n\n")
            return try await AppleModel.generate(system: system, prompt: prompt, maxTokens: maxTokens,
                                                 temperature: temperature,
                                                 isCancelled: { [weak self] in self?.isCancelled() ?? true },
                                                 onText: onText)
        case .gguf:
            guard let engine = llama else { throw NativeAIError.notLoaded }
            let prompt = LlamaEngine.chatML(messages, disableThinking: m.disableThinking)
            return try await withCheckedThrowingContinuation { cont in
                llamaQueue.async { [weak self] in
                    do {
                        let text = try engine.generate(prompt: prompt, maxTokens: maxTokens, temperature: Float(temperature),
                                                       isCancelled: { self?.isCancelled() ?? true }, onText: onText)
                        cont.resume(returning: text)
                    } catch {
                        cont.resume(throwing: error)
                    }
                }
            }
        }
    }

    // MARK: - Downloads

    private func download(_ url: URL, to destination: URL, key: String) async throws {
        let bgTask = await MainActor.run { () -> UIBackgroundTaskIdentifier in
            UIApplication.shared.isIdleTimerDisabled = true // keep the screen on while downloading
            return UIApplication.shared.beginBackgroundTask(withName: "model-download")
        }
        defer {
            Task { @MainActor in
                UIApplication.shared.isIdleTimerDisabled = false
                if bgTask != .invalid { UIApplication.shared.endBackgroundTask(bgTask) }
            }
        }
        emit(["type": "progress", "key": key, "progress": 0.0, "text": "Starting download…"])
        try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
            let task = session.downloadTask(with: url)
            task.taskDescription = destination.path
            stateLock.lock()
            downloadContinuations[task.taskIdentifier] = (key, cont)
            stateLock.unlock()
            task.resume()
        }
    }

    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didWriteData bytesWritten: Int64,
                    totalBytesWritten: Int64, totalBytesExpectedToWrite: Int64) {
        let id = downloadTask.taskIdentifier
        stateLock.lock()
        let key = downloadContinuations[id]?.key
        let last = lastProgressEmit[id] ?? .distantPast
        let due = Date().timeIntervalSince(last) > 0.25
        if due { lastProgressEmit[id] = Date() }
        stateLock.unlock()
        guard let key, due else { return }
        let total = totalBytesExpectedToWrite > 0 ? totalBytesExpectedToWrite : (try? model(key).sizeBytes) ?? 0
        let progress = total > 0 ? Double(totalBytesWritten) / Double(total) : 0
        let fmt = { ByteCountFormatter.string(fromByteCount: $0, countStyle: .file) }
        emit(["type": "progress", "key": key, "progress": min(progress, 0.999),
              "text": "Downloading \(fmt(totalBytesWritten)) of \(fmt(total))"])
    }

    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
        // The temp file is deleted when this method returns, so move it now.
        guard let path = downloadTask.taskDescription else { return }
        let destination = URL(fileURLWithPath: path)
        if let http = downloadTask.response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            finishDownload(downloadTask.taskIdentifier, error: NativeAIError.downloadFailed("HTTP \(http.statusCode)"))
            return
        }
        do {
            try? FileManager.default.removeItem(at: destination)
            try FileManager.default.moveItem(at: location, to: destination)
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            var dest = destination
            try? dest.setResourceValues(values)
            finishDownload(downloadTask.taskIdentifier, error: nil)
        } catch {
            finishDownload(downloadTask.taskIdentifier, error: NativeAIError.downloadFailed(error.localizedDescription))
        }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let error {
            finishDownload(task.taskIdentifier, error: NativeAIError.downloadFailed(error.localizedDescription))
        }
    }

    private func finishDownload(_ id: Int, error: Error?) {
        stateLock.lock()
        let entry = downloadContinuations.removeValue(forKey: id)
        lastProgressEmit.removeValue(forKey: id)
        stateLock.unlock()
        if let error { entry?.cont.resume(throwing: error) } else { entry?.cont.resume() }
    }

    private func emit(_ event: [String: Any]) {
        onEvent?(event)
    }
}
