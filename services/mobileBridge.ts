declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

export type MobileBridgeDownloadPayload = {
  type: 'download';
  fileName: string;
  contentType: string;
  contentBase64: string;
};

export const isMobileWebViewRuntime = () =>
  typeof window !== 'undefined' && typeof window.ReactNativeWebView?.postMessage === 'function';

export const arrayBufferToBase64 = (buffer: ArrayBuffer | Uint8Array) => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, Math.min(index + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

export const textToBase64 = (content: string) => {
  const encoded = encodeURIComponent(content).replace(/%([0-9A-F]{2})/g, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
  return btoa(encoded);
};

export const postMobileDownload = (payload: Omit<MobileBridgeDownloadPayload, 'type'>) => {
  if (!isMobileWebViewRuntime()) return false;
  try {
    window.ReactNativeWebView?.postMessage(
      JSON.stringify({
        type: 'download',
        ...payload,
      } satisfies MobileBridgeDownloadPayload),
    );
    return true;
  } catch {
    return false;
  }
};

