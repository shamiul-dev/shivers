import { describe, expect, it } from "vitest";

import { cn, getInitials } from "@/lib/utils";

describe("cn", () => {
  it("joins conditional classes", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });

  it("merges conflicting tailwind classes, last one wins", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("dedupes classes", () => {
    expect(cn("rounded-2xl", "rounded-2xl")).toBe("rounded-2xl");
  });
});

describe("getInitials", () => {
  it("takes the first letter of the first and last words", () => {
    expect(getInitials("Kim Kitsuragi")).toBe("KK");
  });

  it("uppercases output", () => {
    expect(getInitials("harry du bois")).toBe("HB");
  });

  it("uses two letters for single names", () => {
    expect(getInitials("Harry")).toBe("HA");
  });

  it("strips non-alphanumerics from handles", () => {
    expect(getInitials("kim_k")).toBe("KI");
  });

  it("falls back for empty/whitespace names", () => {
    expect(getInitials("")).toBe("U");
    expect(getInitials("   ")).toBe("U");
  });

  it("falls back for nullish names", () => {
    expect(getInitials(null)).toBe("U");
    expect(getInitials(undefined)).toBe("U");
  });

  it("honours a custom fallback (uppercased whole)", () => {
    expect(getInitials("", "anon")).toBe("ANON");
    expect(getInitials(null, "anon")).toBe("ANON");
  });

  it("uses the first character when only one symbol survives cleaning", () => {
    expect(getInitials("§")).toBe("U");
    expect(getInitials("#a", "x")).toBe("A");
  });
});
