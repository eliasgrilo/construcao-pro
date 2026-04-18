-- Create the documentos storage bucket (private, signed URLs only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS: Allow authenticated users to upload files
CREATE POLICY "documentos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos');

-- RLS: Allow authenticated users to read/download files
CREATE POLICY "documentos_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documentos');

-- RLS: Allow authenticated users to update files
CREATE POLICY "documentos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'documentos');

-- RLS: Allow authenticated users to delete files
CREATE POLICY "documentos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documentos');
