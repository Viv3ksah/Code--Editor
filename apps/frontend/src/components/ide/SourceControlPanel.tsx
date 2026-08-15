import { useState } from "react";
import { VscGitCommit, VscSourceControl, VscCircleFilled } from "react-icons/vsc";
import type { CommitRecord, WorkspaceFile } from "../../lib/workspace";

type Props = {
  files: WorkspaceFile[];
  baseline: Record<string, string>;
  commits: CommitRecord[];
  onCommit: (message: string, dirtyPaths: string[]) => void;
};

export default function SourceControlPanel({
  files,
  baseline,
  commits,
  onCommit,
}: Props) {
  const [message, setMessage] = useState("");

  const dirty = files.filter(
    (f) => (baseline[f.path] ?? "") !== f.content
  );

  const handleCommit = () => {
    const msg = message.trim();
    if (!msg || dirty.length === 0) return;
    onCommit(
      msg,
      dirty.map((f) => f.path)
    );
    setMessage("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-ide-muted">
        Source Control
      </div>

      <div className="border-b border-ide-border px-3 pb-3">
        <div className="mb-2 flex items-center gap-2 text-xs text-ide-text">
          <VscSourceControl size={14} />
          <span>
            main <span className="text-ide-muted">• local checkpoints</span>
          </span>
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message (Ctrl+Enter to commit)"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleCommit();
          }}
          className="ide-scroll w-full resize-none rounded border border-ide-border bg-ide-bg px-2 py-1.5 text-xs text-white placeholder:text-ide-muted outline-none focus:border-ide-status"
        />
        <button
          type="button"
          disabled={!message.trim() || dirty.length === 0}
          onClick={handleCommit}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded bg-ide-accent py-1.5 text-xs font-medium text-white hover:bg-ide-accentHover disabled:cursor-not-allowed disabled:opacity-40"
        >
          <VscGitCommit size={14} />
          Commit
        </button>
      </div>

      <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-ide-muted">
        Changes ({dirty.length})
      </div>
      <div className="ide-scroll max-h-40 overflow-y-auto border-b border-ide-border px-2 pb-2">
        {dirty.length === 0 ? (
          <p className="px-2 text-xs text-ide-muted">No changes</p>
        ) : (
          dirty.map((f) => (
            <div
              key={f.path}
              className="flex items-center gap-2 rounded px-2 py-1 text-xs text-ide-text hover:bg-ide-hover"
            >
              <VscCircleFilled size={8} className="text-ide-orange" />
              <span className="truncate">{f.path}</span>
              <span className="ml-auto text-[10px] text-ide-muted">M</span>
            </div>
          ))
        )}
      </div>

      <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-ide-muted">
        History
      </div>
      <div className="ide-scroll flex-1 overflow-y-auto px-2 pb-4">
        {commits.length === 0 ? (
          <p className="px-2 text-xs text-ide-muted">No commits yet</p>
        ) : (
          commits.map((c) => (
            <div
              key={c.id}
              className="mb-2 rounded border border-ide-border bg-ide-bg px-2 py-1.5"
            >
              <p className="text-xs font-medium text-white">{c.message}</p>
              <p className="mt-0.5 text-[10px] text-ide-muted">
                {c.author} · {new Date(c.timestamp).toLocaleString()}
              </p>
              <p className="mt-0.5 truncate text-[10px] text-ide-muted">
                {c.files.join(", ")}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
