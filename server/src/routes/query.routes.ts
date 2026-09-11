import { Router, type NextFunction, type Request, type Response } from "express";
import { queryRequestSchema } from "../schemas/query.schema.js";
import { retrieveRelevantChunks } from "../services/retrieval.service.js";

export const queryRouter = Router();

queryRouter.post("/query", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { question, topK } = queryRequestSchema.parse(req.body);
    const result = await retrieveRelevantChunks(question, { topK }, req.log);

    res.json({
      question,
      sources: result.chunks.map((chunk) => ({
        chunkId: chunk.chunkId,
        itemId: chunk.itemId,
        title: chunk.itemTitle,
        sourceType: chunk.itemSourceType,
        sourceUrl: chunk.itemSourceUrl,
        snippet: chunk.content,
        score: Number(chunk.score.toFixed(4)),
      })),
      stats: { candidateChunks: result.candidateCount, tookMs: result.tookMs },
    });
  } catch (error) {
    next(error);
  }
});
