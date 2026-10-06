// Hosts the WebLLM engine (WebGPU) off the main thread.
import { WebWorkerMLCEngineHandler } from "../vendor/web-llm.js";

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg) => handler.onmessage(msg);
