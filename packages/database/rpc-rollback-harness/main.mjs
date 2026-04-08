import { randomUUID } from 'node:crypto'
import process from 'node:process'
import { Client } from 'pg'
import { cases } from './cases.mjs'
import {
  getConnectionString,
  installSupport,
  runInjectedCase,
  uninstallSupport,
} from './helpers.mjs'

function getFilteredCases() {
  if (!process.env.ROLLBACK_HARNESS_FILTER) return cases

  const filter = process.env.ROLLBACK_HARNESS_FILTER.toLowerCase()
  return cases.filter((testCase) => testCase.name.toLowerCase().includes(filter))
}

async function cleanupCase(client, testCase, ctx) {
  if (!ctx) return []

  try {
    await testCase.cleanup(client, ctx)
    return []
  } catch (cleanupError) {
    return [
      {
        name: `${testCase.name} cleanup`,
        status: 'FAIL',
        durationMs: 0,
        error: String(cleanupError.message || cleanupError),
      },
    ]
  }
}

async function runCase(client, testCase, runId) {
  const startedAt = Date.now()
  let ctx = null

  try {
    ctx = await testCase.setup(client, runId)
    await runInjectedCase(client, testCase, ctx)
    await testCase.assertRollback(client, ctx)
    const cleanupResults = await cleanupCase(client, testCase, ctx)
    return [
      {
        name: testCase.name,
        status: 'PASS',
        durationMs: Date.now() - startedAt,
      },
      ...cleanupResults,
    ]
  } catch (error) {
    const cleanupResults = await cleanupCase(client, testCase, ctx)
    return [
      {
        name: testCase.name,
        status: 'FAIL',
        durationMs: Date.now() - startedAt,
        error: String(error.message || error),
      },
      ...cleanupResults,
    ]
  }
}

function printResults(results) {
  const passCount = results.filter((result) => result.status === 'PASS').length
  const failCount = results.length - passCount

  console.log('\nRollback Harness Results\n')
  for (const result of results) {
    console.log(
      `${result.status}  ${result.name}  (${result.durationMs}ms)${
        result.error ? `\n      ${result.error}` : ''
      }`,
    )
  }
  console.log(`\nSummary: ${passCount} passed, ${failCount} failed`)

  if (failCount > 0) {
    process.exitCode = 1
  }
}

export async function main() {
  const client = new Client({
    connectionString: getConnectionString(),
    ssl: { rejectUnauthorized: false },
  })

  const runId = randomUUID().slice(0, 8)
  const results = []

  await client.connect()

  try {
    await installSupport(client)

    for (const testCase of getFilteredCases()) {
      results.push(...(await runCase(client, testCase, runId)))
    }
  } finally {
    try {
      await uninstallSupport(client)
    } finally {
      await client.end()
    }
  }

  printResults(results)
}
