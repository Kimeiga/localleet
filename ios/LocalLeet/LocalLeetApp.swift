import SwiftUI

@main
struct LocalLeetApp: App {
    var body: some Scene {
        WindowGroup {
            WebAppView()
                .ignoresSafeArea()
                .background(Color("LaunchBackground"))
        }
    }
}

/// Hosts the LocalLeet web app (UI, problems, offline Python) in a WKWebView.
struct WebAppView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> WebViewController { WebViewController() }
    func updateUIViewController(_ controller: WebViewController, context: Context) {}
}
