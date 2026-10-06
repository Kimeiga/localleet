import Foundation
import WebKit

/// JavaScript ⇄ Swift bridge. The page calls
///   window.webkit.messageHandlers.localleet.postMessage({ method, params })
/// which returns a Promise resolved with the reply. Streaming updates (download
/// progress, generated text) are pushed with window.__localleetNativeEvent(event).
final class NativeBridge: NSObject, WKScriptMessageHandlerWithReply {
    weak var webView: WKWebView?
    private let ai = NativeAI()

    override init() {
        super.init()
        ai.onEvent = { [weak self] event in self?.emit(event) }
    }

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        guard let body = message.body as? [String: Any], let method = body["method"] as? String else {
            replyHandler(nil, "Malformed message")
            return
        }
        let params = body["params"] as? [String: Any] ?? [:]
        Task {
            do {
                let result = try await self.ai.handle(method: method, params: params)
                await MainActor.run { replyHandler(result, nil) }
            } catch {
                await MainActor.run { replyHandler(nil, error.localizedDescription) }
            }
        }
    }

    private func emit(_ event: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: event) else { return }
        let json = String(decoding: data, as: UTF8.self)
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript("window.__localleetNativeEvent && window.__localleetNativeEvent(\(json))",
                                              completionHandler: nil)
        }
    }
}
