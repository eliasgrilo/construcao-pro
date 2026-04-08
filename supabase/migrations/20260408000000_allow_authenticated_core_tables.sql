-- ─────────────────────────────────────────────────────────────────────────────
-- Allow authenticated users to access core tables that were missing policies.
--
-- Problem: The original base tables (notas_fiscais, itens_nf, materiais,
-- categorias, fornecedores, usuarios, usuario_obras) had RLS enabled but
-- zero policies for the `authenticated` role — only `service_role_all_access`.
-- This caused all direct supabase.from() calls to return empty arrays.
--
-- Solution: Add permissive allow_all_authenticated policies to unblock access.
-- Write operations are still gated by RBAC at the application layer.
-- ─────────────────────────────────────────────────────────────────────────────

-- Clean up any leftover partial policies from a previous migration attempt
DROP POLICY IF EXISTS "notas_fiscais_delete" ON notas_fiscais;
DROP POLICY IF EXISTS "itens_nf_delete" ON itens_nf;

CREATE POLICY "allow_all_authenticated" ON notas_fiscais
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_all_authenticated" ON itens_nf
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_all_authenticated" ON materiais
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_all_authenticated" ON categorias
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_all_authenticated" ON fornecedores
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_all_authenticated" ON usuarios
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_all_authenticated" ON usuario_obras
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
