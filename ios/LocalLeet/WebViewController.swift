import UIKit
import WebKit

final class WebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    private var webView: WKWebView!
    private var server: LocalWebServer?
    private var appURL: URL?
    private let bridge = NativeBridge()

    override func loadView() {
        let config = WKWebViewConfiguration()
        let content = WKUserContentController()
        content.addScriptMessageHandler(bridge, contentWorld: .page, name: "localleet")
        content.addUserScript(WKUserScript(
            source: "window.LocalLeetNative = \(Self.nativeInfoJSON());",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true))
        config.userContentController = content
        config.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.isOpaque = false
        let background = UIColor(named: "LaunchBackground") ?? .systemBackground
        webView.backgroundColor = background
        webView.scrollView.backgroundColor = background
        // The page handles safe areas itself (viewport-fit=cover + env(safe-area-inset-*)).
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsBackForwardNavigationGestures = false
        webView.allowsLinkPreview = false
        if #available(iOS 16.4, *) {
            webView.isInspectable = true // Safari → Develop menu, for debugging
        }
        bridge.webView = webView
        self.webView = webView
        view = webView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        guard let root = Bundle.main.url(forResource: "web", withExtension: nil) else {
            return showError("The app bundle is missing its web files. Rebuild after running ios/scripts/prepare.sh.")
        }
        let server = LocalWebServer(root: root)
        self.server = server
        server.start { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let port):
                    let url = URL(string: "http://127.0.0.1:\(port)/")!
                    self?.appURL = url
                    self?.webView.load(URLRequest(url: url))
                case .failure(let error):
                    self?.showError("Couldn't start the app's local server: \(error.localizedDescription)")
                }
            }
        }
    }

    private static func nativeInfoJSON() -> String {
        let info: [String: Any] = [
            "platform": "ios",
            "appVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "",
            "ramGB": Double(ProcessInfo.processInfo.physicalMemory) / 1_073_741_824,
        ]
        let data = (try? JSONSerialization.data(withJSONObject: info)) ?? Data("{}".utf8)
        return String(decoding: data, as: UTF8.self)
    }

    private func showError(_ message: String) {
        let html = "<html><body style='font:17px -apple-system;padding:40px;color:#c7362f'>\(message)</body></html>"
        webView.loadHTMLString(html, baseURL: nil)
    }

    // MARK: - Navigation

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let url = navigationAction.request.url,
           let scheme = url.scheme, scheme == "http" || scheme == "https",
           url.host != "127.0.0.1" {
            UIApplication.shared.open(url) // external links open in Safari
            return decisionHandler(.cancel)
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url { UIApplication.shared.open(url) }
        return nil
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        // iOS can kill the web process under memory pressure; reload the app.
        if let appURL { webView.load(URLRequest(url: appURL)) }
    }

    // MARK: - alert() / confirm() (the web app uses confirm for destructive actions)

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        present(alert, animated: true)
    }
}
