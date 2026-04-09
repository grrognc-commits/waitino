import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, companies, refreshTokens } from "../db/schema";
import { JwtPayload, AuthUser } from "../types";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
const TOKEN_EXPIRY = "24h";
const REFRESH_EXPIRY_DAYS = 7;
const SALT_ROUNDS = 10;

function generateTokens(payload: JwtPayload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  const refreshToken = crypto.randomBytes(48).toString("hex");
  return { token, refreshToken };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function registerCompany(data: {
  companyName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}) {
  if (data.password.length < 8) {
    throw new Error("Lozinka mora imati najmanje 8 znakova");
  }

  const existing = await db.select().from(users).where(eq(users.email, data.email));
  if (existing.length > 0) {
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
      contactEmail: data.email,
      contactPhone: data.phone,
    })
    .returning();

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  const [user] = await db
    .insert(users)
    .values({
      companyId: company.id,
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: "dispatcher",
    })
    .returning();

  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
  };

  const { token, refreshToken } = generateTokens(payload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRY_DAYS);
  await db.insert(refreshTokens).values({
    userId: user.id,
    token: refreshToken,
    expiresAt,
  });

  return {
    token,
    refreshToken,
    user: toAuthUser(user),
  };
}

export async function login(email: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    throw new Error("Neispravni podaci za prijavu");
  }

  if (!user.isActive) {
    throw new Error("Korisnički račun je deaktiviran");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error("Neispravni podaci za prijavu");
  }

  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
  };

  const { token, refreshToken } = generateTokens(payload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRY_DAYS);
  await db.insert(refreshTokens).values({
    userId: user.id,
    token: refreshToken,
    expiresAt,
  });

  let company = null;
  if (user.companyId) {
    const [c] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, user.companyId));
    company = c ? { id: c.id, name: c.name, slug: c.slug } : null;
  }

  return {
    token,
    refreshToken,
    user: {
      ...toAuthUser(user),
      company,
    },
  };
}

export async function refresh(token: string) {
  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.token, token));

  if (!stored) {
    throw new Error("Nevažeći refresh token");
  }

  if (stored.expiresAt < new Date()) {
    await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));
    throw new Error("Refresh token je istekao");
  }

  const [user] = await db.select().from(users).where(eq(users.id, stored.userId));
  if (!user || !user.isActive) {
    throw new Error("Korisnik nije pronađen ili je deaktiviran");
  }

  // Rotate: delete old, issue new
  await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));

  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
  };

  const tokens = generateTokens(payload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRY_DAYS);
  await db.insert(refreshTokens).values({
    userId: user.id,
    token: tokens.refreshToken,
    expiresAt,
  });

  return {
    token: tokens.token,
    refreshToken: tokens.refreshToken,
  };
}

export async function forgotPassword(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    // Ne otkrivamo postoji li korisnik
    return;
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  console.log(`[RESET PASSWORD] Token za ${email}: ${resetToken}`);
}

export async function registerDriver(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  companyId?: number;
}) {
  if (data.password.length < 8) {
    throw new Error("Lozinka mora imati najmanje 8 znakova");
  }

  const existing = await db.select().from(users).where(eq(users.email, data.email));
  if (existing.length > 0) {
    throw new Error("Korisnik s ovim emailom već postoji");
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  const [user] = await db
    .insert(users)
    .values({
      companyId: data.companyId ?? null,
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: "driver",
    })
    .returning();

  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
  };

  const { token, refreshToken } = generateTokens(payload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRY_DAYS);
  await db.insert(refreshTokens).values({
    userId: user.id,
    token: refreshToken,
    expiresAt,
  });

  return {
    token,
    refreshToken,
    user: toAuthUser(user),
  };
}

function toAuthUser(user: {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: number | null;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    companyId: user.companyId,
  };
}
