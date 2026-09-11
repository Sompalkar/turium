import { Router, type NextFunction, type Request, type Response } from "express";
import { queryRequestSchema } from "../schemas/query.schema.js";
import { retrieveRelevantChunks } from "../services/retrieval.service.js";
import { generateAnswer } from "../services/answer.service.js";

export const queryRouter = Router();

queryRouter.post("/query", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { question, topK } = queryRequestSchema.parse(req.body);

    const retrieval = await retrieveRelevantChunks(question, { topK }, req.log);
    const answer = await generateAnswer(question, retrieval.chunks, req.log);

    res.json({
      question,
      answer: answer.text,
      // Numbered to match the citations in the answer text.
      sources: retrieval.chunks.map((chunk, index) => ({
        citation: index + 1,
        chunkId: chunk.chunkId,
        itemId: chunk.itemId,
        title: chunk.itemTitle,
        sourceType: chunk.itemSourceType,
        sourceUrl: chunk.itemSourceUrl,
        snippet: chunk.content,
        score: Number(chunk.score.toFixed(4)),
      })),
      stats: {
        candidateChunks: retrieval.candidateCount,
        retrievalMs: retrieval.tookMs,
        model: answer.model,
        inputTokens: answer.usage.inputTokens,
        outputTokens: answer.usage.outputTokens,
      },
    });
  } catch (error) {
    next(error);
  }
});
