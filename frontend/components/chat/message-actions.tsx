"use client";

import * as React from "react";
import { Check, Copy, Pencil, SmilePlus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  editMessageAction,
  deleteMessageAction,
  reactMessageAction,
  unreactMessageAction,
} from "@/app/actions/chat";
import { selectConversationMessages, useChatStore } from "@/store/chatStore";
import { REACTION_EMOJIS, type Message, type ReactionEmoji } from "@/types/chat";

/**
 * Message-level actions: fixed emoji reactions (toggle), copy, edit, delete.
 *
 * Scope rules (enforced by callers, mirrored here):
 * - Only rendered on settled (non-pending, non-failed) bubbles.
 * - Edit/delete are owner-only (isOutbound) and hidden on tombstones.
 * - Reactions use the fixed whitelist mirrored from backend reaction.service.ts.
 *
 * Styling contract: token utilities only — no literal colors, no theme branching.
 */

/** Optimistic toggle + rollback + server-truth reconcile for one message. */
function useReactionToggle(conversationId: string, messageId: string) {
  return React.useCallback(
    (emoji: ReactionEmoji) => {
      const store = useChatStore.getState();
      const prevReactions =
        selectConversationMessages(store, conversationId).committed.find(
          (m) => m.id === messageId
        )?.reactions ?? [];
      const wasMine = prevReactions.some((r) => r.emoji === emoji && r.reactedByMe);

      store.applyReactionDelta(conversationId, messageId, emoji);

      void (wasMine
        ? unreactMessageAction(conversationId, messageId, emoji)
        : reactMessageAction(conversationId, messageId, emoji)
      ).then((res) => {
        if (res.ok) {
          // Server-computed truth (authoritative counts + ordering)
          useChatStore
            .getState()
            .setReactions(conversationId, res.messageId, res.reactions ?? []);
        } else {
          // Roll back the optimistic flip
          useChatStore
            .getState()
            .setReactions(conversationId, messageId, prevReactions);
        }
      });
    },
    [conversationId, messageId]
  );
}

interface MessageActionHandlersProps {
  conversationId: string;
  message: Message;
  isOutbound: boolean;
  /** Opens the parent's inline edit mode (required for the edit affordance). */
  onEdit?: () => void;
}

