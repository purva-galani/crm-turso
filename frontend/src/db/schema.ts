import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

// export const usersTable = sqliteTable("users_table", {
//   id: int().primaryKey({ autoIncrement: true }),
//   name: text().notNull(),
//   age: int().notNull(),
//   email: text().notNull().unique(),
// });

export const complaints = sqliteTable('complaints', {
  id: int('id').primaryKey({ autoIncrement: true }),
  complainerName: text('complainerName').notNull(),
  contactNumber: text('contactNumber').notNull(),
  subject: text('subject').notNull(),
  caseOrigin: text('caseOrigin').notNull(),
  date: text('date').notNull(),
  time: text('time').notNull(),
  caseStatus: text('caseStatus').default('Pending'),
  priority: text('priority').default('Medium'),
});