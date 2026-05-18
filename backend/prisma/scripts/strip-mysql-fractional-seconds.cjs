/**
 * Rewrites MySQL dump / SQL so fractional-second syntax is removed.
 * Use when importing into older MySQL/MariaDB that reject DATETIME(3) / CURRENT_TIMESTAMP(3).
 *
 * Usage: node prisma/scripts/strip-mysql-fractional-seconds.cjs path/to/dump.sql [output.sql]
 * If output is omitted, writes path/to/dump.legacy.sql
 */
const fs = require('fs')
const path = require('path')

const input = process.argv[2]
if (!input) {
  console.error('Usage: node strip-mysql-fractional-seconds.cjs <input.sql> [output.sql]')
  process.exit(1)
}
const absIn = path.resolve(input)
const absOut = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.join(path.dirname(absIn), `${path.basename(absIn, path.extname(absIn))}.legacy${path.extname(absIn) || '.sql'}`)

let sql = fs.readFileSync(absIn, 'utf8')
sql = sql.replace(/\bDATETIME\s*\(\s*3\s*\)/gi, 'DATETIME')
sql = sql.replace(/\bCURRENT_TIMESTAMP\s*\(\s*3\s*\)/gi, 'CURRENT_TIMESTAMP')
fs.writeFileSync(absOut, sql, 'utf8')
console.log(`Wrote: ${absOut}`)
