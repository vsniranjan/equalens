import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (context) => {
  console.log(JSON.stringify({ event: "health_check", service: "equalens-api" }));
  return context.json({ service: "equalens-api", status: "ok" });
});

app.notFound((context) => context.json({ error: "Not found" }, 404));

export { app };
export default app;
