import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { authMiddleware, roleMiddleware } from "../middleware/auth";
import { db } from "../db";
import { companies } from "../db/schema";

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware(["admin", "dispatcher"]));

// PATCH /api/companies/:id
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: "Nevažeći ID" });
      return;
    }

    const user = req.user!;
    if (user.companyId !== id && user.role !== "admin") {
      res.status(403).json({ success: false, error: "Nemate dozvolu" });
      return;
    }

    const { timeFormat } = req.body;
    const values: Record<string, unknown> = { updatedAt: new Date() };

    if (timeFormat === "24h" || timeFormat === "12h") {
      values.timeFormat = timeFormat;
    }

    const [updated] = await db
      .update(companies)
      .set(values)
      .where(eq(companies.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ success: false, error: "Firma nije pronađena" });
      return;
    }

    res.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        timeFormat: updated.timeFormat,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri ažuriranju firme";
    res.status(400).json({ success: false, error: message });
  }
});

export default router;
