import { env, pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { ensureDirectory } from "../lib/ensure-directory.js";

let extractor: Promise<FeatureExtractionPipeline> | null = null;

// The model is a few hundred MB in memory, so load it once and share it.
function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractor) {
    // Without a writable cache the model is fetched again after every restart.
    if (config.embedding.cacheDir) {
      ensureDirectory(config.embedding.cacheDir, "the embedding model cache");
      env.cacheDir = config.embedding.cacheDir;
    }
    logger.info("loading embedding model", { model: config.embedding.model });
    extractor = pipeline("feature-extraction", config.embedding.model);
  }
  return extractor;
}

export async function warmUpEmbedder(): Promise<void> {
  const startedAt = Date.now();
  await getExtractor();
  logger.info("embedding model ready", { durationMs: Date.now() - startedAt });
}

export async function embedTexts(texts: string[]): Promise<Float32Array[]> {
  if (texts.length === 0) return [];

  const extract = await getExtractor();
  const vectors: Float32Array[] = [];

  for (let start = 0; start < texts.length; start += config.embedding.batchSize) {
    const batch = texts.slice(start, start + config.embedding.batchSize);
    const output = await extract(batch, { pooling: "mean", normalize: true });
    for (const row of output.tolist() as number[][]) {
      vectors.push(Float32Array.from(row));
    }
  }

  return vectors;
}

export async function embedOne(text: string): Promise<Float32Array> {
  const [vector] = await embedTexts([text]);
  if (!vector) throw new Error("Embedding model returned no vector");
  return vector;
}
