import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const consultationRequests = sqliteTable('consultation_requests', {
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull(),
  name: text('name').notNull(),
  business: text('business').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  website: text('website').notNull(),
  selectedPackage: text('selected_package').notNull(),
  budget: text('budget').notNull(),
  goals: text('goals').notNull(),
  platforms: text('platforms').notNull(),
  extendedSupport: text('extended_support').notNull(),
  deliveryStatus: text('delivery_status').notNull(),
}, table => [index('idx_consultation_requests_created_at').on(table.createdAt)]);
