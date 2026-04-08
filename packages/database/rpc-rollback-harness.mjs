import process from 'node:process'
import { main } from './rpc-rollback-harness/main.mjs'

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
