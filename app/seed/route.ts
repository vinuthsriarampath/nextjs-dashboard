import bcrypt from 'bcrypt';
import postgres from 'postgres';
import { invoices, customers, revenue, users } from '../lib/placeholder-data';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

async function seedUsers() {
  console.log('Seeding users...');
  
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `;

  const insertedUsers = await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return sql`
        INSERT INTO users (id, name, email, password)
        VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
        ON CONFLICT (id) DO NOTHING;
      `;
    }),
  );

  console.log(`✅ Users seeded: ${users.length} users processed`);
  return insertedUsers;
}

async function seedInvoices() {
  console.log('Seeding invoices...');
  
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      customer_id UUID NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );
  `;

  const insertedInvoices = await Promise.all(
    invoices.map(
      (invoice) => sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date})
        ON CONFLICT (id) DO NOTHING;
      `,
    ),
  );

  console.log(`✅ Invoices seeded: ${invoices.length} invoices processed`);
  return insertedInvoices;
}

async function seedCustomers() {
  console.log('Seeding customers...');
  
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `;

  const insertedCustomers = await Promise.all(
    customers.map(
      (customer) => sql`
        INSERT INTO customers (id, name, email, image_url)
        VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
        ON CONFLICT (id) DO NOTHING;
      `,
    ),
  );

  console.log(`✅ Customers seeded: ${customers.length} customers processed`);
  return insertedCustomers;
}

async function seedRevenue() {
  console.log('Seeding revenue...');
  
  await sql`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    );
  `;

  const insertedRevenue = await Promise.all(
    revenue.map(
      (rev) => sql`
        INSERT INTO revenue (month, revenue)
        VALUES (${rev.month}, ${rev.revenue})
        ON CONFLICT (month) DO NOTHING;
      `,
    ),
  );

  console.log(`✅ Revenue seeded: ${revenue.length} revenue records processed`);
  return insertedRevenue;
}

export async function GET() {
  console.log('🌱 Starting database seeding...');
  
  try {
    const result = await sql.begin(async (sql) => {
      const usersResult = await seedUsers();
      const customersResult = await seedCustomers();
      const invoicesResult = await seedInvoices();
      const revenueResult = await seedRevenue();
      
      return {
        users: usersResult,
        customers: customersResult,
        invoices: invoicesResult,
        revenue: revenueResult,
      };
    });

    console.log('🎉 Database seeded successfully!');
    
    return Response.json({ 
      message: 'Database seeded successfully',
      summary: {
        users: users.length,
        customers: customers.length,
        invoices: invoices.length,
        revenue: revenue.length,
      }
    });
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error
    }, { status: 500 });
  } finally {
    await sql.end();
  }
}
