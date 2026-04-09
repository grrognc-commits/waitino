import crypto from "crypto";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { companies, users, apiKeys, warehouses, checkins } from "../db/schema";
import { calculateCurrentWait } from "./checkin";

function generateApiKey(): string {
  return crypto.randomBytes(16).toString("hex"); // 32 chars
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ── Activate ───────────────────────────────────────────

export async function activate(data: {
  companyName: string;
  adminEmail: string;
  adminName: string;
  ruterinoCompanyId: number;
}) {
  // Check if already activated
  const [existing] = await db
    .select()
    .from(companies)
    .where(eq(companies.ruterinoCompanyId, data.ruterinoCompanyId));

  if (existing) {
    throw new Error("Ova Ruterino firma je već aktivirana");
  }

  // Check duplicate email
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, data.adminEmail));

  if (existingUser) {
    throw new Error("Korisnik s ovim emailom već postoji");
  }

  const slug = slugify(data.companyName) + "-" + Date.now();

  const [company] = await db
    .insert(companies)
    .values({
      name: data.companyName,
      slug,
      address: "",
      city: "",
      contactEmail: data.adminEmail,
      contactPhone: "",
      ruterinoCompanyId: data.ruterinoCompanyId,
    })
    .returning();

  // Create admin user with random password (they'll reset via forgot-password)
  const tempPassword = crypto.randomBytes(16).toString("hex");
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const nameParts = data.adminName.trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ") || firstName;

  await db.insert(users).values({
    companyId: company.id,
    email: data.adminEmail,
    passwordHash,
    firstName,
    lastName,
    phone: "",
    role: "admin",
  });

  // Generate API key
  const key = generateApiKey();
  await db.insert(apiKeys).values({
    companyId: company.id,
    key,
    name: "Ruterino integracija",
  });

  return {
    companyId: company.id,
    apiKey: key,
    dashboardUrl: `/dashboard?company=${company.slug}`,
  };
}

// ── Widget data ────────────────────────────────────────

export async function getWidgetData() {
  const allWarehouses = await db
    .select({ id: warehouses.id, name: warehouses.name, chain: warehouses.chain })
    .from(warehouses)
    .where(eq(warehouses.isActive, true));

  const results = [];
  for (const wh of allWarehouses) {
    const stats = await calculateCurrentWait(wh.id);
    results.push({
      name: wh.name,
      chain: wh.chain,
      trucksWaiting: stats.trucksWaiting,
      avgWait: stats.avgWaitMinutes,
      status: stats.status,
    });
  }

  // Sort by avg wait desc, take top 10
  results.sort((a, b) => b.avgWait - a.avgWait);
  return results.slice(0, 10);
}
