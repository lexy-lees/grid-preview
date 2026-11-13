import { loadFeed, parseId, sendError, SetupError } from "../lib/notion.js";

// GET /api/feed?db=<database link or id>&count=12&client=@handle
export default async function handler(req, res) {
  try {
    const dbId = parseId(req.query.db || process.env.NOTION_DATABASE_ID);
    if (!dbId) throw new SetupError("no_database", "No calendar picked yet. Open the setup page and paste your Notion calendar link.");
    const count = parseInt(req.query.count, 10) || 12;
    const feed = await loadFeed(dbId, { count, client: req.query.client || "" });
    // Notion photo links expire after about an hour, so keep the cache short.
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    res.status(200).json(feed);
  } catch (err) {
    sendError(res, err);
  }
}
