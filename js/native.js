// Bridge to the native iOS app (ios/LocalLeet/NativeBridge.swift). In a normal
// browser NATIVE is false and nothing here is used.
export const NATIVE = !!window.webkit?.messageHandlers?.localleet && !!window.LocalLeetNative;

const listeners = new Set();
window.__localleetNativeEvent = (event) => {
  for (const fn of listeners) fn(event);
};

export function onNativeEvent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Call a native method; resolves with its reply (WKScriptMessageHandlerWithReply). */
export function call(method, params = {}) {
  return window.webkit.messageHandlers.localleet.postMessage({ method, params });
}
