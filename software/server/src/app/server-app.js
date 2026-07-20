import express from "express";

export function createServerApp({ publicDir, frontendUrl }) {
  const app = express();

  app.get("/", (req, res, next) => {
    if (!frontendUrl) {
      next();
      return;
    }

    res.redirect(302, frontendUrl);
  });

  app.use(express.static(publicDir));

  app.use((req, res) => {
    res.status(404);
    res.send(`<h1>Error 404: Resource not found!</h1>`);
  });

  return app;
}
