const storageKey = "authTokenEnc";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const bytesToBase64 = (bytes) =>
  btoa(String.fromCharCode(...bytes));

const base64ToBytes = (base64) =>
  Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

const getKeyMaterial = () => {
  const keyString = import.meta.env.VITE_TOKEN_ENC_KEY || "default-token-key";
  return textEncoder.encode(keyString);
};

const getCryptoKey = async () => {
  const keyMaterial = getKeyMaterial();
  const hash = await crypto.subtle.digest("SHA-256", keyMaterial);
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
};

export const setAuthToken = async (token) => {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    textEncoder.encode(token)
  );

  const payload = `${bytesToBase64(iv)}.${bytesToBase64(
    new Uint8Array(encrypted)
  )}`;
  localStorage.setItem(storageKey, payload);
};

export const getAuthToken = async () => {
  const payload = localStorage.getItem(storageKey);
  if (!payload) return null;

  const [ivBase64, dataBase64] = payload.split(".");
  if (!ivBase64 || !dataBase64) return null;

  const key = await getCryptoKey();
  const iv = base64ToBytes(ivBase64);
  const data = base64ToBytes(dataBase64);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );
    return textDecoder.decode(decrypted);
  } catch (error) {
    return null;
  }
};

export const clearAuthToken = () => {
  localStorage.removeItem(storageKey);
};
