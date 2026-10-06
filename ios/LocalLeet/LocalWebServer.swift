import Foundation
import Network

/// Serves the bundled web app on 127.0.0.1 so it behaves like a normal website:
/// ES modules, module workers, WebAssembly and fetch() all need http(s), not file://.
/// Only static files from the app bundle are served, and only on the loopback interface.
final class LocalWebServer {
    /// A fixed port keeps the page origin stable, so localStorage (progress and
    /// saved code) survives app restarts.
    static let preferredPort: UInt16 = 47819

    private let root: URL
    private let queue = DispatchQueue(label: "localleet.webserver", attributes: .concurrent)
    private var listener: NWListener?

    init(root: URL) {
        self.root = root.standardizedFileURL.resolvingSymlinksInPath()
    }

    func start(completion: @escaping (Result<UInt16, Error>) -> Void) {
        start(port: Self.preferredPort, fallbackToAny: true, completion: completion)
    }

    private func start(port: UInt16, fallbackToAny: Bool, completion: @escaping (Result<UInt16, Error>) -> Void) {
        do {
            let params = NWParameters.tcp
            params.requiredInterfaceType = .loopback
            params.allowLocalEndpointReuse = true
            let nwPort = NWEndpoint.Port(rawValue: port) ?? .any
            let listener = try NWListener(using: params, on: nwPort)
            var finished = false
            listener.stateUpdateHandler = { [weak self] state in
                guard !finished else { return }
                switch state {
                case .ready:
                    finished = true
                    completion(.success(listener.port?.rawValue ?? port))
                case .failed(let error):
                    finished = true
                    listener.cancel()
                    if fallbackToAny {
                        self?.start(port: 0, fallbackToAny: false, completion: completion)
                    } else {
                        completion(.failure(error))
                    }
                default:
                    break
                }
            }
            listener.newConnectionHandler = { [weak self] connection in
                self?.handle(connection)
            }
            self.listener = listener
            listener.start(queue: queue)
        } catch {
            if fallbackToAny {
                start(port: 0, fallbackToAny: false, completion: completion)
            } else {
                completion(.failure(error))
            }
        }
    }

    // MARK: - HTTP

    private func handle(_ connection: NWConnection) {
        connection.start(queue: queue)
        receiveRequest(on: connection, buffer: Data())
    }

    private func receiveRequest(on connection: NWConnection, buffer: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 65_536) { [weak self] data, _, isComplete, error in
            guard let self else { return }
            var buffer = buffer
            if let data { buffer.append(data) }
            if let headerEnd = buffer.range(of: Data("\r\n\r\n".utf8)) {
                let head = String(decoding: buffer[..<headerEnd.lowerBound], as: UTF8.self)
                self.respond(to: head, on: connection)
            } else if error != nil || isComplete || buffer.count > 1_000_000 {
                connection.cancel()
            } else {
                self.receiveRequest(on: connection, buffer: buffer)
            }
        }
    }

    private func respond(to head: String, on connection: NWConnection) {
        let requestLine = head.split(separator: "\r\n", maxSplits: 1).first.map(String.init) ?? ""
        let parts = requestLine.split(separator: " ")
        guard parts.count >= 2 else { return send(status: "400 Bad Request", body: Data(), type: "text/plain", on: connection) }
        let method = String(parts[0])
        guard method == "GET" || method == "HEAD" else {
            return send(status: "405 Method Not Allowed", body: Data(), type: "text/plain", on: connection)
        }

        var path = String(parts[1])
        if let q = path.firstIndex(where: { $0 == "?" || $0 == "#" }) { path = String(path[..<q]) }
        path = path.removingPercentEncoding ?? path
        if path.hasSuffix("/") { path += "index.html" }

        let file = root.appendingPathComponent(String(path.drop(while: { $0 == "/" })))
            .standardizedFileURL.resolvingSymlinksInPath()
        guard file.path.hasPrefix(root.path + "/"),
              let body = try? Data(contentsOf: file, options: .mappedIfSafe) else {
            return send(status: "404 Not Found", body: Data("not found".utf8), type: "text/plain", on: connection)
        }
        send(status: "200 OK", body: method == "HEAD" ? Data() : body, type: Self.mimeType(for: file.pathExtension),
             length: body.count, on: connection)
    }

    private func send(status: String, body: Data, type: String, length: Int? = nil, on connection: NWConnection) {
        let header = [
            "HTTP/1.1 \(status)",
            "Content-Type: \(type)",
            "Content-Length: \(length ?? body.count)",
            "Cache-Control: no-cache",
            "Connection: close",
            "", "",
        ].joined(separator: "\r\n")
        var payload = Data(header.utf8)
        payload.append(body)
        connection.send(content: payload, completion: .contentProcessed { _ in connection.cancel() })
    }

    static func mimeType(for ext: String) -> String {
        switch ext.lowercased() {
        case "html": return "text/html; charset=utf-8"
        case "js", "mjs": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json", "webmanifest": return "application/json"
        case "wasm": return "application/wasm"
        case "zip": return "application/zip"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "py", "txt": return "text/plain; charset=utf-8"
        default: return "application/octet-stream"
        }
    }
}
