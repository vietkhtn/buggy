"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AdminLayout } from "./layout-client";

type User = {
  id: string;
  name: string | null;
  email: string;
  isWorkspaceAdmin: boolean;
  createdAt: Date;
  _count: { projects: number };
};

function initials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function AdminUsersClient({
  initialUsers,
  currentUserId,
}: {
  initialUsers: User[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [removeTarget, setRemoveTarget] = useState<User | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const adminCount = users.filter((u) => u.isWorkspaceAdmin).length;

  async function handlePromote(user: User) {
    const newValue = !user.isWorkspaceAdmin;
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, isWorkspaceAdmin: newValue } : u))
    );

    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isWorkspaceAdmin: newValue }),
    });

    if (!res.ok) {
      // Snap back
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isWorkspaceAdmin: user.isWorkspaceAdmin } : u))
      );
      const data = (await res.json()) as { error?: string };
      toast.error(data.error ?? "Failed to update role.");
      return;
    }

    const action = newValue ? "promoted" : "demoted";
    toast.success(
      `${user.name ?? user.email} ${action}. Changes take effect when they next sign in.`
    );
  }

  async function handleRemoveConfirm() {
    if (!removeTarget) return;
    setRemoving(true);
    setRemoveError(null);

    const res = await fetch(`/api/admin/users/${removeTarget.id}`, { method: "DELETE" });

    setRemoving(false);

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setRemoveError(data.error ?? "Failed to remove user.");
      return;
    }

    setUsers((prev) => prev.filter((u) => u.id !== removeTarget.id));
    toast.success(`${removeTarget.name ?? removeTarget.email} has been removed.`);
    setRemoveTarget(null);
  }

  return (
    <AdminLayout activeTab="users">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Users</h2>
          <p className="text-sm text-muted-foreground">{users.length} workspace member{users.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">Projects</th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
                <th scope="col" className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === currentUserId;
                const isLastAdmin = user.isWorkspaceAdmin && adminCount <= 1;
                return (
                  <tr key={user.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                          {initials(user.name, user.email)}
                        </div>
                        <div>
                          <div className="font-medium">{user.name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.isWorkspaceAdmin ? "default" : "outline"}>
                        {user.isWorkspaceAdmin ? "Workspace Admin" : "Member"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user._count.projects}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {!isSelf && (
                          <button
                            onClick={() => handlePromote(user)}
                            disabled={isLastAdmin && user.isWorkspaceAdmin}
                            className="text-sm text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`${user.isWorkspaceAdmin ? "Demote" : "Promote"} ${user.name ?? user.email}`}
                          >
                            {user.isWorkspaceAdmin ? "Demote" : "Promote"}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setRemoveError(null);
                            setRemoveTarget(user);
                          }}
                          disabled={isSelf || isLastAdmin}
                          title={isLastAdmin ? "Cannot remove the only workspace admin" : undefined}
                          className="text-sm text-destructive hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Remove ${user.name ?? user.email}`}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Remove confirmation dialog */}
      <Dialog open={removeTarget !== null} onOpenChange={(open) => { if (!open) setRemoveTarget(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Remove user</DialogTitle>
            <DialogDescription>
              <strong>{removeTarget?.name ?? removeTarget?.email}</strong> will be removed
              from this workspace. Their test run history will be retained. This cannot be
              undone.
              <br />
              <span className="mt-1 block text-xs">
                Changes take effect when they next sign in.
              </span>
            </DialogDescription>
          </DialogHeader>
          {removeError && (
            <p className="text-sm text-destructive">{removeError}</p>
          )}
          <DialogFooter>
            <button
              onClick={() => setRemoveTarget(null)}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleRemoveConfirm}
              disabled={removing}
              className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {removing ? "Removing…" : "Remove"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
