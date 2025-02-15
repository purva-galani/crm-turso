import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

// export const usersTable = sqliteTable("users_table", {
//   id: int().primaryKey({ autoIncrement: true }),
//   name: text().notNull(),
//   age: int().notNull(),
//   email: text().notNull().unique(),
// });

export const complaints = sqliteTable('complaints', {
  id: int('id').primaryKey({ autoIncrement: true }),
  contactNumber: text('contactNumber').notNull(),
  caseStatus: text('caseStatus').default('Pending'),
  caseOrigin: text('caseOrigin').notNull(),
  subject: text('subject').notNull(),
  priority: text('priority').default('Medium'),
  date: text('date').notNull(),
  time: text('time').notNull(),
  complainerName: text('complainerName').notNull(),
});