// Encode an AudioBuffer to MP3 using the shared ffmpeg.wasm instance.
// We round-trip through WAV (already supported by encodeWav) → ffmpeg.

import { encodeWav } from "./notif-clean";
import { getFFmpeg } from "./audio-convert";
import { fetchFile } from "@ffmpeg/util";

export async function audioBufferToMp3(
  buffer: AudioBuffer,
  bitrateKbps: number = 192,
  onProgress?: (msg: string) => void,
): Promise<Blob> {
  const wav = encodeWav(buffer);
  const ff = await getFFmpeg(onProgress);
  const inName = `in_${Date.now()}.wav`;
  const outName = `out_${Date.now()}.mp3`;
  await ff.writeFile(inName, await fetchFile(wav));
  await ff.exec(["-i", inName, "-c:a", "libmp3lame", "-b:a", `${bitrateKbps}k`, outName]);
  const data = await ff.readFile(outName);
  try { await ff.deleteFile(inName); } catch { /* ignore */ }
  try { await ff.deleteFile(outName); } catch { /* ignore */ }
  return new Blob([new Uint8Array(data as Uint8Array)], { type: "audio/mpeg" });
}
