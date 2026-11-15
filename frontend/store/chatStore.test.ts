import { beforeEach, describe, expect, it } from "vitest";

import type { Message, ReactionAggregate } from "@/types/chat";
import { selectConversationMessages, useChatStore } from "@/store/chatStore";

function msg(
  id: string,
  createdAt: string,
  overrides: Partial<Message> = {}
): Message {
  return {
    id,
    conversationId: "c1",
    senderId: "u1",
    type: "text",
    body: `body-${id}`,
    clientId: `client-${id}`,
    createdAt,
    editedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

function committedOf(conversationId = "c1"): Message[] {
  return selectConversationMessages(useChatStore.getState(), conversationId)
    .committed;
}

function pendingOf(conversationId = "c1") {
  return selectConversationMessages(useChatStore.getState(), conversationId)
    .pending;
}

beforeEach(() => {
  useChatStore.getState().messages = {};
});

describe("setHistory", () => {
  it("stores messages sorted by createdAt", () => {
    useChatStore.getState().setHistory("c1", [
      msg("m3", "2026-01-01T00:00:03Z"),
      msg("m1", "2026-01-01T00:00:01Z"),
      msg("m2", "2026-01-01T00:00:02Z"),
    ]);

    expect(committedOf().map((m) => m.id)).toEqual(["m1", "m2", "m3"]);
  });

  it("breaks createdAt ties by id", () => {
    useChatStore.getState().setHistory("c1", [
      msg("m2", "2026-01-01T00:00:00Z"),
      msg("m1", "2026-01-01T00:00:00Z"),
    ]);

    expect(committedOf().map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("does not clobber pending messages when seeding history", () => {
    useChatStore.getState().addPending("c1", "client-1", "hello");

    useChatStore.getState().setHistory("c1", [msg("m1", "2026-01-01T00:00:00Z")]);

    expect(committedOf()).toHaveLength(1);
    expect(pendingOf()).toHaveLength(1);
  });
});

describe("addCommitted", () => {
  it("appends and keeps sort order", () => {
    useChatStore.getState().setHistory("c1", [msg("m1", "2026-01-01T00:00:01Z")]);

    useChatStore
      .getState()
      .addCommitted("c1", msg("m2", "2026-01-01T00:00:02Z"));
    // Late-arriving out-of-order message (e.g. edit payload echo)
    useChatStore
      .getState()
      .addCommitted("c1", msg("m0", "2026-01-01T00:00:00Z"));

    expect(committedOf().map((m) => m.id)).toEqual(["m0", "m1", "m2"]);
  });

  it("dedupes a message that already exists (multi-tab echo)", () => {
    useChatStore
      .getState()
      .addCommitted("c1", msg("m1", "2026-01-01T00:00:00Z"));
    useChatStore
      .getState()
      .addCommitted("c1", msg("m1", "2026-01-01T00:00:00Z"));

    expect(committedOf()).toHaveLength(1);
  });
});

describe("resolvePending", () => {
  it("removes the pending entry and commits the server message", () => {
    useChatStore
      .getState()
      .addCommitted("c1", msg("m1", "2026-01-01T00:00:00Z"));
    useChatStore.getState().addPending("c1", "client-9", "draft");

    useChatStore
      .getState()
      .resolvePending(
        "c1",
        "client-9",
        msg("m2", "2026-01-01T00:00:01Z", { clientId: "client-9" })
      );

    expect(pendingOf()).toHaveLength(0);
    expect(committedOf().map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("drops the pending entry without committing when the server returns null (rejected)", () => {
    useChatStore.getState().addPending("c1", "client-9", "draft");

    useChatStore.getState().resolvePending("c1", "client-9", null);

    expect(pendingOf()).toHaveLength(0);
    expect(committedOf()).toHaveLength(0);
  });

  it("ignores a duplicate resolve (already committed by the socket path)", () => {
    useChatStore
      .getState()
      .addCommitted("c1", msg("m1", "2026-01-01T00:00:00Z"));
    useChatStore.getState().addPending("c1", "client-9", "draft");

    useChatStore
      .getState()
      .resolvePending(
        "c1",
        "client-9",
        msg("m1", "2026-01-01T00:00:00Z", { clientId: "client-9" })
      );

    expect(committedOf()).toHaveLength(1);
    expect(pendingOf()).toHaveLength(0);
  });
});

describe("markPendingFailed", () => {
  it("flags only the matching pending message", () => {
    useChatStore.getState().addPending("c1", "client-1", "first");
    useChatStore.getState().addPending("c1", "client-2", "second");

    useChatStore.getState().markPendingFailed("c1", "client-1");

    expect(pendingOf()).toEqual([
      { clientId: "client-1", body: "first", type: "text", failed: true, attachment: undefined },
      { clientId: "client-2", body: "second", type: "text", attachment: undefined },
    ]);
  });
});

describe("applyMessageUpdate", () => {
  it("replaces the message in place, keeping sort order", () => {
    useChatStore.getState().setHistory("c1", [
      msg("m1", "2026-01-01T00:00:00Z"),
      msg("m2", "2026-01-01T00:00:01Z"),
    ]);

    useChatStore
      .getState()
      .applyMessageUpdate(
        "c1",
        msg("m2", "2026-01-01T00:00:01Z", { body: "edited body" })
      );

    expect(committedOf().map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(committedOf()[1].body).toBe("edited body");
  });

  it("ignores updates for unknown ids (raced ahead of history seed)", () => {
    useChatStore.getState().setHistory("c1", [msg("m1", "2026-01-01T00:00:00Z")]);

    useChatStore
      .getState()
      .applyMessageUpdate(
        "c1",
        msg("m99", "2026-01-01T00:00:05Z", { body: "ghost" })
      );

    expect(committedOf()).toHaveLength(1);
  });
});

describe("reactions", () => {
  const reactions: ReactionAggregate[] = [
    { emoji: "👍", count: 3, reactedByMe: false },
    { emoji: "❤️", count: 1, reactedByMe: false },
  ];

  it("setReactions overwrites server-computed truth", () => {
    useChatStore.getState().setHistory("c1", [msg("m1", "2026-01-01T00:00:00Z")]);

    useChatStore.getState().setReactions("c1", "m1", reactions);

    expect(committedOf()[0].reactions).toEqual(reactions);
  });

  it("applyReactionDelta joins: bumps count and flips reactedByMe, ordered by count desc", () => {
    useChatStore.getState().setHistory("c1", [msg("m1", "2026-01-01T00:00:00Z")]);
    useChatStore.getState().setReactions("c1", "m1", reactions);

    useChatStore.getState().applyReactionDelta("c1", "m1", "❤️");

    expect(committedOf()[0].reactions).toEqual([
      { emoji: "👍", count: 3, reactedByMe: false },
      { emoji: "❤️", count: 2, reactedByMe: true },
    ]);
  });

  it("applyReactionDelta creates the aggregate when no one has reacted yet", () => {
    useChatStore.getState().setHistory("c1", [msg("m1", "2026-01-01T00:00:00Z")]);

    useChatStore.getState().applyReactionDelta("c1", "m1", "❤️");

    expect(committedOf()[0].reactions).toEqual([
      { emoji: "❤️", count: 1, reactedByMe: true },
    ]);
  });

  it("applyReactionDelta leaves: decrements and drops empty aggregates", () => {
    useChatStore.getState().setHistory("c1", [msg("m1", "2026-01-01T00:00:00Z")]);
    useChatStore
      .getState()
      .setReactions("c1", "m1", [{ emoji: "👍", count: 1, reactedByMe: true }]);

    useChatStore.getState().applyReactionDelta("c1", "m1", "👍");

    expect(committedOf()[0].reactions).toEqual([]);
  });

  it("applyReactionDelta decrements without dropping when others remain", () => {
    useChatStore.getState().setHistory("c1", [msg("m1", "2026-01-01T00:00:00Z")]);
    useChatStore
      .getState()
      .setReactions("c1", "m1", [{ emoji: "👍", count: 3, reactedByMe: true }]);

    useChatStore.getState().applyReactionDelta("c1", "m1", "👍");

    expect(committedOf()[0].reactions).toEqual([
      { emoji: "👍", count: 2, reactedByMe: false },
    ]);
  });

  it("applyReactionDelta re-sorts by count desc after bumping", () => {
    useChatStore.getState().setHistory("c1", [msg("m1", "2026-01-01T00:00:00Z")]);
    // 👍 arrives with count 1 but is listed first; ❤️ has 3
    useChatStore
      .getState()
      .setReactions("c1", "m1", [
        { emoji: "👍", count: 1, reactedByMe: false },
        { emoji: "❤️", count: 3, reactedByMe: false },
      ]);

    useChatStore.getState().applyReactionDelta("c1", "m1", "👍");

    // 👍 now has 2 (mine) — ❤️ with 3 must lead the list
    expect(committedOf()[0].reactions).toEqual([
      { emoji: "❤️", count: 3, reactedByMe: false },
      { emoji: "👍", count: 2, reactedByMe: true },
    ]);
  });
});

describe("clear", () => {
  it("removes only the target conversation", () => {
    useChatStore.getState().setHistory("c1", [msg("m1", "2026-01-01T00:00:00Z")]);
    useChatStore
      .getState()
      .setHistory("c2", [msg("m2", "2026-01-01T00:00:00Z")]);

    useChatStore.getState().clear("c1");

    expect(selectConversationMessages(useChatStore.getState(), "c1").committed).toHaveLength(0);
    expect(committedOf("c2")).toHaveLength(1);
  });
});

describe("selectConversationMessages", () => {
  it("returns empty entry for unknown conversations", () => {
    const entry = selectConversationMessages(useChatStore.getState(), "nope");
    expect(entry).toEqual({ committed: [], pending: [] });
  });
});

