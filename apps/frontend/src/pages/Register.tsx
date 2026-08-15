import { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { userAtom } from "../atoms/userAtom";
import { useNavigate, useParams } from "react-router-dom";
import { socketAtom } from "../atoms/socketAtom";
import { WS_URL } from "../Globle";
import { VscCode, VscOrganization, VscRocket } from "react-icons/vsc";

const Register = () => {
  const [name, setName] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const parms = useParams();
  const [user, setUser] = useRecoilState(userAtom);
  const [socket, setSocket] = useRecoilState<WebSocket | null>(socketAtom);
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const generateId = () => Math.floor(Math.random() * 100000).toString();

  const initializeSocket = () => {
    setLoading(true);
    let GeneratedId = "";
    if (user.id == "") {
      GeneratedId = generateId();
      setUser({
        id: GeneratedId,
        name: name,
        roomId: "",
      });
    }

    if (!socket || socket.readyState === WebSocket.CLOSED) {
      const u = {
        id: user.id == "" ? GeneratedId : user.id,
        name: name,
      };
      if (name == "") {
        alert("Please enter a name to continue");
        setLoading(false);
        return;
      }
      const ws = new WebSocket(
        `${WS_URL}?roomId=${roomId}&id=${u.id}&name=${u.name}`
      );

      setSocket(ws);

      ws.onopen = () => {
        console.log("Connected to WebSocket");
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type == "roomId") {
          setRoomId(data.roomId);
          setUser({
            id: user.id == "" ? GeneratedId : user.id,
            name: name,
            roomId: data.roomId,
          });
          setLoading(false);
          navigate("/code/" + data.roomId);
        }
      };
      ws.onclose = () => {
        console.log("WebSocket connection closed from register page");
        setLoading(false);
      };
    } else {
      setLoading(false);
    }
  };

  const handleNewRoom = () => {
    if (!loading) initializeSocket();
  };

  const handleJoinRoom = () => {
    if (roomId != "" && roomId.length == 6 && !loading) {
      initializeSocket();
    } else {
      alert("Please enter a 6-digit room ID to join");
    }
  };

  useEffect(() => {
    setRoomId(parms.roomId || "");
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0d1117] px-4 text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 20% 20%, #1f6feb33 0%, transparent 50%), radial-gradient(ellipse at 80% 0%, #23863633 0%, transparent 40%), linear-gradient(#161b2222 1px, transparent 1px), linear-gradient(90deg, #161b2222 1px, transparent 1px)",
          backgroundSize: "100% 100%, 100% 100%, 40px 40px, 40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#1f6feb] text-lg font-bold shadow-lg shadow-[#1f6feb44]">
            CT
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Code Together
          </h1>
          <p className="mt-2 text-sm text-[#8b949e]">
            Collaborative workspace — VS Code feel, Replit speed, GitHub-style
            rooms.
          </p>
        </div>

        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6 shadow-2xl">
          <label className="mb-1.5 block text-xs font-medium text-[#8b949e]">
            Display name
          </label>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mb-4 w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb]"
          />

          <label className="mb-1.5 block text-xs font-medium text-[#8b949e]">
            Room ID <span className="text-[#484f58]">(optional to join)</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="6-digit invite code"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="mb-5 w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb]"
          />

          <button
            disabled={loading}
            onClick={handleNewRoom}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#238636] py-2.5 text-sm font-semibold text-white transition hover:bg-[#2ea043] disabled:opacity-50"
          >
            <VscRocket size={16} />
            {loading ? "Connecting…" : "Create new workspace"}
          </button>
          <button
            disabled={loading}
            onClick={handleJoinRoom}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#30363d] bg-[#21262d] py-2.5 text-sm font-semibold text-white transition hover:border-[#8b949e] disabled:opacity-50"
          >
            <VscOrganization size={16} />
            Join existing room
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center text-[11px] text-[#8b949e]">
          <div className="rounded-lg border border-[#30363d] bg-[#161b22]/px-2 py-3">
            <VscCode size={16} className="mx-auto mb-1 text-[#58a6ff]" />
            Live editor
          </div>
          <div className="rounded-lg border border-[#30363d] bg-[#161b22]/px-2 py-3">
            <VscOrganization size={16} className="mx-auto mb-1 text-[#3fb950]" />
            Multiplayer
          </div>
          <div className="rounded-lg border border-[#30363d] bg-[#161b22]/px-2 py-3">
            <VscRocket size={16} className="mx-auto mb-1 text-[#d29922]" />
            Run in Docker
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
