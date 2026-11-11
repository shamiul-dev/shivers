"use client";

import * as React from "react";
import { Check, Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

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
 * Interaction model: click/touch-first — an always-visible "⋯" trigger next to
 * each settled bubble opens the shared action panel. A right-click context
 * menu reuses the same panel for desktop convenience. No hover dependency.
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

/** Shared trigger + context-menu behavior. */
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

/**
 * Close an open surface on outside pointerdown or Escape.
 *
 * `guardRef` is the element (and its DOM subtree) inside which pointerdowns do
 * NOT dismiss — pass the wrapper containing both trigger and panel so toggling
 * the trigger doesn't instantly reopen, or the panel alone to close on any
 * other interaction (context-menu behavior).
 */
function useDismissOnOutside(
  open: boolean,
  guardRef: React.RefObject<HTMLElement | null>,
  onClose: () => void
) {
  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (guardRef.current && guardRef.current.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, guardRef, onClose]);
}

const panelItemClass =
  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] text-foreground transition-colors hover:bg-surface-shade select-none text-left";

interface MessageActionsPanelProps {
  react: (emoji: ReactionEmoji) => void;
  copy: () => void;
  copied: boolean;
  remove: () => void;
  canModify: boolean;
  onEdit?: () => void;
  onClose: () => void;
}

/** Shared panel content: fixed reaction row + copy + owner edit/delete. */
function MessageActionsPanel({
  react,
  copy,
  copied,
  remove,
  canModify,
  onEdit,
  onClose,
}: MessageActionsPanelProps) {
  return (
    <div
      role="menu"
      aria-label="Message actions"
      className="min-w-44 rounded-md border border-line bg-surface p-1 shadow-md"
    >
      <div className="mb-1 flex items-center gap-0.5 border-b border-line px-1 pb-1.5">
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            role="menuitem"
            aria-label={`React with ${emoji}`}
            className="flex h-7 w-7 items-center justify-center rounded-full text-base transition-transform hover:scale-110 select-none"
            onClick={() => {
              react(emoji);
              onClose();
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
      <button
        type="button"
        role="menuitem"
        className={panelItemClass}
        onClick={() => {
          copy();
          onClose();
        }}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy"}
      </button>
      {canModify && onEdit && (
        <button
          type="button"
          role="menuitem"
          className={panelItemClass}
          onClick={() => {
            onClose();
            onEdit();
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
          className={cn(panelItemClass, "text-destructive")}
          onClick={() => {
            onClose();
            remove();
          }}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      )}
    </div>
  );
}

/**
 * Always-visible "⋯" trigger beside the bubble; click/tap opens the panel
 * above it, aligned to the bubble's side.
 */
export function MessageActionsTrigger(props: MessageActionHandlersProps) {
  const { isOutbound } = props;
  const { react, copy, copied, remove, canModify } = useMessageActions(props);
  const [open, setOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const close = React.useCallback(() => setOpen(false), []);
  useDismissOnOutside(open, wrapperRef, close);

  return (
    <div ref={wrapperRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="Message actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-6 w-6 items-center justify-center rounded-full text-muted-subtle transition-colors hover:bg-surface-shade hover:text-foreground select-none"
        onClick={() => setOpen((o) => !o)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div
          className={cn("absolute bottom-full z-40 mb-1", isOutbound ? "right-0" : "left-0")}
        >
          <MessageActionsPanel
            react={react}
            copy={copy}
            copied={copied}
            remove={remove}
            canModify={canModify}
            onEdit={props.onEdit}
            onClose={close}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Right-click context menu around the bubble. Hand-rolled (instead of Radix
 * DropdownMenu) because a menu trigger would open on left-click too, stealing
 * clicks from images and links. Anchors at the cursor; closes on click-away,
 * Escape, or selection.
 */
export function MessageContextMenu(
  props: MessageActionHandlersProps & { children: React.ReactNode }
) {
  const { children } = props;
  const { react, copy, copied, remove, canModify } = useMessageActions(props);
  const [anchor, setAnchor] = React.useState<{ x: number; y: number } | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const close = React.useCallback(() => setAnchor(null), []);
  useDismissOnOutside(anchor !== null, panelRef, close);

  const openMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    setAnchor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div ref={wrapperRef} className="relative w-fit max-w-full" onContextMenu={openMenu}>
      {children}

      {anchor && (
        <div
          ref={panelRef}
          className="absolute z-40"
          style={{ left: anchor.x, top: anchor.y }}
        >
          <MessageActionsPanel
            react={react}
            copy={copy}
            copied={copied}
            remove={remove}
            canModify={canModify}
            onEdit={props.onEdit}
            onClose={close}
          />
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
