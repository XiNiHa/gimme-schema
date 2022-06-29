import { Router } from "itty-router";
import { FetchFn, UrlLoader } from "@graphql-tools/url-loader";
import { printSchema } from "graphql";
import indexHtml from "./index.html";

export interface Env {}

const router = Router();
const loader = new UrlLoader();

async function customFetch(
  ...args:
    | [string | Request, RequestInit | Request | undefined]
    | [RequestInfo | URL, RequestInit | undefined]
): Promise<Response> {
  const mappedInit =
    !(args[1] instanceof Request) && args[1]
      ? Object.fromEntries(
          Object.entries(args[1]).filter(([k]) => k !== "credentials")
        )
      : args[1];

  return fetch(args[0], mappedInit);
}

router.get(
  "/",
  (request) =>
    new Response(indexHtml, { headers: { "Content-Type": "text/html" } })
);

router.get("/schema", async (request) => {
  const rawUrl = request.query?.url;
  if (!rawUrl) {
    return new Response(JSON.stringify({ error: "Source URL not provided!" }), {
      status: 400,
    });
  }
  const url = decodeURIComponent(rawUrl);
  console.log(`Loading schema from "${url}"`);
  try {
    const [loaded] = await loader.load(url, {
      customFetch: customFetch as FetchFn,
    });
    if (!loaded?.schema) {
      return new Response(JSON.stringify({ error: "No schema found!" }), {
        status: 400,
      });
    } else {
      return new Response(printSchema(loaded.schema), {
        headers: {
          "Content-Type": "text/plain",
          "Content-disposition": "attachment; filename=schema.graphql",
        },
      });
    }
  } catch (e) {
    console.error(e);
    return new Response(null, { status: 500 });
  }
});

export default { fetch: router.handle };
