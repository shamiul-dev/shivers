// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  deleteMessageAction,
  reactMessageAction,
} from "@/app/actions/chat";
import { MessageActionsTrigger } from "@/components/chat/message-actions";
import {
  selectConversationMessages,
  useChatStore,
} from "@/store/chatStore";
import type { Message } from "@/types/chat";

vi.mock("@/app/actions/chat", () => ({
  reactMessageAction: vi.fn(),
  unreactMessageAction: vi.fn(),
  deleteMessageAction: vi.fn(),
  editMessageAction: vi.fn(),
}));

const mockedReact = vi.mocked(reactMessageAction);
const mockedDelete = vi.mocked(deleteMessageAction);

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "m1",
    conversationId: "c1",
    senderId: "u1",
    type: "text",
    body: "hello there",
    clientId: "client-1",
    createdAt: "2026-01-01T00:00:00Z",
    editedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

function seedMessage(message: Message) {
  useChatStore.getState().setHistory(message.conversationId, [message]);
}

async function openPanel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Message actions" }));
  return screen.getByRole("menu", { name: "Message actions" });
}

beforeEach(() => {
  useChatStore.getState().messages = {};
  vi.clearAllMocks();
});

describe("MessageActionsTrigger", () => {
  it("opens the panel with the reaction whitelist on trigger click", async () => {
    const user = userEvent.setup();
    seedMessage(makeMessage());
    render(
      <MessageActionsTrigger conversationId="c1" message={makeMessage()} isOutbound={false} />
    );

    const panel = await openPanel(user);

    expect(panel).toBeInTheDocument();
    for (const emoji of ["👍", "❤️", "😂", "😮", "😢", "🙏"]) {
      expect(screen.getByRole("menuitem", { name: `React with ${emoji}` })).toBeInTheDocument();
    }
  });

  it("closes the panel on Escape", async () => {
    const user = userEvent.setup();
    seedMessage(makeMessage());
    render(
      <MessageActionsTrigger conversationId="c1" message={makeMessage()} isOutbound={false} />
    );

    await openPanel(user);
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("shows Edit and Delete only for outbound settled messages (owner-only)", async () => {
    const user = userEvent.setup();
    seedMessage(makeMessage());
    render(
      <MessageActionsTrigger
        conversationId="c1"
        message={makeMessage()}
        isOutbound={true}
        onEdit={() => {}}
      />
    );

    await openPanel(user);
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("hides Edit/Delete for inbound messages", async () => {
    const user = userEvent.setup();
    seedMessage(makeMessage());
    render(
      <MessageActionsTrigger
        conversationId="c1"
        message={makeMessage()}
        isOutbound={false}
        onEdit={() => {}}
      />
    );

    await openPanel(user);
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("hides Edit/Delete on tombstones even for the owner", async () => {
    const user = userEvent.setup();
    seedMessage(makeMessage({ deletedAt: "2026-01-01T01:00:00Z" }));
    render(
      <MessageActionsTrigger
        conversationId="c1"
        message={makeMessage({ deletedAt: "2026-01-01T01:00:00Z" })}
        isOutbound={true}
        onEdit={() => {}}
      />
    );

    await openPanel(user);
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("reacting is optimistic then reconciled with server truth", async () => {
    const user = userEvent.setup();
    const message = makeMessage();
    seedMessage(message);
    mockedReact.mockResolvedValue({
      ok: true,
      messageId: "m1",
      reactions: [{ emoji: "👍", count: 1, reactedByMe: true }],
    });
    render(
      <MessageActionsTrigger conversationId="c1" message={message} isOutbound={false} />
    );

    await openPanel(user);
    await user.click(screen.getByRole("menuitem", { name: "React with 👍" }));

    expect(mockedReact).toHaveBeenCalledWith("c1", "m1", "👍");
    await waitFor(() => {
      const reactions = selectConversationMessages(useChatStore.getState(), "c1").committed[0]
        .reactions;
      expect(reactions).toEqual([{ emoji: "👍", count: 1, reactedByMe: true }]);
    });
  });

  it("rolls the optimistic flip back when the server rejects", async () => {
    const user = userEvent.setup();
    const message = makeMessage({
      reactions: [{ emoji: "🙏", count: 2, reactedByMe: false }],
    });
    seedMessage(message);
    mockedReact.mockResolvedValue({ ok: false, error: "boom" });
    render(
      <MessageActionsTrigger conversationId="c1" message={message} isOutbound={false} />
    );

    await openPanel(user);
    await user.click(screen.getByRole("menuitem", { name: "React with 🙏" }));

    await waitFor(() => {
      const reactions = selectConversationMessages(useChatStore.getState(), "c1").committed[0]
        .reactions;
      expect(reactions).toEqual([{ emoji: "🙏", count: 2, reactedByMe: false }]);
    });
  });

  it("delete calls the action and applies the tombstone", async () => {
    const user = userEvent.setup();
    const message = makeMessage();
    seedMessage(message);
    mockedDelete.mockResolvedValue({
      ok: true,
      message: makeMessage({ deletedAt: "2026-01-01T02:00:00Z" }),
    });
    render(
      <MessageActionsTrigger conversationId="c1" message={message} isOutbound={true} />
    );

    await openPanel(user);
    await user.click(screen.getByText("Delete"));

    expect(mockedDelete).toHaveBeenCalledWith("c1", "m1");
    await waitFor(() => {
      expect(
        selectConversationMessages(useChatStore.getState(), "c1").committed[0].deletedAt
      ).toBe("2026-01-01T02:00:00Z");
    });
  });
});
