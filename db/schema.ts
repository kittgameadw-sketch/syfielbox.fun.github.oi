import { pgTable, serial, text, integer, timestamp, unique } from "drizzle-orm/pg-core";

export const applications = pgTable("applications", {
  id: serial().primaryKey(),
  nick: text().notNull(),
  discord: text().notNull(),
  age: integer().notNull(),
  role: text().notNull(),
  playtime: text().notNull(),
  experience: text().notNull().default(""),
  reason: text().notNull(),
  status: text().notNull().default("beklemede"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Oyuncu hesapları (Netlify Identity kullanıcı id'si ile eşleşir)
export const accounts = pgTable("accounts", {
  id: text().primaryKey(),
  email: text().notNull(),
  nick: text().notNull().unique(),
  credits: integer().notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Kredi hareketleri (yükleme, harcama, admin düzeltmesi)
export const creditTransactions = pgTable("credit_transactions", {
  id: serial().primaryKey(),
  accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  amount: integer().notNull(),
  reason: text().notNull(),
  paymentRef: text("payment_ref").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Mağaza siparişleri
export const orders = pgTable("orders", {
  id: serial().primaryKey(),
  accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  nick: text().notNull(),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  price: integer().notNull(),
  status: text().notNull().default("beklemede"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Liderlik tablosu istatistikleri
export const players = pgTable("players", {
  id: serial().primaryKey(),
  nick: text().notNull().unique(),
  kills: integer().notNull().default(0),
  deaths: integer().notNull().default(0),
  wins: integer().notNull().default(0),
  points: integer().notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Turnuvalar & etkinlikler
export const tournaments = pgTable("tournaments", {
  id: serial().primaryKey(),
  title: text().notNull(),
  description: text().notNull().default(""),
  type: text().notNull().default("Turnuva"),
  prize: text().notNull().default(""),
  startsAt: timestamp("starts_at").notNull(),
  maxPlayers: integer("max_players").notNull().default(32),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tournamentEntries = pgTable(
  "tournament_entries",
  {
    id: serial().primaryKey(),
    tournamentId: integer("tournament_id").notNull().references(() => tournaments.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    nick: text().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("tournament_entries_unique").on(t.tournamentId, t.accountId)]
);
