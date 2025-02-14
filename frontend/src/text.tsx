import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { usersTable } from './db/schema';
import { InferInsertModel } from 'drizzle-orm';

async function main() {
  const client = createClient({ 
    url: process.env.TURSO_DATABASE_URL!, 
    authToken: process.env.TURSO_AUTH_TOKEN!
  });

  const db = drizzle(client);

  // Define user object
  const user: InferInsertModel<typeof usersTable> = {
    name: 'John',
    age: 30,
    email: 'john@example.com',
  };

  // Insert user into database
  await db.insert(usersTable).values(user);
  console.log('New user created!');

  // Fetch all users
  const users = await db.select().from(usersTable);
  console.log('Getting all users from the database: ', users);
}

main();
