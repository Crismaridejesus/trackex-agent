import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()

async function main() {
  const rows = await prisma.$queryRawUnsafe<{ email: string; count: number }[]>(
    `SELECT lower(email) as email, count(*)::int as count
     FROM employees
     GROUP BY lower(email)
     HAVING count(*) > 1
     ORDER BY count DESC`
  )

  if (rows.length === 0) {
    console.log("No duplicate employee emails found.")
  } else {
    console.log("Duplicate emails:")
    for (const r of rows) {
      console.log(`  ${r.email} x ${r.count}`)
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
