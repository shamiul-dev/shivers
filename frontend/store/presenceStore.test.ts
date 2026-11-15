import { beforeEach, describe, expect, it } from "vitest";

import { usePresenceStore } from "@/store/presenceStore";

beforeEach(() => {
  usePresenceStore.setState({ onlineUserIds: {} });
});

describe("setUsersOnline", () => {
  it("marks each given user online", () => {
    usePresenceStore.getState().setUsersOnline(["u1", "u2"]);

    const { onlineUserIds } = usePresenceStore.getState();
    expect(onlineUserIds).toEqual({ u1: true, u2: true });
  });

  it("keeps previously known users", () => {
    usePresenceStore.getState().setUserStatus("u0", "online");
    usePresenceStore.getState().setUsersOnline(["u1"]);

    expect(usePresenceStore.getState().isUserOnline("u0")).toBe(true);
  });
});

describe("setUserStatus", () => {
  it("records online", () => {
    usePresenceStore.getState().setUserStatus("u1", "online");

    expect(usePresenceStore.getState().isUserOnline("u1")).toBe(true);
  });

  it("records offline explicitly", () => {
    usePresenceStore.getState().setUsersOnline(["u1"]);
    usePresenceStore.getState().setUserStatus("u1", "offline");

    expect(usePresenceStore.getState().isUserOnline("u1")).toBe(false);
  });
});

describe("isUserOnline", () => {
  it("is false for missing users", () => {
    expect(usePresenceStore.getState().isUserOnline("ghost")).toBe(false);
  });

  it("is false for nullish ids without throwing", () => {
    expect(usePresenceStore.getState().isUserOnline(null)).toBe(false);
    expect(usePresenceStore.getState().isUserOnline(undefined)).toBe(false);
  });
});
