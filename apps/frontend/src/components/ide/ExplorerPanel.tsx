import { useMemo, useState } from "react";
import {
  VscChevronDown,
  VscChevronRight,
  VscFile,
  VscFolder,
  VscFolderOpened,
  VscNewFile,
  VscRefresh,
  VscTrash,
} from "react-icons/vsc";
import type { FileTreeNode, WorkspaceFile } from "../../lib/workspace";
import { buildFileTree } from "../../lib/workspace";

type Props = {
  files: WorkspaceFile[];
  activePath: string;
  onOpen: (path: string) => void;
  onCreateFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
};

function TreeNode({
  node,
  depth,
  activePath,
  onOpen,
  onDeleteFile,
}: {
  node: FileTreeNode;
  depth: number;
  activePath: string;
  onOpen: (path: string) => void;
  onDeleteFile: (path: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const isActive = node.type === "file" && node.path === activePath;

  if (node.type === "folder") {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-1 py-0.5 pr-2 text-left text-[13px] text-ide-text hover:bg-ide-hover"
          style={{ paddingLeft: 8 + depth * 12 }}
        >
          {open ? <VscChevronDown size={14} /> : <VscChevronRight size={14} />}
          {open ? (
            <VscFolderOpened size={14} className="text-ide-orange" />
          ) : (
            <VscFolder size={14} className="text-ide-orange" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {open &&
          node.children?.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              onOpen={onOpen}
              onDeleteFile={onDeleteFile}
            />
          ))}
      </div>
    );
  }

  return (
    <div
      className={`group flex w-full items-center text-[13px] ${
        isActive ? "bg-ide-active text-white" : "text-ide-text hover:bg-ide-hover"
      }`}
      style={{ paddingLeft: 8 + depth * 12 }}
    >
      <button
        type="button"
        onClick={() => onOpen(node.path)}
        className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5 pr-1 text-left"
      >
        <VscFile size={14} className="shrink-0 text-ide-muted" />
        <span className="truncate">{node.name}</span>
      </button>
      {node.path !== "README.md" && (
        <button
          type="button"
          title="Delete file"
          onClick={() => onDeleteFile(node.path)}
          className="mr-1 hidden rounded p-0.5 text-ide-muted hover:text-red-400 group-hover:block"
        >
          <VscTrash size={12} />
        </button>
      )}
    </div>
  );
}

export default function ExplorerPanel({
  files,
  activePath,
  onOpen,
  onCreateFile,
  onDeleteFile,
}: Props) {
  const tree = useMemo(() => buildFileTree(files), [files]);
  const [creating, setCreating] = useState(false);
  const [newPath, setNewPath] = useState("src/untitled.js");

  const submitNew = () => {
    const trimmed = newPath.trim().replace(/^\/+/, "");
    if (!trimmed) return;
    onCreateFile(trimmed);
    setCreating(false);
    setNewPath("src/untitled.js");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ide-muted">
          Explorer
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            title="New File"
            onClick={() => setCreating(true)}
            className="rounded p-1 text-ide-muted hover:bg-ide-hover hover:text-white"
          >
            <VscNewFile size={14} />
          </button>
          <button
            type="button"
            title="Refresh"
            className="rounded p-1 text-ide-muted hover:bg-ide-hover hover:text-white"
          >
            <VscRefresh size={14} />
          </button>
        </div>
      </div>

      <div className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-ide-text">
        Workspace
      </div>

      {creating && (
        <div className="mx-2 mb-2 rounded border border-ide-border bg-ide-bg p-2">
          <input
            autoFocus
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitNew();
              if (e.key === "Escape") setCreating(false);
            }}
            className="w-full bg-ide-input px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-ide-status"
            placeholder="path/to/file.ext"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={submitNew}
              className="rounded bg-ide-accent px-2 py-0.5 text-xs text-white hover:bg-ide-accentHover"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded px-2 py-0.5 text-xs text-ide-muted hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="ide-scroll flex-1 overflow-y-auto pb-4">
        {tree.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            depth={0}
            activePath={activePath}
            onOpen={onOpen}
            onDeleteFile={onDeleteFile}
          />
        ))}
      </div>
    </div>
  );
}
