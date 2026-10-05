import { Request, Response } from "express";
import { UrlService, ServiceError } from "../services/urlService";

function handleError(res: Response, err: unknown) {
  if (err instanceof ServiceError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}

export function createUrlController(service: UrlService) {
  return {
    list(_req: Request, res: Response) {
      res.json(service.getAll().map((e) => ({ ...e, expired: service.isExpired(e) })));
    },

    get(req: Request<{ code: string }>, res: Response) {
      try {
        res.json(service.resolve(req.params.code));
      } catch (err) {
        handleError(res, err);
      }
    },

    create(req: Request, res: Response) {
      try {
        const { fullUrl, expiresInSeconds, expiresAt } = req.body ?? {};
        res.status(201).json(service.shorten(fullUrl, { expiresInSeconds, expiresAt }));
      } catch (err) {
        handleError(res, err);
      }
    },

    remove(req: Request<{ code: string }>, res: Response) {
      try {
        service.remove(req.params.code);
        res.status(204).send();
      } catch (err) {
        handleError(res, err);
      }
    },

    redirect(req: Request<{ code: string }>, res: Response) {
      try {
        res.redirect(302, service.resolve(req.params.code).fullUrl);
      } catch (err) {
        handleError(res, err);
      }
    },
  };
}

export type UrlController = ReturnType<typeof createUrlController>;
