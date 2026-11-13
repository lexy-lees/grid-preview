// Shared Notion helpers for Grid Preview.
// Reads any Notion content calendar and turns it into a simple list of feed posts.
// Property names are detected automatically, so buyers can use their own calendar.

const NOTION_VERSION = "2022-06-28";
const API = "https://api.notion.com/v1";

export class SetupError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function token() {
  const t = process.env.NOTION_TOKEN;
  if (!t) throw new SetupError("no_token", "The Notion key hasn't been added yet. Add NOTION_TOKEN in your Vercel project settings, then redeploy.", 500);
  return t;
}

async function notion(path, { method = "GET", body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) throw new SetupError("bad_token", "Notion didn't accept the key. Copy the Internal Integration Secret again and update NOTION_TOKEN in Vercel.", 401);
    if (res.status === 404) throw new SetupError("not_shared", "Notion couldn't find that database. Open it in Notion, click ••• → Connections, and add your Grid Preview connection.", 404);
    if (res.status === 400 && /is a page, not a database/i.test(data.message || "")) throw new SetupError("not_database", "That link is a page, not a database. Open the calendar database itself (as a full page) and copy that link.", 400);
    if (res.status === 429) throw new SetupError("rate_limited", "Notion is busy. Wait a few seconds and refresh.", 429);
    throw new SetupError("notion_error", data.message || `Notion returned an error (${res.status}).`, 502);
  }
  return data;
}

/** Pulls a 32-character Notion id out of a link or raw id. */
export function parseId(input) {
  const s = String(input || "").trim();
  const noQuery = s.split("?")[0].split("#")[0];
  const m = noQuery.replace(/-/g, "").match(/[0-9a-f]{32}(?!.*[0-9a-f]{32})/i);
  if (!m) return null;
  const h = m[0].toLowerCase();
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const pick = (props, types, patterns) => {
  const entries = Object.entries(props).filter(([, p]) => types.includes(p.type));
  for (const re of patterns) {
    const hit = entries.find(([name]) => re.test(name));
    if (hit) return hit[0];
  }
  return null;
};
const pickAny = (props, types, patterns) => pick(props, types, patterns) || (Object.entries(props).find(([, p]) => types.includes(p.type)) || [null])[0];

/** Works out which property is which, from the database schema. */
export function detectFields(schema) {
  const p = schema.properties || {};
  const title = Object.keys(p).find(k => p[k].type === "title");
  return {
    title,
    image: pickAny(p, ["files"], [/cover/i, /thumb/i, /image|photo|visual|media|asset|graphic/i]),
    date: pickAny(p, ["date"], [/publish|post(ing)? ?date|go live|schedul/i, /date/i]),
    status: pick(p, ["status"], [/status|stage/i]) || pickAny(p, ["status"], []) || pick(p, ["select"], [/status|stage|progress/i]),
    approved: pick(p, ["checkbox"], [/approv|sign.?off|ok to post/i]),
    format: pick(p, ["select"], [/format|content type|post type|type/i]),
    platform: pick(p, ["select", "multi_select"], [/platform|channel/i]),
    client: pick(p, ["relation", "select", "multi_select"], [/client|account|brand|profile/i]),
  };
}

const HIDDEN_FORMATS = /story|stories|live|tiktok only|youtube|newsletter|email|blog/i;
const NON_IG_PLATFORM = /^(tiktok|facebook|linkedin|pinterest|youtube|x|twitter|threads|email|blog)$/i;

/** Maps any status wording onto the six dot colors. */
export function statusKey(label, approved) {
  const s = String(label || "").toLowerCase();
  if (/post(ed)?|publish|live|done|complete/.test(s)) return "posted";
  if (/schedul|queued|booked/.test(s)) return "scheduled";
  if (/approv|ready to post|signed/.test(s)) return "approved";
  if (/change|revis|reject|fix|edit request/.test(s)) return "changes";
  if (/review|pending|waiting|client/.test(s)) return "review";
  if (approved) return "approved";
  return "idea";
}

const plain = rich => (rich || []).map(t => t.plain_text).join("").trim();

function propText(prop) {
  if (!prop) return "";
  switch (prop.type) {
    case "title": return plain(prop.title);
    case "rich_text": return plain(prop.rich_text);
    case "select": return prop.select ? prop.select.name : "";
    case "status": return prop.status ? prop.status.name : "";
    case "multi_select": return prop.multi_select.map(o => o.name).join(", ");
    default: return "";
  }
}

function fileUrl(f) {
  if (!f) return null;
  if (f.type === "file") return f.file.url;
  if (f.type === "external") return f.external.url;
  return null;
}

const isVideo = (url, name) => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(name || "") || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url || "");

