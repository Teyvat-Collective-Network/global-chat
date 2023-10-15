import logger from "./logger.js";

export default async function (route: string) {
    let request = route.startsWith("!");
    if (request) route = route.slice(1);

    logger.info({ location: "04e87d8a-8229-44f1-8eb4-d7b6563a2bed" }, `=> API: ${route}`);

    const req = await fetch(`${Bun.env.API}${route}`);
    if (request) return req;

    if (!req.ok) {
        const res = await req.json();
        logger.error({ body: res }, `605c246a-4765-4677-94fc-4724e0831319 ${route}`);
        throw res.message ?? JSON.stringify(res);
    }

    const text = await req.text();

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}
