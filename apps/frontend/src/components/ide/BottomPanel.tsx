import { useRef, useEffect } from "react";
import type { BottomTab } from "../../lib/workspace";

type Props = {
  tab: BottomTab;
  onTabChange: (tab: BottomTab) => void;
  height: number;
  input: string;
  output: string[];
  onInputChange: (value: string) => void;
  onClearOutput: () => void;
  isLoading: boolean;
};

const TABS: { id: BottomTab; label: string }[] = [
  { id: "terminal", label: "TERMINAL" },
  { id: "output", label: "OUTPUT" },
  { id: "input", label: "INPUT" },
];

export default function BottomPanel({
  tab,
  onTabChange,
  height,
  input,
  output,
  onInputChange,
  onClearOutput,
  isLoading,
}: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [output, tab]);

  return (
    <div
      className="flex shrink-0 flex-col border-t border-ide-border bg-ide-panel"
      style={{ height }}
    >
      <div className="flex h-8 items-center justify-between border-b border-ide-border px-2">
        <div className="flex h-full items-stretch gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              className={`px-3 text-[11px] font-semibold tracking-wide ${
                tab === t.id
                  ? "border-b-2 border-white text-white"
                  : "text-ide-muted hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {(tab === "output" || tab === "terminal") && (
          <button
            type="button"
            onClick={onClearOutput}
            className="px-2 text-[11px] text-ide-muted hover:text-red-400"
          >
            Clear
          </button>
        )}
      </div>

      <div className="ide-scroll min-h-0 flex-1 overflow-auto p-3 font-mono text-xs">
        {tab === "input" ? (
          <textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={"Program stdin...\ne.g.\n5\n10"}
            className="h-full w-full resize-none bg-transparent text-ide-text outline-none placeholder:text-ide-muted"
          />
        ) : tab === "terminal" ? (
          <div className="text-ide-green">
            <p className="text-ide-muted">
              Code Together Shell — run code with the green Run button.
            </p>
            {isLoading && (
              <p className="mt-2 animate-pulse text-ide-orange">
                $ compiling &amp; running…
              </p>
            )}
            {output.map((line, i) => (
              <pre key={i} className="whitespace-pre-wrap">
                {line}
              </pre>
            ))}
            <div ref={endRef} />
            <span className="text-white">$</span>
            <span className="ml-1 inline-block h-3 w-1.5 animate-pulse bg-white align-middle" />
          </div>
        ) : (
          <div className="text-ide-green">
            {output.length === 0 ? (
              <p className="text-ide-muted">
                No output yet. Submit your code to see results.
              </p>
            ) : (
              output.map((line, i) => (
                <pre key={i} className="whitespace-pre-wrap">
                  {line}
                </pre>
              ))
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>
    </div>
  );
}
