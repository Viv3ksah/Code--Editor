import { useMemo, useState } from "react";
import { VscSearch } from "react-icons/vsc";
import type { WorkspaceFile } from "../../lib/workspace";

type Props = {
  files: WorkspaceFile[];
  onOpen: (path: string, line?: number) => void;
};

export default function SearchPanel({ files, onOpen }: Props) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const hits: { path: string; line: number; preview: string }[] = [];
    for (const file of files) {
      const lines = file.content.split("\n");
      lines.forEach((line, i) => {
        if (line.toLowerCase().includes(q)) {
          hits.push({
            path: file.path,
            line: i + 1,
            preview: line.trim().slice(0, 120),
          });
        }
      });
    }
    return hits.slice(0, 80);
  }, [files, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-ide-muted">
        Search
      </div>
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 rounded border border-ide-border bg-ide-bg px-2 py-1.5">
          <VscSearch size={14} className="text-ide-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workspace"
            className="w-full bg-transparent text-xs text-white outline-none placeholder:text-ide-muted"
          />
        </div>
      </div>
      <div className="ide-scroll flex-1 overflow-y-auto px-2 pb-4">
        {!query.trim() ? (
          <p className="px-2 text-xs text-ide-muted">Type to search across files</p>
        ) : results.length === 0 ? (
          <p className="px-2 text-xs text-ide-muted">No results</p>
        ) : (
          results.map((r, idx) => (
            <button
              key={`${r.path}:${r.line}:${idx}`}
              type="button"
              onClick={() => onOpen(r.path, r.line)}
              className="mb-1 w-full rounded px-2 py-1.5 text-left hover:bg-ide-hover"
            >
              <div className="truncate text-xs text-ide-green">
                {r.path}
                <span className="text-ide-muted">:{r.line}</span>
              </div>
              <div className="truncate font-mono text-[11px] text-ide-text">
                {r.preview}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
