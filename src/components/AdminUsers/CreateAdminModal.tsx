"use client";

import { useState } from "react";
import { createAdminUserAction } from "@/app/admin/users/actions";
import { AdminRole } from "@/types";
import styles from "./AdminUsers.module.css";

interface CreateAdminModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateAdminModal({ onClose, onSuccess }: CreateAdminModalProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>(AdminRole.MODERATOR);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await createAdminUserAction({
      email,
      displayName,
      password,
      role,
    });

    setLoading(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.error || "Failed to create administrator.");
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Provision New Administrator</h2>
          <button type="button" className="btn btn--ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {error && <div className="form-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="admin-email" className="label">
                Email Address
              </label>
              <input
                id="admin-email"
                type="email"
                required
                className="input"
                placeholder="moderator@vit.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="admin-name" className="label">
                Display Name
              </label>
              <input
                id="admin-name"
                type="text"
                required
                className="input"
                placeholder="e.g. John Doe (Fine Arts Club)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="admin-pass" className="label">
                Initial Password (Min 8 Characters)
              </label>
              <input
                id="admin-pass"
                type="password"
                required
                minLength={8}
                className="input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="admin-role" className="label">
                Assigned Role
              </label>
              <select
                id="admin-role"
                className="input"
                value={role}
                onChange={(e) => setRole(e.target.value as AdminRole)}
              >
                <option value={AdminRole.MODERATOR}>Moderator (Review & Approve/Reject)</option>
                <option value={AdminRole.ADMIN}>Administrator (Photos, Metrics & Operations)</option>
                <option value={AdminRole.SUPER_ADMIN}>Super Administrator (Full System Control)</option>
              </select>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? "Creating Account..." : "Create Administrator"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
