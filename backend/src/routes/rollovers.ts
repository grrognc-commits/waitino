import { Router, Request, Response } from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth";
import * as rolloverService from "../services/rollover";

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware(["dispatcher", "dc_manager", "admin"]));

// POST /api/rollovers
router.post("/", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!user.companyId) {
      res.status(403).json({ success: false, error: "Potrebna je pripadnost firmi" });
      return;
    }

    const { checkin_id, reason, rescheduled_date, notes } = req.body;
    if (!checkin_id || !reason || !rescheduled_date) {
      res.status(400).json({
        success: false,
        error: "Obavezna polja: checkin_id, reason, rescheduled_date",
      });
      return;
    }

    const data = await rolloverService.createRollover({
      checkinId: checkin_id,
      reason,
      rescheduledDate: rescheduled_date,
      notes,
      dispatcherCompanyId: user.companyId,
    });

    res.status(201).json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri kreiranju rollovera";
    res.status(400).json({ success: false, error: message });
  }
});

// GET /api/rollovers
router.get("/", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!user.companyId) {
      res.json({ success: true, data: [] });
      return;
    }

    const resolved = req.query.resolved !== undefined
      ? req.query.resolved === "true"
      : undefined;
    const date = req.query.date ? String(req.query.date) : undefined;

    const data = await rolloverService.listRollovers({
      companyId: user.companyId,
      resolved,
      date,
    });

    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri dohvaćanju rollovera";
    res.status(500).json({ success: false, error: message });
  }
});

// PATCH /api/rollovers/:id/resolve
router.patch("/:id/resolve", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!user.companyId) {
      res.status(403).json({ success: false, error: "Potrebna je pripadnost firmi" });
      return;
    }

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: "Nevažeći ID" });
      return;
    }

    const data = await rolloverService.resolveRollover(id, user.companyId);
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri rješavanju rollovera";
    res.status(400).json({ success: false, error: message });
  }
});

// GET /api/rollovers/stats
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!user.companyId) {
      res.json({
        success: true,
        data: { rolloverCountThisMonth: 0, byWarehouse: [], byReason: [] },
      });
      return;
    }

    const data = await rolloverService.getStats(user.companyId);
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri dohvaćanju statistike";
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
