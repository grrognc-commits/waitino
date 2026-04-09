import { Router, Request, Response } from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth";
import * as dashboardService from "../services/dashboard";

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware(["dispatcher", "dc_manager", "admin"]));

// GET /api/dashboard/overview
router.get("/overview", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const companyId = user.role === "admin" ? null : user.companyId;
    const data = await dashboardService.getOverview(companyId);
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri dohvaćanju pregleda";
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/dashboard/drivers
router.get("/drivers", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const companyId = user.role === "admin" ? null : user.companyId;
    const data = await dashboardService.getDrivers(companyId);
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri dohvaćanju vozača";
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/dashboard/analytics
router.get("/analytics", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const companyId = user.role === "admin" ? null : user.companyId;
    const period = String(req.query.period || "7d");
    const warehouseId = req.query.warehouse_id
      ? parseInt(String(req.query.warehouse_id), 10)
      : undefined;

    const data = await dashboardService.getAnalytics({
      companyId,
      warehouseId,
      period,
    });
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri dohvaćanju analitike";
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/dashboard/alerts
router.get("/alerts", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!user.companyId) {
      res.json({ success: true, data: [] });
      return;
    }
    const data = await dashboardService.getAlerts(user.companyId);
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri dohvaćanju alertova";
    res.status(500).json({ success: false, error: message });
  }
});

// PATCH /api/dashboard/alerts/:id/read
router.patch("/alerts/:id/read", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!user.companyId) {
      res.status(403).json({ success: false, error: "Nemate dozvolu" });
      return;
    }

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: "Nevažeći ID" });
      return;
    }

    const updated = await dashboardService.markAlertRead(id, user.companyId);
    if (!updated) {
      res.status(404).json({ success: false, error: "Alert nije pronađen" });
      return;
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri označavanju alerta";
    res.status(400).json({ success: false, error: message });
  }
});

export default router;
