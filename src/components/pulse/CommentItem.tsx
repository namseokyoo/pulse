"use client";

import { useState } from "react";
import { formatRelativeTime } from "@/lib/utils/format";
import type { CommentType } from "@/types";

export interface CommentItemProps {
  comment: CommentType;
  isLast?: boolean;
  userId?: string;
  onEdit?: (commentId: string, newContent: string) => Promise<void>;
  onDelete?: (commentId: string) => Promise<void>;
}

export function CommentItem({ comment, isLast = false, userId, onEdit, onDelete }: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = userId && comment.authorId === userId && !comment.isDeleted;

  const handleSaveEdit = async () => {
    if (!onEdit || !editContent.trim() || editContent === comment.content) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    await onEdit(comment.id, editContent.trim());
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    await onDelete(comment.id);
    setIsDeleting(false);
    setShowDeleteConfirm(false);
  };

  return (
    <div className={`py-3 ${!isLast ? "border-b border-[var(--color-border)]" : ""}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
            {comment.nickname}
          </span>
          <span className="text-[13px] text-[var(--color-text-muted)]">
            {formatRelativeTime(comment.createdAt)}
          </span>
          {comment.editedAt && !comment.isDeleted && (
            <span className="text-[13px] text-[var(--color-text-muted)]">(수정됨)</span>
          )}
        </div>
        {isOwner && !isEditing && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
            >
              수정
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-[12px] text-[var(--color-danger)] hover:opacity-80 transition-opacity"
            >
              삭제
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            maxLength={300}
            rows={2}
            className="w-full p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              disabled={isSaving || !editContent.trim()}
              className="px-3 py-1 rounded-lg bg-[var(--color-primary)] text-white text-[12px] font-semibold disabled:opacity-50"
            >
              {isSaving ? "저장 중..." : "저장"}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="px-3 py-1 rounded-lg border border-[var(--color-border)] text-[12px] text-[var(--color-text-secondary)]"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <p className={`text-[15px] leading-6 ${comment.isDeleted ? "text-[var(--color-text-muted)] italic" : "text-[var(--color-text-secondary)]"}`}>
          {comment.content}
        </p>
      )}

      {showDeleteConfirm && (
        <div className="mt-2 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
          <p className="text-[13px] text-[var(--color-text-secondary)] mb-2">정말 삭제하시겠습니까?</p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-1 rounded-lg bg-[var(--color-danger)] text-white text-[12px] font-semibold disabled:opacity-50"
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="px-3 py-1 rounded-lg border border-[var(--color-border)] text-[12px] text-[var(--color-text-secondary)]"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
