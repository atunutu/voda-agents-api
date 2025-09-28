// Seed one ACTIVE agent with a known phone & password hash
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const phone = '255700000001';
  const password = 'Agent@123';
  const hash = await bcrypt.hash(password, 10);

  await prisma.agent.upsert({
    where: { phone },
    update: {},
    create: {
      name: 'Jane Agent',
      phone,
      password: hash,
      region: 'Dar es Salaam',
      district: 'Ilala',
      ward: 'Upanga',
      status: 'ACTIVE'
    }
  });

  console.log('Seeded agent:', phone, '/', password);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
