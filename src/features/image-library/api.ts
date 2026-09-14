import { IMAGES_URL } from "./constants.ts";
export async function fetchImageLibrary(): Promise<unknown> {
  const separator = IMAGES_URL.includes("?") ? "&" : "?";
  const response = await fetch(`${IMAGES_URL}${separator}t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`图片库请求异常：${response.status}`);
  return await response.json() as unknown;
}
