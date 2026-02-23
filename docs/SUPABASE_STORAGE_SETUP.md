# Supabase Storage Setup: `audio` and `covers` Buckets

The app stores **audio files** and **album cover images** in Supabase Storage. Each user can only access their own files. Here’s how to create the buckets and lock them down with RLS.

---

## Why this matters

- **Buckets**: Two private buckets, `audio` and `covers`.
- **Paths**: Files are stored as `{user_id}/{filename}` (e.g. `a1b2c3d4-.../song.mp3`). The first path segment is the logged-in user’s ID.
- **RLS**: Policies on `storage.objects` ensure users can only **read/write objects where the first folder equals their `auth.uid()`**.

---

## Option A: Dashboard (step-by-step)

### 1. Open Storage

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) and open your project.
2. In the left sidebar, click **Storage**.

### 2. Create the `audio` bucket

1. Click **New bucket**.
2. Set:
   - **Name**: `audio`
   - **Public bucket**: **Off** (private).
3. Click **Create bucket**.

### 3. Create the `covers` bucket

1. Click **New bucket** again.
2. Set:
   - **Name**: `covers`
   - **Public bucket**: **Off** (private).
3. Click **Create bucket**.

### 4. Add policies so users only access their own folder

For **each** bucket (`audio` and `covers`), you need policies that allow **SELECT**, **INSERT**, **UPDATE**, and **DELETE** only when the object’s path starts with the current user’s ID.

**Using the Policy Editor in the Dashboard:**

1. In **Storage**, click the bucket name (e.g. **audio**).
2. Open the **Policies** tab (or **New policy**).
3. Add **four** policies (one per operation). For each, use a **Custom policy** and the conditions below.

**Allowed operation: SELECT (read)**

- **Policy name**: e.g. `Users can read own audio`
- **Allowed operation**: **SELECT** (or “Read”)
- **Target roles**: `authenticated`
- **USING expression**:

```sql
bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text
```

**Allowed operation: INSERT (upload)**

- **Policy name**: e.g. `Users can upload own audio`
- **Allowed operation**: **INSERT**
- **Target roles**: `authenticated`
- **WITH CHECK expression**:

```sql
bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text
```

**Allowed operation: UPDATE**

- **Policy name**: e.g. `Users can update own audio`
- **Allowed operation**: **UPDATE**
- **Target roles**: `authenticated`
- **USING expression**:

```sql
bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text
```

**Allowed operation: DELETE**

- **Policy name**: e.g. `Users can delete own audio`
- **Allowed operation**: **DELETE**
- **Target roles**: `authenticated`
- **USING expression**:

```sql
bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text
```

4. Repeat the same four policies for the **covers** bucket, but replace `'audio'` with `'covers'` in every condition and in the policy names (e.g. “Users can read own covers”, etc.).

If your UI uses **Policy templates** instead of raw SQL, choose “For full customization” or “Custom” and paste the same `bucket_id` and `(storage.foldername(name))[1] = auth.uid()::text` condition where it asks for the check/using expression.

---

## Option B: Run SQL (fastest)

You can create the buckets and all policies in one go from the **SQL Editor**.

1. In the Dashboard, go to **SQL Editor**.
2. Click **New query**.
3. Paste the script below and run it.

**Note:** If the buckets already exist, the `insert into storage.buckets` lines may fail with “duplicate key”. In that case, skip those two lines (or delete the existing buckets first) and run only the policy part.

```sql
-- Create private buckets (skip if you already created them in the UI)
insert into storage.buckets (id, name, public)
values
  ('audio', 'audio', false),
  ('covers', 'covers', false)
on conflict (id) do nothing;

-- Policies for bucket: audio
-- Users can only access objects whose first path segment equals their user id (auth.uid()::text)

create policy "Users can read own audio"
on storage.objects for select
to authenticated
using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload own audio"
on storage.objects for insert
to authenticated
with check (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update own audio"
on storage.objects for update
to authenticated
using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own audio"
on storage.objects for delete
to authenticated
using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);

-- Policies for bucket: covers
create policy "Users can read own covers"
on storage.objects for select
to authenticated
using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload own covers"
on storage.objects for insert
to authenticated
with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update own covers"
on storage.objects for update
to authenticated
using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own covers"
on storage.objects for delete
to authenticated
using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
```

If you get **“policy already exists”**, delete the existing policies for `audio` and `covers` under **Storage → [bucket] → Policies** (or drop them by name in SQL), then run the script again.

---

## How the app uses the path

- **Upload**: The app uploads with path `{userId}/{timestamp}-{sanitizedFilename}` (e.g. `a1b2c3d4-e5f6-.../1234567890-song.mp3`). So the first folder is always the authenticated user’s ID.
- **RLS**: The condition `(storage.foldername(name))[1] = auth.uid()::text` ensures that only that user can read, upload, update, or delete objects in their folder.

After this, uploads and playback/cover display in Music Notebook will work as long as the user is signed in and the rest of your Supabase setup (tables, auth) is in place.
