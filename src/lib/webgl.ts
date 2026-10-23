/** Feature detection for the 3D view (PRD FR-01 / FR-10). */
export function detectWebGL(): { ok: true } | { ok: false; reason: string } {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return { ok: false, reason: "Your browser or device doesn't support WebGL, which the 3D office needs." };
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return { ok: true };
  } catch {
    return { ok: false, reason: "The 3D view couldn't start on this device." };
  }
}
