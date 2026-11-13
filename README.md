# Grid Preview for Notion

See your planned Instagram posts as a real grid, right inside your Notion content calendar. Newest post top-left, a status dot on every tile, and photos pulled straight from your calendar.

Setup takes about 10 minutes and costs nothing. You'll need a free [Vercel](https://vercel.com) account (sign up with GitHub, it's one click).

---

## Step 1: Put the widget online

1. Click this button:

   [![Deploy with Vercel](https://vercel.com/button)](DEPLOY_BUTTON_URL)

2. Sign in to Vercel with GitHub if it asks.
3. When Vercel asks for **NOTION_TOKEN**, leave this tab open and do Step 2 first.

## Step 2: Create your Notion key

1. Go to [notion.so/profile/integrations](https://www.notion.so/profile/integrations) and click **New integration**.
2. Name it **Grid Preview**, choose your workspace, set the type to **Internal**, and save.
3. Under **Capabilities**, tick only **Read content**. Save again.
4. Copy the **Internal Integration Secret** (it starts with `ntn_`).
5. Go back to Vercel, paste it into **NOTION_TOKEN**, and click **Deploy**.

When it finishes, click **Continue to Dashboard → Visit**. That's your setup page. Bookmark it.

> Your key stays inside your own Vercel project. People who see your grid can't see it, and it can only *read* the pages you choose to share with it.

## Step 3: Follow the setup page

The setup page walks you through the rest:

- **Share your calendar** with the Grid Preview connection (in Notion: **•••** → **Connections**).
- **Paste your calendar link.** The widget finds your photo, date, status and format properties for you.
- **Pick your look:** handle, account, 9 to 24 posts, 3:4 or square tiles, light or dark, dates, color key.
- **Copy your embed link.** In Notion, type `/embed`, paste it, and resize the block to about phone width.

---

## How it reads your calendar

It works with most content calendars, not just ours. It looks for:

| It needs | It looks for a property like… | If there isn't one |
|---|---|---|
| Photos | A **Files & media** property called Cover, Image, Visuals, Photo or Media | Uses each post's page cover |
| Order | A **Date** property called Publish Date, Post Date or Date | Newest-created first |
| Status dot | A **Status** or **Select** called Status or Stage, or an **Approved** checkbox | Grey dots |
| Format | A **Select** called Format, Content Type or Post Type | Shows everything |
| Account | A **Relation**, **Select** or **Multi-select** called Client, Account or Brand | Shows everything |

**Left out of the grid on purpose:** posts whose format is Story, Live, Newsletter, Email or Blog, and posts tagged only for other platforms (TikTok, LinkedIn, etc.).

**Status dot colors** (matched on the words in your status):

| Dot | Status words |
|---|---|
| ⚪ Grey | anything else (Idea, Drafting, Planning…) |
| 🟠 Orange | review, pending, waiting |
| 🔴 Red | changes, revise, rejected |
| 🟢 Green | approved, ready to post, or a ticked Approved checkbox |
| 🔵 Blue | scheduled, queued |
| 🟣 Purple | posted, published, live, done |

## Embed link options

You can change these in the setup page, or edit the link by hand:

| Option | Values | Default |
|---|---|---|
| `count` | 3 to 60 | 12 |
| `handle` | the name shown at the top | your calendar's name |
| `client` | an account name or @handle | all accounts |
| `shape` | `portrait` (3:4) or `square` | portrait |
| `theme` | `light`, `dark`, `transparent`, `auto` | light |
| `dots` / `header` | `0` to hide | shown |
| `legend` / `dates` | `1` to show | hidden |

**Several clients?** Make one embed per client: same calendar link, different `client`.

## Troubleshooting

- **"Notion couldn't find that database"**: share the calendar with your connection (**•••** → **Connections**), then try again.
- **"That link is a page, not a database"**: open the calendar database itself as a full page and copy *that* link, not the page it sits on.
- **A photo isn't showing**: make sure it's in the photo property the setup page named (or set as the page cover), then press **Refresh** on the grid. HEIC photos from iPhones don't show in most browsers. Export as JPG.
- **The account picker is empty**: share your Clients database with the connection too.
- **Changed something in Notion?** The grid refreshes on its own every few minutes and whenever you come back to the page. Press **Refresh** to see it straight away.
