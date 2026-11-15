// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/lib/test-utils";
import { SocketManager } from "@/components/chat/socket-manager";
import { socket } from "@/lib/socket";
import { usePresenceStore } from "@/store/presenceStore";

type Handler = (...args: unknown[]) => void;

vi.mock("@/lib/socket", () => ({
  socket: {
    auth: undefined as { token?: string } | undefined,
    connected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
    handlers: {} as Record<string, Handler>,
    on: vi.fn(function (this: { handlers: Record<string, Handler> }, event: string, fn: Handler) {
      this.handlers[event] = fn;
    }),
    off: vi.fn(function (this: { handlers: Record<string, Handler> }, event: string) {
      delete this.handlers[event];
    }),
  },
}));

const fakeSocket = socket as unknown as {
  auth: { token?: string } | undefined;
  connected: boolean;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  handlers: Record<string, Handler>;
};

vi.mock("@/app/actions/chat", () => ({
  fetchConversationsAction: vi.fn().mockResolvedValue({
    conversations: [
      {
        id: "conv-1",
        type: "dm",
        name: null,
        dmKey: "u2:me",
        createdBy: "me",
        createdAt: "2026-01-01T00:00:00Z",
        role: "member",
        joinedAt: "2026-01-01T00:00:00Z",
        otherUser: { userId: "u2", id: "u2", name: "Peer", image: null, username: "peer", avatarKey: null },
      },
    ],
  }),
}));

function presenceHandler() {
  const registered = fakeSocket.on.mock.calls.find(
    (call) => call[0] === "presence:update"
  );
  if (!registered) throw new Error("presence:update listener not registered");
  return registered[1] as (payload: { userId: string; status: "online" | "offline" }) => void;
}

beforeEach(() => {
  usePresenceStore.setState({ onlineUserIds: {} });
  fakeSocket.handlers = {};
  fakeSocket.on.mockClear();
  fakeSocket.off.mockClear();
  fakeSocket.emit.mockClear();
  fakeSocket.connect.mockClear();
  fakeSocket.disconnect.mockClear();
});

describe("SocketManager", () => {
  it("renders nothing (null component)", () => {
    const { container } = renderWithProviders(<SocketManager sessionToken="tok" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("attaches the session token and connects when a token is present", () => {
    renderWithProviders(<SocketManager sessionToken="tok-123" />);

    expect(fakeSocket.auth).toEqual({ token: "tok-123" });
    expect(fakeSocket.connect).toHaveBeenCalledTimes(1);
  });

  it("does not connect when no session token is provided", () => {
    renderWithProviders(<SocketManager sessionToken={undefined} />);

    expect(fakeSocket.connect).not.toHaveBeenCalled();
  });

  it("registers and cleans up presence listeners around the lifecycle", () => {
    const { unmount } = renderWithProviders(<SocketManager sessionToken="tok" />);

    const registeredEvents = fakeSocket.on.mock.calls.map((call) => call[0]);
    expect(registeredEvents).toContain("presence:update");
    expect(registeredEvents).toContain("connect");

    unmount();

    const removedEvents = fakeSocket.off.mock.calls.map((call) => call[0]);
    expect(removedEvents).toContain("presence:update");
    expect(removedEvents).toContain("connect");
  });

  it("routes presence:update events into the presence store", () => {
    renderWithProviders(<SocketManager sessionToken="tok" />);

    presenceHandler()({ userId: "u2", status: "online" });
    presenceHandler()({ userId: "u3", status: "offline" });

    expect(usePresenceStore.getState().isUserOnline("u2")).toBe(true);
    expect(usePresenceStore.getState().isUserOnline("u3")).toBe(false);
  });

  it("ignores malformed presence:update payloads", () => {
    renderWithProviders(<SocketManager sessionToken="tok" />);

    presenceHandler()({ userId: "", status: "online" });

    expect(usePresenceStore.getState().onlineUserIds).toEqual({});
  });
});

