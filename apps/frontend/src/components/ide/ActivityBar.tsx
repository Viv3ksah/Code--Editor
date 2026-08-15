import {
  VscFiles,
  VscSearch,
  VscSourceControl,
  VscAccount,
  VscGithub,
} from "react-icons/vsc";
import type { SidebarView } from "../../lib/workspace";

type Props = {
  active: SidebarView;
  onChange: (view: SidebarView) => void;
  userCount: number;
  dirtyCount: number;
};

const items: {
  id: SidebarView;
  icon: typeof VscFiles;
  label: string;
}[] = [
  { id: "explorer", icon: VscFiles, label: "Explorer" },
  { id: "search", icon: VscSearch, label: "Search" },
  { id: "git", icon: VscSourceControl, label: "Source Control" },
  { id: "github", icon: VscGithub, label: "GitHub" },
  { id: "users", icon: VscAccount, label: "Collaborators" },
];

export default function ActivityBar({
  active,
  onChange,
  userCount,
  dirtyCount,
}: Props) {
  return (
    <aside className="flex w-12 shrink-0 flex-col items-center bg-ide-activity border-r border-ide-border py-2">
      {items.map(({ id, icon: Icon, label }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            title={label}
            aria-label={label}
            onClick={() => onChange(id)}
            className={`relative mb-1 flex h-12 w-12 items-center justify-center transition-colors ${
              isActive
                ? "text-white border-l-2 border-white"
                : "text-ide-muted border-l-2 border-transparent hover:text-white"
            }`}
          >
            <Icon size={24} />
            {id === "users" && userCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ide-status px-1 text-[10px] font-semibold text-white">
                {userCount}
              </span>
            )}
            {id === "git" && dirtyCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ide-orange px-1 text-[10px] font-semibold text-black">
                {dirtyCount}
              </span>
            )}
          </button>
        );
      })}
    </aside>
  );
}
