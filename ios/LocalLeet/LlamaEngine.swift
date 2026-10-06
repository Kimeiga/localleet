import Foundation
import llama

enum LlamaError: LocalizedError {
    case loadFailed, contextFailed, decodeFailed(Int32)
    var errorDescription: String? {
        switch self {
        case .loadFailed: return "Couldn't load the model file. It may be corrupt; delete it and download again."
        case .contextFailed: return "Couldn't create the model context. The device may be out of memory."
        case .decodeFailed(let code): return "The model failed while generating (code \(code)). Try a smaller model."
        }
    }
}

/// Minimal llama.cpp wrapper: load a GGUF onto the GPU (Metal) and stream a reply.
/// Not thread-safe; NativeAI only uses it from one serial queue.
final class LlamaEngine {
    private let model: OpaquePointer
    private let ctx: OpaquePointer
    private let vocab: OpaquePointer
    private let nCtx: Int32

    private static let backend: Void = {
        llama_log_set({ _, _, _ in }, nil) // keep the console quiet
        llama_backend_init()
    }()

    init(path: String, contextLength: Int32 = 4096) throws {
        _ = Self.backend
        var mparams = llama_model_default_params()
        mparams.n_gpu_layers = 999 // everything on the GPU
        guard let model = llama_model_load_from_file(path, mparams) else { throw LlamaError.loadFailed }

        var cparams = llama_context_default_params()
        cparams.n_ctx = UInt32(contextLength)
        cparams.n_batch = 512
        cparams.n_ubatch = 512
        let threads = Int32(max(1, min(4, ProcessInfo.processInfo.activeProcessorCount - 2)))
        cparams.n_threads = threads
        cparams.n_threads_batch = threads
        guard let ctx = llama_init_from_model(model, cparams) else {
            llama_model_free(model)
            throw LlamaError.contextFailed
        }
        self.model = model
        self.ctx = ctx
        self.vocab = llama_model_get_vocab(model)
        self.nCtx = contextLength
    }

    deinit {
        llama_free(ctx)
        llama_model_free(model)
    }

    /// ChatML prompt (used by both Qwen2.5-Coder and Ornith/Qwen3.5).
    static func chatML(_ messages: [(role: String, content: String)], disableThinking: Bool) -> String {
        var prompt = ""
        for m in messages {
            prompt += "<|im_start|>\(m.role)\n\(m.content)<|im_end|>\n"
        }
        prompt += "<|im_start|>assistant\n"
        if disableThinking { prompt += "<think>\n\n</think>\n\n" }
        return prompt
    }

    func generate(prompt: String, maxTokens: Int, temperature: Float,
                  isCancelled: () -> Bool, onText: (String) -> Void) throws -> String {
        llama_memory_clear(llama_get_memory(ctx), true)

        var tokens = tokenize(prompt)
        let room = Int(nCtx) - maxTokens - 8
        if tokens.count > room { tokens = Array(tokens.suffix(max(room, 1))) }

        // Feed the prompt in batches.
        var start = 0
        while start < tokens.count {
            let end = min(start + 512, tokens.count)
            var chunk = Array(tokens[start..<end])
            let rc = chunk.withUnsafeMutableBufferPointer { buf in
                llama_decode(ctx, llama_batch_get_one(buf.baseAddress, Int32(buf.count)))
            }
            if rc != 0 { throw LlamaError.decodeFailed(rc) }
            start = end
            if isCancelled() { return "" }
        }

        let sampler = makeSampler(temperature: temperature)
        defer { llama_sampler_free(sampler) }

        var output = ""
        var pending: [UInt8] = [] // bytes of a not-yet-complete UTF-8 character
        for _ in 0..<maxTokens {
            if isCancelled() { break }
            var token = llama_sampler_sample(sampler, ctx, -1)
            if llama_vocab_is_eog(vocab, token) { break }
            pending += piece(token)
            if let text = String(bytes: pending, encoding: .utf8) {
                output += text
                pending.removeAll()
                onText(Self.stripThinking(output))
            } else if pending.count > 16 {
                output += String(decoding: pending, as: UTF8.self)
                pending.removeAll()
            }
            let rc = withUnsafeMutablePointer(to: &token) { ptr in
                llama_decode(ctx, llama_batch_get_one(ptr, 1))
            }
            if rc != 0 { throw LlamaError.decodeFailed(rc) }
        }
        return Self.stripThinking(output)
    }

    /// Drop any <think>…</think> block a reasoning model emits anyway.
    static func stripThinking(_ text: String) -> String {
        guard let open = text.range(of: "<think>") else { return text }
        if let close = text.range(of: "</think>", range: open.upperBound..<text.endIndex) {
            return (String(text[..<open.lowerBound]) + String(text[close.upperBound...]))
                .trimmingCharacters(in: .whitespacesAndNewlines)
        }
        return String(text[..<open.lowerBound]) // still thinking: show nothing new yet
    }

    private func tokenize(_ text: String) -> [llama_token] {
        let length = Int32(text.utf8.count)
        var tokens = [llama_token](repeating: 0, count: Int(length) + 16)
        var n = llama_tokenize(vocab, text, length, &tokens, Int32(tokens.count), false, true)
        if n < 0 {
            tokens = [llama_token](repeating: 0, count: Int(-n))
            n = llama_tokenize(vocab, text, length, &tokens, Int32(tokens.count), false, true)
        }
        return Array(tokens.prefix(Int(max(n, 0))))
    }

    private func piece(_ token: llama_token) -> [UInt8] {
        var buf = [CChar](repeating: 0, count: 64)
        var n = llama_token_to_piece(vocab, token, &buf, Int32(buf.count), 0, false)
        if n < 0 {
            buf = [CChar](repeating: 0, count: Int(-n))
            n = llama_token_to_piece(vocab, token, &buf, Int32(buf.count), 0, false)
        }
        return buf.prefix(Int(max(n, 0))).map { UInt8(bitPattern: $0) }
    }

    private func makeSampler(temperature: Float) -> UnsafeMutablePointer<llama_sampler> {
        let chain = llama_sampler_chain_init(llama_sampler_chain_default_params())!
        if temperature <= 0 {
            llama_sampler_chain_add(chain, llama_sampler_init_greedy())
            return chain
        }
        llama_sampler_chain_add(chain, llama_sampler_init_top_k(40))
        llama_sampler_chain_add(chain, llama_sampler_init_penalties(llama_vocab_n_tokens(vocab), 64, 1.1, 0, 0))
        llama_sampler_chain_add(chain, llama_sampler_init_top_p(0.9, 1))
        llama_sampler_chain_add(chain, llama_sampler_init_temp(temperature))
        llama_sampler_chain_add(chain, llama_sampler_init_dist(UInt32.random(in: 0...UInt32.max)))
        return chain
    }
}
