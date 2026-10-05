import express from "express";
import { seedUrls } from "./data/mockDb";
import { InMemoryUrlRepository } from "./repositories/urlRepository";
import { UrlService } from "./services/urlService";
import { createUrlController } from "./controllers/urlController";
import { createRouters } from "./routes/urlRoutes";

// Composition root: mock repository -> business layer -> HTTP layer.
const service = new UrlService(new InMemoryUrlRepository(seedUrls));
const { apiRouter, redirectRouter } = createRouters(createUrlController(service));

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use("/api", apiRouter);
app.use("/", redirectRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
