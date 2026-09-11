import { Router, type NextFunction, type Request, type Response } from "express";
import { toSummary } from "../domain/item.js";
import { itemRepository } from "../repositories/item.repository.js";
import { ingestRequestSchema, listItemsQuerySchema } from "../schemas/ingest.schema.js";
import { ingestContent } from "../services/ingest.service.js";
import { notFound } from "../lib/errors.js";

export const itemRouter = Router();

itemRouter.post("/ingest", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = ingestRequestSchema.parse(req.body);
    const item = await ingestContent(parsed, req.log);
    res.status(201).json({ item: toSummary(item) });
  } catch (error) {
    next(error);
  }
});

itemRouter.get("/items", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, offset } = listItemsQuerySchema.parse(req.query);
    const items = itemRepository.listNewestFirst(limit, offset);
    res.json({
      items: items.map(toSummary),
      pagination: { limit, offset, total: itemRepository.countAll() },
    });
  } catch (error) {
    next(error);
  }
});

itemRouter.get("/items/:id", (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const item = itemRepository.findById(id);
    if (!item) throw notFound(`No item with id ${id}`);
    res.json({ item });
  } catch (error) {
    next(error);
  }
});
