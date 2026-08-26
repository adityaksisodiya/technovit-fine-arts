"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminUser } from "@/types";
import { AdminRole } from "@/types";
import { updateAdminRoleAction, toggleAdminActiveAction } from "@/app/admin/users/actions";
import { CreateAdminModal } from "./CreateAdminModal";
import styles from "./AdminUsers.module.css";

interface AdminUsersTableProps {
  users: AdminUser[];
  currentAdminId: string;
}

export function AdminUsersTable({ users, currentAdminId }: AdminUsersTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: AdminRole) => {
    setActionError(null);
    const res = await updateAdminRoleAction(userId, newRole);
    if (res.success) {
      startTransition(() => router.refresh());
    } else {
      setActionError(res.error || "Failed to update role");
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    setActionError(null);
    const res = await toggleAdminActiveAction(userId, !currentStatus);
    if (res.success) {
      startTransition(() => router.refresh());
    } else {
      setActionError(res.error || "Failed to update status");
    }
  };

  const getRoleBadge = (role: AdminRole) => {
    let roleClass = styles.roleModerator;
    if (role === AdminRole.SUPER_ADMIN) roleClass = styles.roleSuperAdmin;
    if (role === AdminRole.ADMIN) roleClass = styles.roleAdmin;

    return (
      <span className={`badge ${roleClass}`}>
        {role.toUpperCase()}
      </span>
    );
  };

  return (
    <div className={styles.container}>
      {actionError && <div className="form-error">{actionError}</div>}

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div>
          <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--weight-bold)" }}>
            Registered Administrators ({users.length})
          </h2>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)" }}>
            SUPER_ADMIN permissions: create accounts, change roles, and suspend access.
          </p>
        </div>

        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setShowCreateModal(true)}
        >
          + Add New Administrator
        </button>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Administrator</th>
              <th className={styles.th}>Email</th>
              <th className={styles.th}>Current Role</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Created At</th>
              <th className={styles.th}>Modify Role</th>
              <th className={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = u.id === currentAdminId;

              return (
                <tr key={u.id}>
                  <td className={styles.td}>
                    <strong>{u.display_name || "—"}</strong>
                    {isSelf && <span style={{ marginLeft: "6px", fontSize: "11px", color: "var(--color-accent-primary)" }}>(You)</span>}
                  </td>
                  <td className={styles.td} style={{ fontFamily: "monospace" }}>{u.email}</td>
                  <td className={styles.td}>{getRoleBadge(u.role)}</td>
                  <td className={styles.td}>
                    <span style={{ color: u.is_active ? "var(--color-success)" : "var(--color-error)", fontWeight: "var(--weight-bold)" }}>
                      {u.is_active ? "● Active" : "● Suspended"}
                    </span>
                  </td>
                  <td className={styles.td}>
                    {new Date(u.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className={styles.td}>
                    <select
                      className="input"
                      style={{ fontSize: "11px", padding: "2px 6px" }}
                      value={u.role}
                      disabled={isPending}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as AdminRole)}
                    >
                      <option value={AdminRole.MODERATOR}>Moderator</option>
                      <option value={AdminRole.ADMIN}>Administrator</option>
                      <option value={AdminRole.SUPER_ADMIN}>Super Admin</option>
                    </select>
                  </td>
                  <td className={styles.td}>
                    <button
                      type="button"
                      className="btn btn--secondary"
                      style={{
                        fontSize: "11px",
                        padding: "4px 8px",
                        color: u.is_active ? "var(--color-error)" : "var(--color-success)",
                      }}
                      disabled={isSelf || isPending}
                      onClick={() => handleToggleActive(u.id, u.is_active)}
                    >
                      {u.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <CreateAdminModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            startTransition(() => router.refresh());
          }}
        />
      )}
    </div>
  );
}
