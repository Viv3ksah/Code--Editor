export type WorkspaceFile = {
  path: string;
  content: string;
  language: string;
};

export type CommitRecord = {
  id: string;
  message: string;
  author: string;
  timestamp: number;
  files: string[];
};

export type SidebarView = "explorer" | "search" | "git" | "github" | "users";

export type BottomTab = "terminal" | "output" | "input";

export const LANGUAGE_OPTIONS = [
  { value: "javascript", label: "JavaScript", ext: "js", file: "src/main.js" },
  { value: "python", label: "Python", ext: "py", file: "src/main.py" },
  { value: "cpp", label: "C++", ext: "cpp", file: "src/main.cpp" },
  { value: "java", label: "Java", ext: "java", file: "src/Main.java" },
  { value: "rust", label: "Rust", ext: "rs", file: "src/main.rs" },
  { value: "go", label: "Go", ext: "go", file: "src/main.go" },
] as const;

export const DEFAULT_CODE: Record<string, string> = {
  javascript: `// Welcome to Code Together
// Collaborate in real time — share the room invite

function main() {
  console.log("Hello from the workspace!");
}

main();
`,
  python: `# Welcome to Code Together
# Collaborate in real time — share the room invite

def main():
    print("Hello from the workspace!")

if __name__ == "__main__":
    main()
`,
  cpp: `// Welcome to Code Together
#include <iostream>
using namespace std;

int main() {
    cout << "Hello from the workspace!" << endl;
    return 0;
}
`,
  java: `// Welcome to Code Together
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from the workspace!");
    }
}
`,
  rust: `// Welcome to Code Together
fn main() {
    println!("Hello from the workspace!");
}
`,
  go: `// Welcome to Code Together
package main

import "fmt"

func main() {
    fmt.Println("Hello from the workspace!")
}
`,
};

export const README_CONTENT = `# Code Together Workspace

Real-time collaborative coding room — think VS Code + Replit vibes.

## Getting started
1. Pick a language from the status bar / toolbar
2. Edit files in the explorer
3. Hit **Run** to compile & execute
4. Share the room invite with teammates

## Collaboration
- Live code sync across the room
- Shared stdin / stdout panel
- Presence list in the Collaborators view

## Source Control
Use the Source Control sidebar to stage a local snapshot (commit) of your workspace — useful for checkpoints while pairing.
`;

export function createDefaultWorkspace(language = "javascript"): WorkspaceFile[] {
  const lang =
    LANGUAGE_OPTIONS.find((l) => l.value === language) ?? LANGUAGE_OPTIONS[0];
  return [
    {
      path: "README.md",
      content: README_CONTENT,
      language: "markdown",
    },
    {
      path: lang.file,
      content: DEFAULT_CODE[lang.value] ?? DEFAULT_CODE.javascript,
      language: lang.value,
    },
  ];
}

export function languageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    jsx: "javascript",
    tsx: "typescript",
    py: "python",
    cpp: "cpp",
    c: "c",
    h: "cpp",
    java: "java",
    rs: "rust",
    go: "go",
    md: "markdown",
    json: "json",
    html: "html",
    css: "css",
    txt: "plaintext",
  };
  return map[ext] ?? "plaintext";
}

export function entryFileForLanguage(language: string): string {
  return (
    LANGUAGE_OPTIONS.find((l) => l.value === language)?.file ?? "src/main.js"
  );
}

/** Build a nested tree from flat file paths for the explorer */
export type FileTreeNode = {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileTreeNode[];
};

export function buildFileTree(files: WorkspaceFile[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const pathSoFar = parts.slice(0, index + 1).join("/");
      let node = current.find((n) => n.name === part);

      if (!node) {
        node = {
          name: part,
          path: pathSoFar,
          type: isFile ? "file" : "folder",
          children: isFile ? undefined : [],
        };
        current.push(node);
      }

      if (!isFile && node.children) {
        current = node.children;
      }
    });
  }

  const sortNodes = (nodes: FileTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => n.children && sortNodes(n.children));
  };

  sortNodes(root);
  return root;
}
