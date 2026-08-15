import { useState } from "react";
import { VscCopy, VscCheck, VscLink } from "react-icons/vsc";

type User = { id: string; name: string };

type Props = {
  users: User[];
  roomId: string;
  currentUserId: string;
};

const COLORS = [
  "#569cd6",
  "#4ec9b0",
  "#ce9178",
  "#c586c0",
  "#dcdcaa",
  "#9cdcfe",
  "#d7ba7d",
];

export default function CollaboratorsPanel({
  users,
  roomId,
  currentUserId,
}: Props) {
  const [copied, setCopied] = useState(false);
  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${roomId}`
      : `/${roomId}`;

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-ide-muted">
        Collaborators
      </div>

      <div className="mx-3 mb-3 rounded border border-ide-border bg-ide-bg p-3">
        <div className="mb-1 flex items-center gap-1.5 text-xs text-ide-text">
          <VscLink size={14} />
          Share room
        </div>
        <p className="mb-2 font-mono text-[11px] text-ide-muted">Room {roomId}</p>
        <button
          type="button"
          onClick={copyInvite}
          className="flex w-full items-center justify-center gap-2 rounded bg-ide-accent py-1.5 text-xs text-white hover:bg-ide-accentHover"
        >
          {copied ? <VscCheck size={14} /> : <VscCopy size={14} />}
          {copied ? "Copied invite link" : "Copy invite link"}
        </button>
      </div>

      <div className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-ide-muted">
        Online ({users.length})
      </div>
      <div className="ide-scroll flex-1 overflow-y-auto px-2 pb-4">
        {users.length === 0 ? (
          <p className="px-2 text-xs text-ide-muted">No one else here yet</p>
        ) : (
          users.map((u, i) => {
            const color = COLORS[i % COLORS.length];
            const isYou = u.id === currentUserId;
            return (
              <div
                key={u.id}
                className="mb-1 flex items-center gap-2 rounded px-2 py-1.5 hover:bg-ide-hover"
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: color }}
                >
                  {(u.name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-white">
                    {u.name || "Anonymous"}
                    {isYou && (
                      <span className="ml-1 text-ide-muted">(you)</span>
                    )}
                  </p>
                  <p className="text-[10px] text-ide-green">● online</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
