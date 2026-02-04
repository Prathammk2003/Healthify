// src/lib/detectImageModality.js
import fs from "fs";
import path from "path";
import sharp from "sharp";
import dicomParser from "dicom-parser";
import * as ort from "onnxruntime-node";

const optionalModalityModelPath = path.resolve(process.cwd(), "models", "modality_classifier.onnx");
let modalitySession = null;

async function loadOptionalModalityModel() {
  if (modalitySession) return modalitySession;
  if (fs.existsSync(optionalModalityModelPath)) {
    modalitySession = await ort.InferenceSession.create(optionalModalityModelPath);
    return modalitySession;
  }
  return null;
}

/**
 * Detect modality from file buffer, filename and optional user description.
 * Returns: 'brain-scan' | 'xray' | 'ecg' | 'breast-cancer' | 'ct' | 'unknown' | 'dicom'
 */
export async function detectImageModality(fileBuffer, filename = "", description = "") {
  const text = `${filename} ${description}`.toLowerCase();

  // 1) QUICK FILENAME / DESCRIPTION KEYWORD MATCH (high priority)
  const keywordMap = [
    ["brain", "brain-scan"],
    ["mri", "brain-scan"],
    ["t1", "brain-scan"],
    ["flair", "brain-scan"],
    ["ct", "ct"],
    ["chest", "xray"],
    ["xray", "xray"],
    ["x-ray", "xray"],
    ["ecg", "ecg"],
    ["ekg", "ecg"],
    ["waveform", "ecg"],
    ["mamm", "breast-cancer"],
    ["breast", "breast-cancer"],
    ["mammogram", "breast-cancer"]
  ];
  for (const [kw, mod] of keywordMap) {
    if (text.includes(kw)) return mod;
  }

  // 2) DICOM CHECK (most reliable for medical images)
  try {
    if (fileBuffer && fileBuffer.length > 132) {
      // DICOM header contains "DICM" at offset 128
      const header = fileBuffer.slice(128, 132).toString();
      if (header === "DICM") {
        // parse some tags to refine modality if available
        try {
          const byteArray = new Uint8Array(fileBuffer);
          const dataSet = dicomParser.parseDicom(byteArray);
          const modalityTag = dataSet.string("x00080060") || ""; // Modality
          const seriesDesc = (dataSet.string("x0008103e") || "").toLowerCase(); // Series Description
          const studyDesc = (dataSet.string("x00081030") || "").toLowerCase(); // Study Description

          const combined = `${modalityTag} ${seriesDesc} ${studyDesc}`.toLowerCase();
          if (combined.includes("mr") || combined.includes("mri") || combined.includes("brain")) return "brain-scan";
          if (combined.includes("ct")) return "ct";
          if (combined.includes("cr") || combined.includes("xray") || combined.includes("chest")) return "xray";

          // If DICOM but unknown modality, still return 'dicom' so downstream can parse more
          return "dicom";
        } catch (e) {
          // DICOM parse failed but header present — still treat as DICOM
          return "dicom";
        }
      }
    }
  } catch (e) {
    // ignore and continue heuristics
  }

  // 3) IMAGE / CSV TYPE BASED CHECK
  const ext = path.extname(filename || "").toLowerCase();

  // If CSV (most likely ECG waveforms uploaded as CSV)
  if (ext === ".csv" || ext === ".txt") {
    // Could be ECG signal data rather than image
    const txt = (fileBuffer && fileBuffer.toString && fileBuffer.toString("utf8", 0, 200)) || "";
    // Quick heuristic: csv line looks numeric, commas
    if (txt && /[\d\.\-]+,/.test(txt)) return "ecg";
  }

  // 4) If a standard image (jpeg/png) → get metadata & heuristics
  try {
    const { info, data } = await sharp(fileBuffer).raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;
    const ratio = width && height ? width / height : 1;

    // ECG waveforms are often very wide (long horizontal) -> detect by aspect ratio
    if (ratio > 3 || ratio < 0.33) return "ecg";

    // Square-ish images with moderate resolution often are MRI slices (brain)
    if (Math.abs(width - height) / Math.max(width, height) < 0.25) {
      // check small thumbnail variance to avoid labeling photographs as brain-scan
      let sum = 0;
      for (let i = 0; i < data.length; i += channels) {
        // convert to grayscale luminance approx
        const r = data[i], g = data[i + 1] || r, b = data[i + 2] || r;
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        sum += lum;
      }
      const avg = sum / (data.length / channels);
      // MRI/CT typical greyscale average often in mid-range; photos may have different stats.
      if (avg > 20 && avg < 230) {
        // best guess: brain-scan (but not certain)
        return "brain-scan";
      }
    }

    // If width much greater than height but not extremely so, might still be an X-ray (chest x-rays often portrait)
    if (width < height && height / width < 2.5) {
      // Could be xray as portrait rectangular
      // Use filename hints earlier; if nothing, return 'xray' only as low-confidence — but DON'T make it the default blind choice.
      return "xray";
    }

  } catch (e) {
    // not an image or sharp failed — continue
  }

  // 5) OPTIONAL: Use a small ONNX modality classifier if available
  try {
    const session = await loadOptionalModalityModel();
    if (session) {
      // build a small 128x128 RGB CHW tensor from the image (if possible)
      try {
        const thumb = await sharp(fileBuffer).resize(128, 128).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        const { data: raw, info } = thumb;
        const { width, height, channels } = info;
        // convert to Float32Array in CHW order normalized 0..1
        const hw = width * height;
        const floatChw = new Float32Array(channels * hw);
        for (let i = 0; i < hw; i++) {
          for (let c = 0; c < channels; c++) {
            floatChw[c * hw + i] = raw[i * channels + c] / 255.0;
          }
        }
        const inputName = session.inputNames ? session.inputNames[0] : session.getInputs()[0].name;
        const feeds = {};
        feeds[inputName] = new ort.Tensor("float32", floatChw, [1, channels, height, width]);
        const out = await session.run(feeds);
        const outName = Object.keys(out)[0];
        const probs = out[outName].data;
        const labels = ["brain-scan", "xray", "ecg", "breast-cancer", "ct", "unknown"]; // adapt to your classifier
        const idx = probs.indexOf(Math.max(...probs));
        return labels[idx] || "unknown";
      } catch (e) {
        // classifier failed — continue
      }
    }
  } catch (e) {
    // ignore
  }

  // 6) FINAL FALLBACK: 'unknown' (do NOT default to xray)
  return "unknown";
}