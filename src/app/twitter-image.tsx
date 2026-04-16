import { ogAlt, ogContentType, ogSize, renderOgImage } from "./_og-image";

export const runtime = "edge";
export const alt = ogAlt;
export const size = ogSize;
export const contentType = ogContentType;

export default async function TwitterImage() {
  return renderOgImage();
}
