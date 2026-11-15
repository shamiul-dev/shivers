// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { ChatBubble } from "@/components/ui/chat-bubble";
import type { Attachment } from "@/types/chat";

const imageAttachment: Attachment = {
  id: "a1",
  conversationId: "c1",
  uploaderId: "u1",
  storageKey: "k",
  thumbKey: "t",
  fileName: "sunset.webp",
  mime: "image/webp",
  sizeBytes: 2048,
  width: 800,
  height: 600,
  status: "ready",
  createdAt: "2026-01-01T00:00:00Z",
  url: "https://cdn/full.webp",
  thumbUrl: "https://cdn/thumb.webp",
};

const fileAttachment: Attachment = {
  ...imageAttachment,
  id: "a2",
  fileName: "notes.pdf",
  mime: "application/pdf",
  sizeBytes: 1_500_000,
  url: "https://cdn/notes.pdf",
  thumbUrl: null,
};

describe("ChatBubble", () => {
  it("renders children and text content", () => {
    render(<ChatBubble variant="inbound">Hello world</ChatBubble>);

    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("shows the time row when time is provided", () => {
    render(<ChatBubble time="14:05">hi</ChatBubble>);

    expect(screen.getByText("14:05")).toBeInTheDocument();
  });

  it("shows an edited tag when edited", () => {
    render(<ChatBubble time="14:05" edited>hi</ChatBubble>);

    expect(screen.getByText("edited")).toBeInTheDocument();
  });

  it("marks failed status with a Failed label", () => {
    render(<ChatBubble status="failed" time="14:05">hi</ChatBubble>);

    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("applies the variant class for pending bubbles", () => {
    const { container } = render(
      <ChatBubble variant="pending" status="pending">typing…</ChatBubble>
    );

    expect(container.firstElementChild?.className).toContain("animate-pulse");
  });

  it("renders an image attachment as a thumbnail", () => {
    render(
      <ChatBubble attachment={imageAttachment}>with photo</ChatBubble>
    );

    const img = screen.getByRole("img", { name: "sunset.webp" });
    expect(img).toHaveAttribute("src", "https://cdn/thumb.webp");
  });

  it("falls back to the full url when there is no thumb", () => {
    render(
      <ChatBubble attachment={{ ...imageAttachment, thumbUrl: null }}>
        with photo
      </ChatBubble>
    );

    expect(screen.getByRole("img", { name: "sunset.webp" })).toHaveAttribute(
      "src",
      "https://cdn/full.webp"
    );
  });

  it("clicking an image calls onImageClick with the full url", () => {
    const onImageClick = vi.fn();
    render(
      <ChatBubble attachment={imageAttachment} onImageClick={onImageClick}>
        with photo
      </ChatBubble>
    );

    fireEvent.click(screen.getByAltText("sunset.webp").parentElement!);

    expect(onImageClick).toHaveBeenCalledWith("https://cdn/full.webp", "sunset.webp");
  });

  it("renders non-image attachments as a download link with a human size", () => {
    render(<ChatBubble attachment={fileAttachment}>with file</ChatBubble>);

    const link = screen.getByRole("link", { name: /notes\.pdf/ });
    expect(link).toHaveAttribute("href", "https://cdn/notes.pdf");
    expect(link).toHaveAttribute("download", "notes.pdf");
    expect(screen.getByText("1.4 MB")).toBeInTheDocument();
  });
});
