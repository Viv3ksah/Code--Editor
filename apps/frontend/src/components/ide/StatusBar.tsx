import {
  VscSourceControl,
  VscAccount,
  VscRadioTower,
  VscWarning,
} from "react-icons/vsc";

type Props = {
  language: string;
  branch?: string;
  userCount: number;
  roomId: string;
  filePath: string;
  connected: boolean;
};

export default function StatusBar({
  language,
  branch = "main",
  userCount,
  roomId,
  filePath,
  connected,
}: Props) {
  return (
    <footer className="flex h-6 shrink-0 items-center justify-between bg-ide-status px-2 text-[11px] text-white">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <VscSourceControl size={12} />
          {branch}
        </span>
        <span className="flex items-center gap-1">
          <VscRadioTower size={12} />
          {connected ? "Connected" : "Disconnected"}
        </span>
        <span className="hidden sm:inline">room {roomId}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden truncate max-w-[200px] md:inline">{filePath}</span>
        <span className="capitalize">{language}</span>
        <span className="flex items-center gap-1">
          <VscAccount size={12} />
          {userCount}
        </span>
        <span className="flex items-center gap-1 opacity-80">
          <VscWarning size={12} />0
        </span>
        <span>UTF-8</span>
        <span>LF</span>
      </div>
    </footer>
  );
}
