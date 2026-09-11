import { randomUUID } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import { toQueryResponse, type AnswerSource, type QueryRecord } from "../domain/query-record.js";
import { queryRepository } from "../repositories/query.repository.js";
import { historyQuerySchema, queryRequestSchema } from "../schemas/query.schema.js";
import { retrieveRelevantChunks } from "../services/retrieval.service.js";
import { generateAnswer } from "../services/answer.service.js";

export const queryRouter = Router();

queryRouter.post("/query", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { question, topK } = queryRequestSchema.parse(req.body);

    const retrieval = await retrieveRelevantChunks(question, { topK }, req.log);
    const answer = await generateAnswer(question, retrieval.chunks, req.log);

    // Numbered to match the citations in the answer text.
    const sources: AnswerSource[] = retrieval.chunks.map((chunk, index) => ({
      citation: index + 1,
      chunkId: chunk.chunkId,
      itemId: chunk.itemId,
      title: chunk.itemTitle,
      sourceType: chunk.itemSourceType,
      sourceUrl: chunk.itemSourceUrl,
      snippet: chunk.content,
      score: Number(chunk.score.toFixed(4)),
    }));

    const record: QueryRecord = {
      id: randomUUID(),
      question,
      answer: answer.text,
      sources,
      model: answer.model,
      inputTokens: answer.usage.inputTokens,
      outputTokens: answer.usage.outputTokens,
      candidateChunks: retrieval.candidateCount,
      retrievalMs: retrieval.tookMs,
      createdAt: new Date().toISOString(),
    };

    // The answer is already paid for, so a failure to file it must not lose it.
    try {
      queryRepository.insert(record);
    } catch (error) {
      req.log.error("could not save query history", {
        message: error instanceof Error ? error.message : String(error),
      });
    }

    res.json(toQueryResponse(record));
  } catch (error) {
    next(error);
  }
});

queryRouter.get("/queries", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit } = historyQuerySchema.parse(req.query);
    res.json({
      queries: queryRepository.listRecent(limit).map(toQueryResponse),
      pagination: { limit, total: queryRepository.countAll() },
    });
  } catch (error) {
    next(error);
  }
});

queryRouter.delete("/queries", (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = queryRepository.deleteAll();
    req.log.info("query history cleared", { deleted });
    res.json({ deleted });
  } catch (error) {
    next(error);
  }
});
