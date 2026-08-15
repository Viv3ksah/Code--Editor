import { AiOutlineLoading3Quarters } from "react-icons/ai";
import {
  VscPlay,
  VscShare,
  VscCheck,
  VscClose,
} from "react-icons/vsc";
import { useState } from "react";
import { LANGUAGE_OPTIONS } from "../../lib/workspace";

type Props = {
  roomId: string;
  language: string;
  isLoading: boolean;
  runLabel: string;
  onLanguageChange: (lang: string) => void;
  onRun: () => void;
  onLeave: () => void;
};

export default function TitleBar({
  roomId,
  language,
  isLoading,
  runLabel,
  onLanguageChange,
  onRun,
  onLeave,
}: Props) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}/${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <header className="flex h-9 shrink-0 items-center justify-between border-b border-ide-border bg-ide-sidebar px-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-ide-status text-[10px] font-bold text-white">
            CT
          </div>
          <span className="text-sm font-semibold text-white">Code Together</span>
        </div>
        <span className="hidden text-ide-muted sm:inline">|</span>
        <span className="hidden truncate font-mono text-xs text-ide-muted sm:inline">
          room/{roomId}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="h-7 rounded border border-ide-border bg-ide-bg px-2 text-xs text-ide-text outline-none focus:border-ide-status"
        >
          {LANGUAGE_OPTIONS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={share}
          className="flex h-7 items-center gap-1.5 rounded border border-ide-border bg-ide-bg px-2 text-xs text-ide-text hover:bg-ide-hover"
        >
          {copied ? <VscCheck size={14} /> : <VscShare size={14} />}
          <span className="hidden sm:inline">{copied ? "Copied" : "Share"}</span>
        </button>

        <button
          type="button"
          disabled={isLoading}
          onClick={onRun}
          className="flex h-7 items-center gap-1.5 rounded bg-[#388a34] px-3 text-xs font-medium text-white hover:bg-[#2d6e2a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <AiOutlineLoading3Quarters className="animate-spin" size={14} />
          ) : (
            <VscPlay size={14} />
          )}
          {runLabel}
        </button>

        <button
          type="button"
          title="Leave room"
          onClick={onLeave}
          className="flex h-7 w-7 items-center justify-center rounded text-ide-muted hover:bg-ide-hover hover:text-white"
        >
          <VscClose size={16} />
        </button>
      </div>
    </header>
  );
}
