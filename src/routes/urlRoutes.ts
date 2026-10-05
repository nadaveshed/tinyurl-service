import { Router } from "express";
import { UrlController } from "../controllers/urlController";

export function createRouters(controller: UrlController) {
  const apiRouter = Router();
  apiRouter.get("/urls", controller.list);
  apiRouter.get("/urls/:code", controller.get);
  apiRouter.post("/urls", controller.create);
  apiRouter.delete("/urls/:code", controller.remove);

  const redirectRouter = Router();
  redirectRouter.get("/:code", controller.redirect);

  return { apiRouter, redirectRouter };
}
