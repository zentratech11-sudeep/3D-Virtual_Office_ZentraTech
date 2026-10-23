"use client";

import { EffectComposer, N8AO, SMAA, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";

/**
 * High-tier post-processing: screen-space ambient occlusion for the "miniature" contact
 * shadows seen in the design reference. The composer disables renderer tone mapping, so
 * ACES is re-applied as the final pass to keep colours identical to the low tier.
 */
export function Effects({ multisampling = 0 }: { multisampling?: number }) {
  return (
    <EffectComposer multisampling={multisampling}>
      <N8AO aoRadius={1.6} distanceFalloff={0.8} intensity={2.4} color="#18202e" halfRes quality="performance" />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {/* Post-process anti-aliasing: far cheaper than multisampled render targets on integrated GPUs. */}
      {multisampling === 0 ? <SMAA /> : <></>}
    </EffectComposer>
  );
}
