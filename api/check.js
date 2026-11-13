import { getSchema, detectFields, parseId, sendError, SetupError, notionQuery } from "../lib/notion.js";

// GET /api/check            -> is the Notion key set up?
// GET /api/check?db=<link>  -> can we read this calendar, and which properties did we find?
export default async function handler(req, res) {
  try {
    if (!process.env.NOTION_TOKEN) throw new SetupError("no_token", "The Notion key hasn't been added yet.", 500);
    if (!req.query.db) return res.status(200).json({ token: true });
    const dbId = parseId(req.query.db);
    if (!dbId) throw new SetupError("bad_link", "That doesn't look like a Notion link. Open your calendar in Notion, click Share → Copy link, and paste it here.");
    const schema = await getSchema(dbId);
    const fields = detectFields(schema);
    const title = (schema.title || []).map(t => t.plain_text).join("") || "Content calendar";
    const clients = [];
    if (fields.client) {
      const p = schema.properties[fields.client];
      if (p.type === "select") clients.push(...p.select.options.map(o => o.name));
      if (p.type === "multi_select") clients.push(...p.multi_select.options.map(o => o.name));
      if (p.type === "relation" && p.relation.database_id) {
        try {
          const rel = await notionQuery(p.relation.database_id);
          for (const pg of rel.results) {
            const props = Object.values(pg.properties || {});
            const handle = props.find(x => x.type === "rich_text" && x.rich_text.some(t => t.plain_text.trim().startsWith("@")));
            const name = props.find(x => x.type === "title");
            const label = handle ? handle.rich_text.map(t => t.plain_text).join("").trim() : (name ? name.title.map(t => t.plain_text).join("").trim() : "");
            if (label) clients.push(label);
          }
        } catch { /* client list not shared with the integration: the account picker just stays empty */ }
      }
    }
    res.status(200).json({ token: true, id: dbId.replace(/-/g, ""), title, fields, clients, clientType: fields.client ? schema.properties[fields.client].type : null });
  } catch (err) {
    sendError(res, err);
  }
}
