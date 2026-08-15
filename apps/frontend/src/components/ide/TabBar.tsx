import { VscClose } from "react-icons/vsc";

type Props = {
  openPaths: string[];
  activePath: string;
  dirtyPaths: Set<string>;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
};

export default function TabBar({
  openPaths,
  activePath,
  dirtyPaths,
  onSelect,
  onClose,
}: Props) {
  return (
    <div className="flex h-9 shrink-0 items-end overflow-x-auto border-b border-ide-border bg-ide-tab ide-scroll">
      {openPaths.map((path) => {
        const name = path.split("/").pop() ?? path;
        const isActive = path === activePath;
        const dirty = dirtyPaths.has(path);
        return (
          <div
            key={path}
            className={`group flex h-full max-w-[180px] items-center gap-1 border-r border-ide-border px-3 text-xs ${
              isActive
                ? "bg-ide-tabActive text-white border-t-2 border-t-ide-status"
                : "bg-ide-tab text-ide-muted hover:text-white border-t-2 border-t-transparent"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(path)}
              className="min-w-0 flex-1 truncate text-left"
              title={path}
            >
              {dirty && <span className="mr-1 text-white">●</span>}
              {name}
            </button>
            <button
              type="button"
              title="Close"
              onClick={(e) => {
                e.stopPropagation();
                onClose(path);
              }}
              className="rounded p-0.5 opacity-0 hover:bg-ide-hover group-hover:opacity-100"
            >
              <VscClose size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
