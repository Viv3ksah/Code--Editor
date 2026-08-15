import { useEffect, useState } from "react";
import { VscGithub, VscCloudDownload, VscLinkExternal } from "react-icons/vsc";
import { API_URL } from "../../Globle";
import { languageFromPath, type WorkspaceFile } from "../../lib/workspace";

type RepoItem = {
  fullName: string;
  name: string;
  private: boolean;
  description: string | null;
  htmlUrl: string;
};

type Props = {
  onImport: (files: WorkspaceFile[], meta: { owner: string; repo: string }) => void;
};

const API = API_URL;
const TOKEN_KEY = "ct_github_token";

export default function GithubPanel({ onImport }: Props) {
  const [repoInput, setRepoInput] = useState("Viv3ksah/Code--Editor");
  const [status, setStatus] = useState<{
    connected: boolean;
    oauthConfigured: boolean;
    login: string | null;
  } | null>(null);
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(TOKEN_KEY) || undefined
      : undefined;

  const authHeaders = (): HeadersInit =>
    token ? { Authorization: `Bearer ${token}` } : {};

  const refreshStatus = async () => {
    try {
      const res = await fetch(`${API}/github/status`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      setStatus(data);
      if (data.connected) {
        const reposRes = await fetch(`${API}/github/repos`, {
          headers: authHeaders(),
        });
        if (reposRes.ok) {
          setRepos(await reposRes.json());
        }
      }
    } catch {
      setStatus({ connected: false, oauthConfigured: false, login: null });
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gh = params.get("github");
    const t = params.get("token");
    if (gh === "connected" && t) {
      localStorage.setItem(TOKEN_KEY, t);
      window.history.replaceState({}, "", window.location.pathname);
      setMessage("GitHub connected");
    } else if (gh === "error") {
      setError("GitHub OAuth failed");
      window.history.replaceState({}, "", window.location.pathname);
    }
    refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const importRepo = async (value: string) => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${API}/github/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ repo: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      const files: WorkspaceFile[] = data.files.map(
        (f: { path: string; content: string }) => ({
          path: f.path,
          content: f.content,
          language: languageFromPath(f.path),
        })
      );
      onImport(files, { owner: data.owner, repo: data.repo });
      setMessage(
        `Imported ${files.length} files from ${data.owner}/${data.repo}`
      );
    } catch (e: any) {
      setError(e.message || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-ide-muted">
        GitHub
      </div>

      <div className="mx-3 mb-3 rounded border border-ide-border bg-ide-bg p-3">
        <div className="mb-2 flex items-center gap-2 text-xs text-ide-text">
          <VscGithub size={14} />
          {status?.connected ? (
            <span>
              Signed in as <strong>{status.login}</strong>
            </span>
          ) : (
            <span>Import a repository into this workspace</span>
          )}
        </div>

        {status?.oauthConfigured ? (
          <a
            href={`${API}/github/login`}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded bg-[#238636] py-1.5 text-xs text-white hover:bg-[#2ea043]"
          >
            <VscGithub size={14} />
            {status.connected ? "Re-connect GitHub" : "Connect GitHub"}
          </a>
        ) : (
          <p className="mb-2 text-[10px] leading-relaxed text-ide-muted">
            Public repos work without login. For private repos, set{" "}
            <code className="text-ide-orange">GITHUB_TOKEN</code> or OAuth keys
            in <code className="text-ide-orange">express-server/.env</code>.
          </p>
        )}

        <label className="mb-1 block text-[10px] text-ide-muted">
          owner/repo or GitHub URL
        </label>
        <input
          value={repoInput}
          onChange={(e) => setRepoInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") importRepo(repoInput);
          }}
          placeholder="owner/repo"
          className="mb-2 w-full rounded border border-ide-border bg-ide-input px-2 py-1.5 text-xs text-white outline-none focus:border-ide-status"
        />
        <button
          type="button"
          disabled={loading || !repoInput.trim()}
          onClick={() => importRepo(repoInput)}
          className="flex w-full items-center justify-center gap-2 rounded bg-ide-accent py-1.5 text-xs text-white hover:bg-ide-accentHover disabled:opacity-40"
        >
          <VscCloudDownload size={14} />
          {loading ? "Importing…" : "Import into workspace"}
        </button>

        {error && (
          <p className="mt-2 text-[11px] text-red-400">{error}</p>
        )}
        {message && (
          <p className="mt-2 text-[11px] text-ide-green">{message}</p>
        )}
      </div>

      {repos.length > 0 && (
        <>
          <div className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-ide-muted">
            Your repositories
          </div>
          <div className="ide-scroll flex-1 overflow-y-auto px-2 pb-4">
            {repos.map((r) => (
              <button
                key={r.fullName}
                type="button"
                onClick={() => {
                  setRepoInput(r.fullName);
                  importRepo(r.fullName);
                }}
                className="mb-1 flex w-full flex-col rounded px-2 py-1.5 text-left hover:bg-ide-hover"
              >
                <span className="flex items-center gap-1 text-xs text-white">
                  {r.fullName}
                  {r.private && (
                    <span className="text-[10px] text-ide-orange">private</span>
                  )}
                </span>
                {r.description && (
                  <span className="truncate text-[10px] text-ide-muted">
                    {r.description}
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {!repos.length && (
        <a
          href="https://github.com/new"
          target="_blank"
          rel="noreferrer"
          className="mx-3 mt-auto mb-3 flex items-center justify-center gap-1 rounded border border-ide-border py-1.5 text-[11px] text-ide-muted hover:text-white"
        >
          <VscLinkExternal size={12} />
          Create repo on GitHub
        </a>
      )}
    </div>
  );
}
