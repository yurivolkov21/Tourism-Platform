/**
 * Conversation access rule (pure — TDD'd).
 * Guest conversation (no userId): knowledge of the uuid grants access
 * (capstone-accepted risk, spec Risk 5). Once a conversation is bound to a
 * user, only that user's verified JWT may read/continue it.
 */
export function canAccessConversation(
  conversation: { userId: string | null },
  user: { id: string } | null,
): boolean {
  if (conversation.userId === null) return true;
  return user !== null && user.id === conversation.userId;
}
