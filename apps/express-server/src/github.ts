import {
  Router as createRouter,
  type Request as ExpressRequest,
  type Response as ExpressResponse,
  type Router,
} from "express";

const GITHUB_API = "https://api.github.com";
const MAX_FILES = 80;
const MAX_FILE_BYTES = 200_000;

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  "vendor",
  "__pycache__",
  ".turbo",
]);

const SKIP_EXTS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "ico",
  "bmp",
  "pdf",
  "zip",
  "gz",
  "tar",
  "7z",
  "woff",
  "woff2",
  "ttf",
  "eot",
  "mp3",
  "mp4",
  "wasm",
  "exe",
  "dll",
  "so",
  "dylib",
  "lock",
]);

type ImportedFile = { path: string; content: string };

function getUserToken(req: ExpressRequest): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return process.env.GITHUB_TOKEN || undefined;
}

async function ghFetch(path: string, token?: string, init?: RequestInit) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Code-Together-Editor",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${GITHUB_API}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`GitHub API ${res.status}: ${body}`);
    (err as any).status = res.status;
    throw err;
  }
  return res;
}

function parseRepoInput(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim().replace(/\.git$/, "");
  const urlMatch = trimmed.match(
    /github\.com[/:]([^/]+)\/([^/#?\s]+)/i
  );
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };
  const short = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (short) return { owner: short[1], repo: short[2] };
  return null;
}

function shouldSkipPath(path: string): boolean {
  const parts = path.split("/");
  if (parts.some((p) => SKIP_DIRS.has(p))) return true;
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (SKIP_EXTS.has(ext)) return true;
  if (path.endsWith("package-lock.json") || path.endsWith("yarn.lock"))
    return true;
  return false;
}

async function importRepo(
  owner: string,
  repo: string,
  token?: string
): Promise<{
  owner: string;
  repo: string;
  defaultBranch: string;
  files: ImportedFile[];
}> {
  const repoRes = await ghFetch(`/repos/${owner}/${repo}`, token);
  const repoJson: any = await repoRes.json();
  const branch = repoJson.default_branch as string;

  const branchRes = await ghFetch(
    `/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`,
    token
  );
  const branchJson: any = await branchRes.json();
  const treeSha = branchJson.commit?.commit?.tree?.sha;
  if (!treeSha) throw new Error("Could not resolve repository tree");

  const treeRes = await ghFetch(
    `/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
    token
  );
  const treeJson: any = await treeRes.json();
  const blobs = (treeJson.tree || []).filter(
    (n: any) =>
      n.type === "blob" &&
      typeof n.path === "string" &&
      !shouldSkipPath(n.path) &&
      (n.size ?? 0) <= MAX_FILE_BYTES
  );

  const selected = blobs.slice(0, MAX_FILES);
  const files: ImportedFile[] = [];

  for (const node of selected) {
    try {
      const blobRes = await ghFetch(
        `/repos/${owner}/${repo}/git/blobs/${node.sha}`,
        token
      );
      const blob: any = await blobRes.json();
      if (blob.encoding === "base64" && typeof blob.content === "string") {
        const content = Buffer.from(
          blob.content.replace(/\n/g, ""),
          "base64"
        ).toString("utf8");
        if (content.includes("\u0000")) continue;
        files.push({ path: node.path, content });
      }
    } catch {
      /* skip unreadable file */
    }
  }

  return { owner, repo, defaultBranch: branch, files };
}

export function createGithubRouter(): Router {
  const router = createRouter();

  router.get("/status", async (req: ExpressRequest, res: ExpressResponse) => {
    const token = getUserToken(req);
    const oauthConfigured = !!(
      process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    );

    if (!token) {
      res.json({
        connected: false,
        oauthConfigured,
        login: null,
      });
      return;
    }

    try {
      const meRes = await ghFetch("/user", token);
      const me: any = await meRes.json();
      res.json({
        connected: true,
        oauthConfigured,
        login: me.login,
        avatarUrl: me.avatar_url,
        name: me.name,
      });
    } catch {
      res.json({
        connected: false,
        oauthConfigured,
        login: null,
      });
    }
  });

  router.get("/login", (_req: ExpressRequest, res: ExpressResponse) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const callback = process.env.GITHUB_CALLBACK_URL;
    if (!clientId || !callback) {
      res.status(400).json({
        error:
          "GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET, or import a public repo by URL.",
      });
      return;
    }
    const state = Math.random().toString(36).slice(2);
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", callback);
    url.searchParams.set("scope", "read:user repo");
    url.searchParams.set("state", state);
    res.redirect(url.toString());
  });

  router.get("/callback", async (req: ExpressRequest, res: ExpressResponse) => {
    const code = req.query.code as string | undefined;
    const frontend = process.env.FRONTEND_URL || "http://localhost:5173";
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!code || !clientId || !clientSecret) {
      res.redirect(`${frontend}/?github=error`);
      return;
    }

    try {
      const tokenRes = await fetch(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code,
          }),
        }
      );
      const tokenJson: any = await tokenRes.json();
      if (!tokenJson.access_token) {
        res.redirect(`${frontend}/?github=error`);
        return;
      }
      res.redirect(
        `${frontend}/?github=connected&token=${encodeURIComponent(tokenJson.access_token)}`
      );
    } catch {
      res.redirect(`${frontend}/?github=error`);
    }
  });

  router.get("/repos", async (req: ExpressRequest, res: ExpressResponse) => {
    const token = getUserToken(req);
    if (!token) {
      res.status(401).json({
        error: "Connect GitHub or set GITHUB_TOKEN to list your repositories.",
      });
      return;
    }
    try {
      const reposRes = await ghFetch(
        "/user/repos?sort=updated&per_page=30&affiliation=owner,collaborator",
        token
      );
      const repos: any[] = await reposRes.json();
      res.json(
        repos.map((r) => ({
          fullName: r.full_name,
          name: r.name,
          private: r.private,
          description: r.description,
          defaultBranch: r.default_branch,
          htmlUrl: r.html_url,
        }))
      );
    } catch (e: any) {
      res.status(e.status || 500).json({ error: e.message });
    }
  });

  router.post("/import", async (req: ExpressRequest, res: ExpressResponse) => {
    const { repo: repoInput } = req.body || {};
    const parsed = parseRepoInput(String(repoInput || ""));
    if (!parsed) {
      res.status(400).json({
        error: "Provide a repo as owner/name or a github.com URL",
      });
      return;
    }

    const token = getUserToken(req);
    try {
      const result = await importRepo(parsed.owner, parsed.repo, token);
      if (!result.files.length) {
        res.status(404).json({
          error: "No importable text files found in that repository.",
        });
        return;
      }
      res.json(result);
    } catch (e: any) {
      const status = e.status || 500;
      res.status(status).json({
        error:
          status === 404
            ? "Repository not found (or private — connect GitHub / set a token)."
            : e.message || "Import failed",
      });
    }
  });

  return router;
}
