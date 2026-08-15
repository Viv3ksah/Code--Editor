import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import { useRecoilState } from "recoil";
import { useNavigate, useParams } from "react-router-dom";
import { userAtom } from "../atoms/userAtom";
import { socketAtom } from "../atoms/socketAtom";
import { connectedUsersAtom } from "../atoms/connectedUsersAtom";
import { API_URL } from "../Globle";
import ActivityBar from "../components/ide/ActivityBar";
import Sidebar from "../components/ide/Sidebar";
import TitleBar from "../components/ide/TitleBar";
import TabBar from "../components/ide/TabBar";
import BottomPanel from "../components/ide/BottomPanel";
import StatusBar from "../components/ide/StatusBar";
import {
  type BottomTab,
  type CommitRecord,
  type SidebarView,
  type WorkspaceFile,
  createDefaultWorkspace,
  entryFileForLanguage,
  languageFromPath,
} from "../lib/workspace";

const PANEL_HEIGHT = 180;
const CODE_SYNC_MS = 80;
const FILES_UI_MS = 120;

const CodeEditor: React.FC = () => {
  const [language, setLanguage] = useState("javascript");
  const [files, setFiles] = useState<WorkspaceFile[]>(() =>
    createDefaultWorkspace("javascript")
  );
  const [activePath, setActivePath] = useState(
    () => entryFileForLanguage("javascript")
  );
  const [openPaths, setOpenPaths] = useState<string[]>(() => [
    entryFileForLanguage("javascript"),
  ]);
  const [baseline, setBaseline] = useState<Record<string, string>>(() => {
    const ws = createDefaultWorkspace("javascript");
    return Object.fromEntries(ws.map((f) => [f.path, f.content]));
  });
  const [commits, setCommits] = useState<CommitRecord[]>([]);
  const [output, setOutput] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [socket, setSocket] = useRecoilState<WebSocket | null>(socketAtom);
  const [isLoading, setIsLoading] = useState(false);
  const [currentButtonState, setCurrentButtonState] = useState("Run");
  const [user, setUser] = useRecoilState(userAtom);
  const [connectedUsers, setConnectedUsers] =
    useRecoilState<any[]>(connectedUsersAtom);
  const [sidebarView, setSidebarView] = useState<SidebarView>("explorer");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bottomTab, setBottomTab] = useState<BottomTab>("terminal");
  const navigate = useNavigate();
  const parms = useParams();
  const applyingRemote = useRef(false);
  const editorRef = useRef<any>(null);
  const codeSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filesUiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef<Record<string, string>>({});
  const stateRef = useRef({
    files,
    input,
    language,
    currentButtonState,
    isLoading,
    activePath,
  });

  stateRef.current = {
    files,
    input,
    language,
    currentButtonState,
    isLoading,
    activePath,
  };

  // Keep a fast in-memory map so Run / sync don't wait on React state
  useEffect(() => {
    for (const f of files) latestContentRef.current[f.path] = f.content;
  }, [files]);

  const activeFile = useMemo(
    () => files.find((f) => f.path === activePath) ?? files[0],
    [files, activePath]
  );

  const dirtyPaths = useMemo(() => {
    const set = new Set<string>();
    for (const f of files) {
      if ((baseline[f.path] ?? "") !== f.content) set.add(f.path);
    }
    return set;
  }, [files, baseline]);

  const syncWorkspace = useCallback(
    (nextFiles: WorkspaceFile[], nextLanguage?: string, nextActive?: string) => {
      socket?.send(
        JSON.stringify({
          type: "workspace",
          files: nextFiles,
          language: nextLanguage ?? language,
          activePath: nextActive ?? activePath,
          roomId: user.roomId,
        })
      );
    },
    [socket, language, activePath, user.roomId]
  );

  const openFile = useCallback((path: string) => {
    setActivePath(path);
    setOpenPaths((prev) => (prev.includes(path) ? prev : [...prev, path]));
  }, []);

  const closeTab = useCallback(
    (path: string) => {
      setOpenPaths((prev) => {
        const next = prev.filter((p) => p !== path);
        if (path === activePath) {
          const fallback = next[next.length - 1] ?? files[0]?.path;
          if (fallback) setActivePath(fallback);
        }
        return next.length ? next : prev;
      });
    },
    [activePath, files]
  );

  const flushFilesUi = useCallback((path: string, content: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.path === path ? { ...f, content } : f))
    );
  }, []);

  /** Local typing: do not control Monaco via React `value`, and do not send full workspace. */
  const updateActiveContent = useCallback(
    (content: string) => {
      if (applyingRemote.current) return;
      const path = stateRef.current.activePath;
      latestContentRef.current[path] = content;

      if (filesUiTimer.current) clearTimeout(filesUiTimer.current);
      filesUiTimer.current = setTimeout(() => {
        flushFilesUi(path, content);
      }, FILES_UI_MS);

      if (codeSyncTimer.current) clearTimeout(codeSyncTimer.current);
      codeSyncTimer.current = setTimeout(() => {
        socket?.send(
          JSON.stringify({
            type: "code",
            code: latestContentRef.current[path] ?? content,
            path,
            roomId: user.roomId,
          })
        );
      }, CODE_SYNC_MS);
    },
    [socket, user.roomId, flushFilesUi]
  );

  const applyRemoteCode = useCallback((path: string, code: string) => {
    latestContentRef.current[path] = code;
    setFiles((prev) =>
      prev.map((f) => (f.path === path ? { ...f, content: code } : f))
    );

    const editor = editorRef.current;
    if (!editor || path !== stateRef.current.activePath) return;
    if (editor.getValue() === code) return;

    applyingRemote.current = true;
    const position = editor.getPosition();
    const selection = editor.getSelection();
    editor.setValue(code);
    if (selection) editor.setSelection(selection);
    else if (position) editor.setPosition(position);
    // Let Monaco finish before accepting local edits again
    requestAnimationFrame(() => {
      applyingRemote.current = false;
    });
  }, []);

  useEffect(() => {
    if (!socket) {
      navigate("/" + parms.roomId);
      return;
    }

    socket.send(
      JSON.stringify({
        type: "requestToGetUsers",
        userId: user.id,
      })
    );
    socket.send(JSON.stringify({ type: "requestForAllData" }));

    socket.onclose = () => {
      setUser({ id: "", name: "", roomId: "" });
      setSocket(null);
    };

    return () => {
      socket?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!socket) {
      navigate("/" + parms.roomId);
      return;
    }

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "users") {
        setConnectedUsers(data.users);
      }

      if (data.type === "code") {
        const path = data.path || stateRef.current.activePath;
        applyRemoteCode(path, data.code);
      }

      if (data.type === "workspace") {
        if (Array.isArray(data.files)) {
          for (const f of data.files) {
            latestContentRef.current[f.path] = f.content;
          }
          setFiles(data.files);
          const active = data.activePath || stateRef.current.activePath;
          const activeFile = data.files.find(
            (f: WorkspaceFile) => f.path === active
          );
          if (activeFile) applyRemoteCode(activeFile.path, activeFile.content);
        }
        if (data.language) setLanguage(data.language);
        if (data.activePath) {
          setActivePath(data.activePath);
          setOpenPaths((prev) =>
            prev.includes(data.activePath)
              ? prev
              : [...prev, data.activePath]
          );
        }
      }

      if (data.type === "input") setInput(data.input);

      if (data.type === "language") {
        setLanguage(data.language);
      }

      if (data.type === "submitBtnStatus") {
        setCurrentButtonState(data.value);
        setIsLoading(data.isLoading);
      }

      if (data.type === "output") {
        setOutput((prev) => [...prev, data.message]);
        setBottomTab("terminal");
        handleButtonStatus("Run", false);
      }

      if (data.type === "requestForAllData") {
        const s = stateRef.current;
        const filesSnapshot = s.files.map((f) => ({
          ...f,
          content: latestContentRef.current[f.path] ?? f.content,
        }));
        const entry =
          filesSnapshot.find((f) => f.path === s.activePath) ?? filesSnapshot[0];
        socket?.send(
          JSON.stringify({
            type: "allData",
            code: entry?.content ?? "",
            input: s.input,
            language: s.language,
            currentButtonState: s.currentButtonState,
            isLoading: s.isLoading,
            files: filesSnapshot,
            activePath: s.activePath,
            userId: data.userId,
          })
        );
      }

      if (data.type === "allData") {
        if (Array.isArray(data.files) && data.files.length) {
          for (const f of data.files as WorkspaceFile[]) {
            latestContentRef.current[f.path] = f.content;
          }
          setFiles(data.files);
          setBaseline(
            Object.fromEntries(
              data.files.map((f: WorkspaceFile) => [f.path, f.content])
            )
          );
          const path = data.activePath || entryFileForLanguage(data.language || "javascript");
          const file = data.files.find((f: WorkspaceFile) => f.path === path);
          if (file) applyRemoteCode(file.path, file.content);
        } else if (data.code != null) {
          const path =
            data.activePath ||
            entryFileForLanguage(data.language || "javascript");
          applyRemoteCode(path, data.code);
        }
        setInput(data.input ?? "");
        if (data.language) setLanguage(data.language);
        if (data.activePath) {
          setActivePath(data.activePath);
          setOpenPaths((prev) =>
            prev.includes(data.activePath)
              ? prev
              : [...prev, data.activePath]
          );
        }
        setCurrentButtonState(data.currentButtonState || "Run");
        setIsLoading(!!data.isLoading);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, applyRemoteCode]);

  useEffect(() => {
    return () => {
      if (codeSyncTimer.current) clearTimeout(codeSyncTimer.current);
      if (filesUiTimer.current) clearTimeout(filesUiTimer.current);
    };
  }, []);

  const handleButtonStatus = (value: string, loading: boolean) => {
    setCurrentButtonState(value);
    setIsLoading(loading);
    socket?.send(
      JSON.stringify({
        type: "submitBtnStatus",
        value,
        isLoading: loading,
        roomId: user.roomId,
      })
    );
  };

  const handleSubmit = async () => {
    handleButtonStatus("Running…", true);
    setBottomTab("terminal");
    const entryPath = entryFileForLanguage(language);
    const entryContent =
      latestContentRef.current[entryPath] ??
      files.find((f) => f.path === entryPath)?.content ??
      files.find((f) => f.language === language)?.content ??
      activeFile?.content ??
      "";

    const submission = {
      code: entryContent,
      language,
      roomId: user.roomId,
      input,
    };

    socket?.send(user?.id ? user.id : "");

    const res = await fetch(`${API_URL}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
    });

    handleButtonStatus("Compiling…", true);

    if (!res.ok) {
      setOutput((prev) => [
        ...prev,
        "Error submitting code. Please try again.",
      ]);
      handleButtonStatus("Run", false);
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    socket?.send(
      JSON.stringify({
        type: "input",
        input: value,
        roomId: user.roomId,
      })
    );
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    const entryPath = entryFileForLanguage(value);
    setFiles((prev) => {
      const exists = prev.some((f) => f.path === entryPath);
      let next = prev;
      if (!exists) {
        const defaults = createDefaultWorkspace(value);
        const entry = defaults.find((f) => f.path === entryPath)!;
        next = [...prev, entry];
      }
      syncWorkspace(next, value, entryPath);
      return next;
    });
    openFile(entryPath);
    socket?.send(
      JSON.stringify({
        type: "language",
        language: value,
        roomId: user.roomId,
      })
    );
  };

  const handleCreateFile = (path: string) => {
    if (files.some((f) => f.path === path)) {
      openFile(path);
      return;
    }
    const next: WorkspaceFile[] = [
      ...files,
      { path, content: "", language: languageFromPath(path) },
    ];
    setFiles(next);
    openFile(path);
    syncWorkspace(next);
  };

  const handleDeleteFile = (path: string) => {
    if (files.length <= 1) return;
    const next = files.filter((f) => f.path !== path);
    setFiles(next);
    setOpenPaths((prev) => prev.filter((p) => p !== path));
    if (activePath === path) {
      setActivePath(next[0].path);
    }
    syncWorkspace(next);
  };

  const handleCommit = (message: string, dirty: string[]) => {
    const commit: CommitRecord = {
      id: `${Date.now()}`,
      message,
      author: user.name || "You",
      timestamp: Date.now(),
      files: dirty,
    };
    setCommits((prev) => [commit, ...prev]);
    setBaseline(Object.fromEntries(files.map((f) => [f.path, f.content])));
  };

  const handleImportGithub = (
    imported: WorkspaceFile[],
    meta: { owner: string; repo: string }
  ) => {
    setFiles(imported);
    setBaseline(
      Object.fromEntries(imported.map((f) => [f.path, f.content]))
    );
    setCommits((prev) => [
      {
        id: `${Date.now()}`,
        message: `Import ${meta.owner}/${meta.repo}`,
        author: user.name || "You",
        timestamp: Date.now(),
        files: imported.map((f) => f.path),
      },
      ...prev,
    ]);
    const first =
      imported.find((f) => /readme\.md$/i.test(f.path))?.path ||
      imported[0]?.path;
    if (first) {
      setActivePath(first);
      setOpenPaths([first]);
    }
    setSidebarView("explorer");
    syncWorkspace(imported, language, first);
  };

  const handleActivityChange = (view: SidebarView) => {
    if (view === sidebarView && sidebarOpen) {
      setSidebarOpen(false);
    } else {
      setSidebarView(view);
      setSidebarOpen(true);
    }
  };

  const handleLeave = () => {
    socket?.close();
    setSocket(null);
    setUser({ id: "", name: "", roomId: "" });
    navigate("/");
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    editor.onDidChangeModelContent(() => {
      if (applyingRemote.current) return;
      updateActiveContent(editor.getValue());
    });
  };

  const connected =
    !!socket &&
    (socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING);

  return (
    <div className="flex h-screen flex-col bg-ide-bg text-ide-text">
      <TitleBar
        roomId={user.roomId}
        language={language}
        isLoading={isLoading}
        runLabel={currentButtonState}
        onLanguageChange={handleLanguageChange}
        onRun={handleSubmit}
        onLeave={handleLeave}
      />

      <div className="flex min-h-0 flex-1">
        <ActivityBar
          active={sidebarView}
          onChange={handleActivityChange}
          userCount={connectedUsers.length}
          dirtyCount={dirtyPaths.size}
        />

        <Sidebar
          view={sidebarView}
          open={sidebarOpen}
          files={files}
          activePath={activePath}
          baseline={baseline}
          commits={commits}
          users={connectedUsers}
          roomId={user.roomId}
          currentUserId={user.id}
          onOpenFile={openFile}
          onCreateFile={handleCreateFile}
          onDeleteFile={handleDeleteFile}
          onCommit={handleCommit}
          onImportGithub={handleImportGithub}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          <TabBar
            openPaths={openPaths}
            activePath={activePath}
            dirtyPaths={dirtyPaths}
            onSelect={openFile}
            onClose={closeTab}
          />

          <div className="min-h-0 flex-1">
            <MonacoEditor
              key={activePath}
              defaultValue={
                latestContentRef.current[activePath] ??
                activeFile?.content ??
                ""
              }
              language={activeFile?.language ?? language}
              theme="vs-dark"
              height="100%"
              onMount={handleEditorDidMount}
              options={{
                fontSize: 14,
                fontFamily:
                  "Cascadia Code, Consolas, Menlo, Monaco, monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 8 },
                renderLineHighlight: "line",
                cursorBlinking: "smooth",
                smoothScrolling: true,
                // Avoid expensive work while typing
                quickSuggestions: false,
                wordBasedSuggestions: "off",
              }}
            />
          </div>

          <BottomPanel
            tab={bottomTab}
            onTabChange={setBottomTab}
            height={PANEL_HEIGHT}
            input={input}
            output={output}
            onInputChange={handleInputChange}
            onClearOutput={() => setOutput([])}
            isLoading={isLoading}
          />
        </main>
      </div>

      <StatusBar
        language={activeFile?.language ?? language}
        userCount={connectedUsers.length}
        roomId={user.roomId}
        filePath={activePath}
        connected={connected}
      />
    </div>
  );
};

export default CodeEditor;
