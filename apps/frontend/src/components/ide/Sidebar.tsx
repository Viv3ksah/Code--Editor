import type { ReactNode } from "react";
import type { SidebarView } from "../../lib/workspace";
import ExplorerPanel from "./ExplorerPanel";
import SearchPanel from "./SearchPanel";
import SourceControlPanel from "./SourceControlPanel";
import CollaboratorsPanel from "./CollaboratorsPanel";
import GithubPanel from "./GithubPanel";
import type { CommitRecord, WorkspaceFile } from "../../lib/workspace";

type Props = {
  view: SidebarView;
  open: boolean;
  files: WorkspaceFile[];
  activePath: string;
  baseline: Record<string, string>;
  commits: CommitRecord[];
  users: { id: string; name: string }[];
  roomId: string;
  currentUserId: string;
  onOpenFile: (path: string) => void;
  onCreateFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onCommit: (message: string, dirtyPaths: string[]) => void;
  onImportGithub: (
    files: WorkspaceFile[],
    meta: { owner: string; repo: string }
  ) => void;
};

export default function Sidebar(props: Props) {
  if (!props.open) return null;

  let body: ReactNode = null;
  switch (props.view) {
    case "explorer":
      body = (
        <ExplorerPanel
          files={props.files}
          activePath={props.activePath}
          onOpen={props.onOpenFile}
          onCreateFile={props.onCreateFile}
          onDeleteFile={props.onDeleteFile}
        />
      );
      break;
    case "search":
      body = <SearchPanel files={props.files} onOpen={props.onOpenFile} />;
      break;
    case "git":
      body = (
        <SourceControlPanel
          files={props.files}
          baseline={props.baseline}
          commits={props.commits}
          onCommit={props.onCommit}
        />
      );
      break;
    case "github":
      body = <GithubPanel onImport={props.onImportGithub} />;
      break;
    case "users":
      body = (
        <CollaboratorsPanel
          users={props.users}
          roomId={props.roomId}
          currentUserId={props.currentUserId}
        />
      );
      break;
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-ide-border bg-ide-sidebar">
      {body}
    </aside>
  );
}