/** Shared bar + context-menu behavior. */
function useMessageActions(props: MessageActionHandlersProps) {
  const { conversationId, message, isOutbound } = props;
  const react = useReactionToggle(conversationId, message.id);
  const [copied, setCopied] = React.useState(false);
  const copiedTimerRef = React.useRef<number | undefined>(undefined);

  const copy = React.useCallback(() => {
    const body =
      selectConversationMessages(useChatStore.getState(), conversationId).committed.find(
        (m) => m.id === message.id
      )?.body ?? "";
    void navigator.clipboard
      ?.writeText(body)
      .then(() => {
        setCopied(true);
        window.clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }, [conversationId, message.id]);

  const remove = React.useCallback(() => {
    void deleteMessageAction(conversationId, message.id).then((res) => {
      if (res.ok) {
        // Socket echo confirms too; apply immediately for the sender's own view
        useChatStore.getState().applyMessageUpdate(conversationId, res.message);
      }
    });
  }, [conversationId, message.id]);

  return {
    react,
    copy,
    copied,
    remove,
    canModify: isOutbound && !message.deletedAt,
  };
}

const barButtonClass =
  "flex h-7 w-7 items-center justify-center rounded-full text-muted-strong transition-colors hover:bg-surface-shade hover:text-foreground select-none";

/** Floating hover bar: reactions, copy, owner-only edit + delete. */
export function MessageActionsBar(
  props: MessageActionHandlersProps & { className?: string }
) {
  const { className } = props;
  const { react, copy, copied, remove, canModify } = useMessageActions(props);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  // Click-away + Escape close the emoji picker
  React.useEffect(() => {
    if (!pickerOpen) return;
    const close = () => setPickerOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  return (
    <div
      className={cn(
        "z-20 flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5 shadow-sm",
        className
      )}
      role="toolbar"
      aria-label="Message actions"
    >
      <button
        type="button"
        aria-label="Add reaction"
        aria-expanded={pickerOpen}
        className={cn(barButtonClass, pickerOpen && "bg-surface-shade text-foreground")}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setPickerOpen((open) => !open)}
      >
        <SmilePlus className="h-4 w-4" />
      </button>

      <button
        type="button"
        aria-label={copied ? "Copied" : "Copy message"}
        className={barButtonClass}
        onClick={copy}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>

      {canModify && props.onEdit && (
        <button
          type="button"
          aria-label="Edit message"
          className={barButtonClass}
          onClick={props.onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}

      {canModify && (
        <button
          type="button"
          aria-label="Delete message"
          className={cn(barButtonClass, "hover:text-destructive")}
          onClick={remove}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      {pickerOpen && (
        <div className="absolute bottom-full left-1/2 z-30 mb-1.5 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-line bg-surface p-1 shadow-md">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={`React with ${emoji}`}
              className="flex h-7 w-7 items-center justify-center rounded-full text-base transition-transform hover:scale-110 select-none"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                react(emoji);
                setPickerOpen(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Right-click context menu around the bubble.
 *
 * Hand-rolled (instead of Radix DropdownMenu) because a menu trigger would
 * open on left-click too, stealing clicks from images and links. Anchors at
 * the cursor; closes on click-away, Escape, or selection.
 */
export function MessageContextMenu(
  props: MessageActionHandlersProps & { children: React.ReactNode }
) {
  const { children } = props;
  const { react, copy, copied, remove, canModify } = useMessageActions(props);
  const [anchor, setAnchor] = React.useState<{ x: number; y: number } | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!anchor) return;
    const close = () => setAnchor(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchor]);

  const openMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    setAnchor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const itemClass =
    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] text-foreground transition-colors hover:bg-surface-shade select-none text-left";

  return (
    <div
      ref={wrapperRef}
      className="relative w-fit max-w-full"
      onContextMenu={openMenu}
    >
      {children}

      {anchor && (
        <div
          role="menu"
          aria-label="Message actions"
          className="absolute z-40 min-w-40 rounded-md border border-line bg-surface p-1 shadow-md"
          style={{ left: anchor.x, top: anchor.y }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="mb-1 flex items-center gap-0.5 rounded-sm border-b border-line px-1 pb-1.5">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                role="menuitem"
                aria-label={`React with ${emoji}`}
                className="flex h-7 w-7 items-center justify-center rounded-full text-base transition-transform hover:scale-110 select-none"
                onClick={() => {
                  react(emoji);
                  setAnchor(null);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
          <button type="button" role="menuitem" className={itemClass} onClick={() => { copy(); setAnchor(null); }}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
          {canModify && props.onEdit && (
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => {
                setAnchor(null);
                props.onEdit?.();
              }}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          )}
          {canModify && (
            <button
              type="button"
              role="menuitem"
              className={cn(itemClass, "text-destructive")}
              onClick={() => {
                setAnchor(null);
                remove();
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Reaction chip row under the bubble (server-sorted count-desc, ≤ whitelist size). */
export function MessageReactionChips({
  conversationId,
  message,
  className,
}: {
  conversationId: string;
  message: Message;
  className?: string;
}) {
  // Subscribe to this message's reactions so chips track optimistic + socket updates
  const reactions = useChatStore(
    (state) =>
      selectConversationMessages(state, conversationId).committed.find(
        (m) => m.id === message.id
      )?.reactions
  );
  const react = useReactionToggle(conversationId, message.id);

  if (!reactions || reactions.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          aria-label={`${r.count} ${r.emoji} reaction${r.count === 1 ? "" : "s"}${r.reactedByMe ? ", including you" : ""}`}
          className={cn(
            "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors select-none",
            r.reactedByMe
              ? "border-primary bg-primary/10 text-primary"
              : "border-line bg-surface text-muted-strong hover:bg-surface-shade"
          )}
          onClick={() => react(r.emoji)}
        >
          <span className="text-xs leading-none">{r.emoji}</span>
          <span>{r.count}</span>
        </button>
      ))}
    </div>
  );
}
