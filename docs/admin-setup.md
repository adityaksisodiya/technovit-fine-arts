# First Administrator Provisioning Guide

This guide outlines the standard, secure procedure for provisioning the initial **SUPER_ADMIN** account for the **TechnoVIT Fine Arts Club Photo Gallery**.

> [!IMPORTANT]
> In accordance with security requirements, the application code **does NOT create the first administrator automatically**.
> The first administrator must be created intentionally through the Supabase Dashboard.

---

## Step-by-Step Provisioning Procedure

### Step 1: Create the User in Supabase Authentication

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project: `technovit-fine-arts`.
3. In the left navigation, go to **Authentication** → **Users**.
4. Click **Add User** → **Create User**.
5. Enter the administrator's email and a strong password.
6. Toggle **Auto Confirm User?** to `ON` (so the user is active immediately without requiring email verification in development).
7. Click **Create User**.
8. Copy the generated **User UID** (e.g. `a1b2c3d4-e5f6-7890-abcd-ef1234567890`).

---

### Step 2: Associate the Auth User with `admin_users` in the Database

1. In the Supabase Dashboard left navigation, go to **SQL Editor**.
2. Run the following SQL query, replacing the placeholders with your actual user details:

```sql
INSERT INTO admin_users (
  id,
  email,
  display_name,
  role,
  is_active
) VALUES (
  'PASTE_AUTH_USER_UUID_HERE',          -- The UID copied from Step 1
  'admin@vit.ac.in',                    -- Same email used in Step 1
  'Lead Administrator',                 -- Display name
  'super_admin',                        -- Must be 'super_admin', 'admin', or 'moderator'
  true                                  -- Active status
);
```

3. Click **Run**.
4. Verify the row was inserted:

```sql
SELECT id, email, role, is_active FROM admin_users;
```

---

### Step 3: Test Administrator Sign In

1. Start your Next.js application: `npm run dev`
2. Navigate to: `http://localhost:3000/admin/login`
3. Enter the email and password created in Step 1.
4. Click **Sign In to Admin**.
5. You should be redirected to `http://localhost:3000/admin/dashboard` showing your display name, email, and the **Super Administrator** badge.

---

## Role Hierarchy Reference

| Role | Database Value | Capabilities |
|---|---|---|
| **Super Administrator** | `super_admin` | Full control: user management, settings, destructive actions, photo moderation, location management |
| **Administrator** | `admin` | Normal operations: photo moderation, photo management, location & booth management, audit log viewing |
| **Moderator** | `moderator` | Focused operations: photo review, approval, and rejection only |

---

## Deactivation & Removal

To temporarily suspend an administrator's access:
```sql
UPDATE admin_users SET is_active = false WHERE email = 'target@vit.ac.in';
```
The user will immediately be blocked from all `/admin/*` routes upon their next request.
