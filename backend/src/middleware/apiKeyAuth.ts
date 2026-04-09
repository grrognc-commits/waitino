import { Request, Response, NextFunction } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { apiKeys } from "../db/schema";

const RUTERINO_MASTER_KEY = process.env.RUTERINO_MASTER_KEY || "";

declare global {
  namespace Express {
    interface Request {
      apiKey?: { id: number; companyId: number; name: string };
    }
  }
}

/**
 * Authenticates via API key from `x-api-key` header or `api_key` query param.
 * Looks up the key in the api_keys table.
 */
export function apiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const key =
    (req.headers["x-api-key"] as string | undefined) ??
    (req.query.api_key as string | undefined);

  if (!key) {
    res.status(401).json({ success: false, error: "API ključ nije pronađen" });
    return;
  }

  db.select()
    .from(apiKeys)
    .where(and(eq(apiKeys.key, key), eq(apiKeys.isActive, true)))
    .then((rows) => {
      if (rows.length === 0) {
        res.status(401).json({ success: false, error: "Nevažeći API ključ" });
        return;
      }
      req.apiKey = {
        id: rows[0].id,
        companyId: rows[0].companyId,
        name: rows[0].name,
      };
      next();
    })
    .catch(() => {
      res.status(500).json({ success: false, error: "Greška pri provjeri API ključa" });
    });
}

/**
 * Authenticates using the Ruterino master key (for activation endpoint).
 * Checked via `x-ruterino-key` header.
 */
export function ruterinoMasterAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const key = req.headers["x-ruterino-key"] as string | undefined;

  if (!key || key !== RUTERINO_MASTER_KEY) {
    res.status(401).json({ success: false, error: "Nevažeći Ruterino ključ" });
    return;
  }

  next();
}
