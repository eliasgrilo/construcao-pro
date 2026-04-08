import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import {
  HARNESS_PREFIX,
  SUPPORT_FUNCTION,
  SUPPORT_SCHEMA,
  SUPPORT_TABLE,
  TRIGGER_TABLES,
} from './constants.mjs'

export function getConnectionString() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL

  const fallbackFile = resolve(process.cwd(), 'packages/database/test_pg.js')
  const source = readFileSync(fallbackFile, 'utf8')
  const match = source.match(/connectionString:\s*'([^']+)'/)
  if (!match) {
    throw new Error(
      'Connection string not found. Set SUPABASE_DB_URL or DATABASE_URL before running the harness.',
    )
  }
  return match[1]
}

export function makeTag(runId, label) {
  return `${HARNESS_PREFIX}-${runId}-${label}`
}

export function fail(message) {
  throw new Error(message)
}

export async function queryValue(client, sql, params = []) {
  const { rows } = await client.query(sql, params)
  if (!rows[0]) return null
  return rows[0][Object.keys(rows[0])[0]]
}

export async function installSupport(client) {
  await client.query(`create schema if not exists ${SUPPORT_SCHEMA}`)
  await client.query(`
    create table if not exists ${SUPPORT_TABLE} (
      pid integer primary key,
      fail_table text not null,
      fail_op text not null,
      fail_after integer not null default 1,
      hit_count integer not null default 0
    )
  `)
  await client.query(`
    create or replace function ${SUPPORT_FUNCTION}()
    returns trigger
    language plpgsql
    as $$
    declare
      v_state ${SUPPORT_TABLE}%rowtype;
      v_next_hit integer;
    begin
      select *
      into v_state
      from ${SUPPORT_TABLE}
      where pid = pg_backend_pid();

      if not found then
        return case when TG_OP = 'DELETE' then OLD else NEW end;
      end if;

      if v_state.fail_table = TG_TABLE_NAME and v_state.fail_op = TG_OP then
        v_next_hit := v_state.hit_count + 1;

        update ${SUPPORT_TABLE}
        set hit_count = v_next_hit
        where pid = pg_backend_pid();

        if v_next_hit >= greatest(v_state.fail_after, 1) then
          raise exception 'Injected failure on %.% hit %', TG_TABLE_NAME, TG_OP, v_next_hit;
        end if;
      end if;

      return case when TG_OP = 'DELETE' then OLD else NEW end;
    end;
    $$
  `)

  for (const table of TRIGGER_TABLES) {
    await client.query(`drop trigger if exists codex_injected_failure on public.${table}`)
    await client.query(`
      create trigger codex_injected_failure
      before insert or update or delete
      on public.${table}
      for each row
      execute function ${SUPPORT_FUNCTION}()
    `)
  }
}

export async function uninstallSupport(client) {
  for (const table of TRIGGER_TABLES) {
    await client.query(`drop trigger if exists codex_injected_failure on public.${table}`)
  }
  await client.query(`drop function if exists ${SUPPORT_FUNCTION}()`)
  await client.query(`drop table if exists ${SUPPORT_TABLE}`)
  await client.query(`drop schema if exists ${SUPPORT_SCHEMA}`)
}

export async function runInjectedCase(client, testCase, ctx) {
  let error = null
  let committed = false

  try {
    await client.query('begin')
    if (ctx.authUserId) {
      await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [ctx.authUserId])
      await client.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: ctx.authUserId, role: 'authenticated' }),
      ])
    }
    await client.query(
      `
        insert into ${SUPPORT_TABLE} (pid, fail_table, fail_op, fail_after, hit_count)
        values (pg_backend_pid(), $1, $2, $3, 0)
      `,
      [testCase.failpoint.table, testCase.failpoint.op, testCase.failpoint.after ?? 1],
    )
    await testCase.execute(client, ctx)
    await client.query('commit')
    committed = true
  } catch (caught) {
    error = caught
    try {
      await client.query('rollback')
    } catch {}
  } finally {
    try {
      await client.query(`delete from ${SUPPORT_TABLE} where pid = pg_backend_pid()`)
    } catch {}
  }

  if (committed) {
    fail(`${testCase.name} completed without the injected failure firing`)
  }

  assert.ok(error, `${testCase.name} should throw an injected failure`)
  const errorMessage = String(error.message || error)
  if (!errorMessage.includes('Injected failure')) {
    fail(`${testCase.name} threw a non-injected error: ${errorMessage}`)
  }
}