export function toPost(page, f) {
  const props = page.properties || {};
  const files = f.image && props[f.image] && props[f.image].files ? props[f.image].files : [];
  const media = files.map(x => ({ url: fileUrl(x), name: x.name || "" })).filter(x => x.url);
  const firstImage = media.find(m => !isVideo(m.url, m.name));
  const firstVideo = media.find(m => isVideo(m.url, m.name));
  const cover = page.cover ? fileUrl(page.cover) : null;
  const statusLabel = f.status ? propText(props[f.status]) : "";
  const approved = f.approved ? !!(props[f.approved] && props[f.approved].checkbox) : false;
  const format = f.format ? propText(props[f.format]) : "";
  const platforms = f.platform && props[f.platform]
    ? (props[f.platform].type === "multi_select" ? props[f.platform].multi_select.map(o => o.name) : [propText(props[f.platform])].filter(Boolean))
    : [];
  let clientKeys = [];
  if (f.client && props[f.client]) {
    const c = props[f.client];
    if (c.type === "relation") clientKeys = c.relation.map(r => r.id.replace(/-/g, ""));
    else if (c.type === "select") clientKeys = c.select ? [c.select.name.toLowerCase()] : [];
    else if (c.type === "multi_select") clientKeys = c.multi_select.map(o => o.name.toLowerCase());
  }
  const date = f.date && props[f.date] && props[f.date].date ? props[f.date].date.start : null;
  return {
    id: page.id.replace(/-/g, ""),
    url: page.url,
    title: f.title ? propText(props[f.title]) || "Untitled post" : "Untitled post",
    date,
    format,
    kind: /reel|video/i.test(format) ? "reel" : /carousel|album/i.test(format) || media.length > 1 ? "carousel" : "single",
    status: statusKey(statusLabel, approved),
    statusLabel: statusLabel || (approved ? "Approved" : ""),
    image: firstImage ? firstImage.url : cover,
    video: !firstImage && !cover && firstVideo ? firstVideo.url : null,
    slides: media.length,
    clientKeys,
    hidden: (format && HIDDEN_FORMATS.test(format)) || (platforms.length > 0 && platforms.every(p => NON_IG_PLATFORM.test(p))),
  };
}

export async function notionQuery(dbId, body = { page_size: 100 }) {
  return notion(`/databases/${dbId}/query`, { method: "POST", body });
}

export async function getSchema(dbId) {
  return notion(`/databases/${dbId}`);
}

/** Resolves ?client=<name or @handle> into the keys stored on posts. */
async function clientKeysFor(schema, f, wanted, pages) {
  if (!wanted || !f.client) return null;
  const w = wanted.toLowerCase().replace(/^@/, "").trim();
  const prop = schema.properties[f.client];
  if (prop.type !== "relation") return new Set([w, "@" + w]);
  // Relation: look up the titles of the related pages (only the ones in use).
  const ids = [...new Set(pages.flatMap(p => (p.properties[f.client].relation || []).map(r => r.id)))].slice(0, 40);
  const matches = new Set();
  await Promise.all(ids.map(async id => {
    try {
      const pg = await notion(`/pages/${id}`);
      const texts = Object.values(pg.properties || {}).map(propText).filter(Boolean).map(t => t.toLowerCase().replace(/^@/, ""));
      if (texts.some(t => t === w)) matches.add(id.replace(/-/g, ""));
    } catch { /* related page not shared with the integration: skip it */ }
  }));
  return matches;
}

export async function loadFeed(dbId, { count = 12, client = "" } = {}) {
  const schema = await getSchema(dbId);
  const f = detectFields(schema);
  const sorts = f.date ? [{ property: f.date, direction: "descending" }] : [{ timestamp: "created_time", direction: "descending" }];
  const pages = [];
  let cursor;
  // Read up to 300 recent rows: plenty to fill a grid after hiding Stories and other accounts.
  for (let i = 0; i < 3; i++) {
    const res = await notion(`/databases/${dbId}/query`, { method: "POST", body: { sorts, page_size: 100, start_cursor: cursor } });
    pages.push(...res.results);
    if (!res.has_more) break;
    cursor = res.next_cursor;
  }
  const keys = await clientKeysFor(schema, f, client, pages);
  let posts = pages.map(p => toPost(p, f)).filter(p => !p.hidden);
  if (keys) posts = posts.filter(p => p.clientKeys.some(k => keys.has(k)));
  return {
    database: plain(schema.title) || "Content calendar",
    fields: f,
    posts: posts.slice(0, Math.max(1, Math.min(60, count))).map(({ clientKeys, hidden, ...rest }) => rest),
    totalFound: posts.length,
    syncedAt: new Date().toISOString(),
  };
}

export function sendError(res, err) {
  const status = err instanceof SetupError ? err.status : 500;
  res.status(status).json({ error: { code: err.code || "server_error", message: err.message || "Something went wrong." } });
}
