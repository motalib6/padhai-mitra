import type { InferenceSource } from "../ai/onDevice";

/** The visible hybrid badge — every AI answer carries one. */
export default function HybridBadge({
  source,
  latencyMs,
}: {
  source: InferenceSource;
  latencyMs?: number;
}) {
  const onDevice = source === "on-device";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        onDevice
          ? "bg-emerald-100 text-emerald-800"
          : "bg-sky-100 text-sky-800"
      }`}
      title={
        onDevice
          ? "Generated on-device by Gemini Nano — your notes never left this device."
          : "Generated in the cloud by Gemini Flash via Firebase AI Logic."
      }
    >
      {onDevice ? "⚡ On-device" : "☁️ Cloud"}
      {typeof latencyMs === "number" && (
        <span className="font-normal opacity-70">
          · {(latencyMs / 1000).toFixed(1)}s
        </span>
      )}
    </span>
  );
}
