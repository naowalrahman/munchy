import { afterEach, expect, mock, spyOn, test } from "bun:test";
import { BrowserMultiFormatOneDReader } from "@zxing/browser";
import { BarcodeFormat, Result } from "@zxing/library";
import { startScanner } from "../src/utils/food/scanner";

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
afterEach(() => {
  mock.restore();
  if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
  else Reflect.deleteProperty(globalThis, "navigator");
});

function media() {
  const stop = mock(() => {});
  const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
  const video = { srcObject: stream } as HTMLVideoElement;
  return { stop, stream, video };
}

function camera(getUserMedia: () => Promise<MediaStream>) {
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { mediaDevices: { getUserMedia } } });
}

test("closing the scanner while camera permission is pending releases the late stream", async () => {
  const { stop, stream, video } = media();
  const pending = Promise.withResolvers<MediaStream>();
  camera(() => pending.promise);
  const decode = spyOn(BrowserMultiFormatOneDReader.prototype, "decodeFromStream");
  const controller = new AbortController();
  const started = startScanner(video, controller.signal, () => {});
  controller.abort();
  pending.resolve(stream);
  await expect(started).rejects.toThrow();
  expect(stop).toHaveBeenCalledTimes(1);
  expect(video.srcObject).toBeNull();
  expect(decode).not.toHaveBeenCalled();
});

test("cancellation stops both the camera tracks and the scan loop", async () => {
  const { stop, stream, video } = media();
  camera(async () => stream);
  const stopLoop = mock(() => {});
  spyOn(BrowserMultiFormatOneDReader.prototype, "decodeFromStream").mockResolvedValue({ stop: stopLoop });
  const controller = new AbortController();
  await startScanner(video, controller.signal, () => {});
  controller.abort();
  expect(stop).toHaveBeenCalledTimes(1);
  expect(stopLoop).toHaveBeenCalledTimes(1);
  expect(video.srcObject).toBeNull();
});

test("scan results preserve leading zeros and abort suppresses repeated detections", async () => {
  const { stream, video } = media();
  camera(async () => stream);
  const detected: string[] = [];
  const controller = new AbortController();
  const controls = { stop: mock(() => {}) };
  spyOn(BrowserMultiFormatOneDReader.prototype, "decodeFromStream").mockImplementation(
    async (_stream, _preview, callback) => {
      const result = new Result("012345678905", new Uint8Array(), 0, [], BarcodeFormat.UPC_A);
      callback(result, undefined, controls);
      callback(result, undefined, controls);
      return controls;
    }
  );
  await startScanner(video, controller.signal, (value) => {
    detected.push(value);
    controller.abort();
  });
  expect(detected).toEqual(["012345678905"]);
  expect(controls.stop).toHaveBeenCalledTimes(1);
});

test("camera startup failure releases the stream", async () => {
  const { stop, stream, video } = media();
  camera(async () => stream);
  spyOn(BrowserMultiFormatOneDReader.prototype, "decodeFromStream").mockRejectedValue(new Error("video failed"));
  await expect(startScanner(video, new AbortController().signal, () => {})).rejects.toThrow("video failed");
  expect(stop).toHaveBeenCalledTimes(1);
  expect(video.srcObject).toBeNull();
});
