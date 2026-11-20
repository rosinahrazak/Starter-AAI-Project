// Seeds the six demo users from docs/specs/02-design.md Reference B.
// Run with: npx prisma db seed
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// The brief's demo password (§7.2). Stored only as a bcrypt hash, never plain text.
const DEMO_PASSWORD = 'password123';

const demoUsers = [
  {
    email: 'employee-1@budiman.com',
    name: 'Employee 1',
    icNumber: '00-148888',
    role: 'EMPLOYEE',
    division: 'Finance',
    designation: 'Accounts Clerk',
  },
  {
    email: 'supervisor-1@budiman.com',
    name: 'Supervisor 1',
    icNumber: '00-157777',
    role: 'SUPERVISOR',
    division: 'Finance',
    designation: 'Finance Manager',
  },
  {
    email: 'supervisor-2@budiman.com',
    name: 'Supervisor 2',
    icNumber: '00-166666',
    role: 'SUPERVISOR',
    division: 'Finance',
    designation: 'Accountant',
  },
  {
    email: 'hr-1@budiman.com',
    name: 'HR 1',
    icNumber: '00-175555',
    role: 'HR',
    division: 'Human Resources',
    designation: 'HR Officer',
  },
  {
    email: 'hr-2@budiman.com',
    name: 'HR 2',
    icNumber: '00-184444',
    role: 'HR',
    division: 'Human Resources',
    designation: 'HR Officer',
  },
  {
    email: 'admin@budiman.com',
    name: 'Admin',
    icNumber: '00-193333',
    role: 'ADMIN',
    division: 'Admin',
    designation: 'Admin Manager',
  },
];

async function main() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const user of demoUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { ...user, password: hash },
      create: { ...user, password: hash },
    });
  }
  console.log(`Seeded ${demoUsers.length} demo users (password stored as bcrypt hash).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
