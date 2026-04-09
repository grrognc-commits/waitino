import { Router, Request, Response } from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth";
import * as checkinService from "../services/checkin";

const router = Router();

router.use(authMiddleware);

// POST /api/checkins/enter
router.post(
  "/enter",
  roleMiddleware(["driver"]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const {
        warehouse_id,
        latitude,
        longitude,
        accuracy_meters,
        cargo_type,
        vehicle_id,
        department_id,
        has_appointment,
      } = req.body;

      if (!warehouse_id || latitude == null || longitude == null || accuracy_meters == null) {
        res.status(400).json({
          success: false,
          error: "Obavezna polja: warehouse_id, latitude, longitude, accuracy_meters",
        });
        return;
      }

      const result = await checkinService.enter({
        driverId: user.userId,
        warehouseId: warehouse_id,
        latitude,
        longitude,
        accuracyMeters: accuracy_meters,
        cargoType: cargo_type,
        vehicleId: vehicle_id,
        departmentId: department_id,
        hasAppointment: has_appointment,
      });

      if ("rejected" in result && result.rejected) {
        res.json({
          success: true,
          data: null,
          message: result.message,
          queued: "queued" in result ? result.queued : false,
        });
        return;
      }

      if (!result.created) {
        res.json({
          success: true,
          data: result.checkin,
          message: "Već postoji aktivan check-in",
        });
        return;
      }

      res.status(201).json({ success: true, data: result.checkin });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Greška pri check-inu";
      res.status(400).json({ success: false, error: message });
    }
  }
);

// POST /api/checkins/exit
router.post(
  "/exit",
  roleMiddleware(["driver"]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { warehouse_id, latitude, longitude, accuracy_meters } = req.body;

      if (!warehouse_id || latitude == null || longitude == null || accuracy_meters == null) {
        res.status(400).json({
          success: false,
          error: "Obavezna polja: warehouse_id, latitude, longitude, accuracy_meters",
        });
        return;
      }

      const checkin = await checkinService.exit({
        driverId: user.userId,
        warehouseId: warehouse_id,
        latitude,
        longitude,
        accuracyMeters: accuracy_meters,
      });

      res.json({ success: true, data: checkin });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Greška pri izlasku";
      res.status(400).json({ success: false, error: message });
    }
  }
);

// GET /api/checkins/active
router.get(
  "/active",
  roleMiddleware(["dispatcher", "dc_manager", "admin"]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const companyId = user.role === "admin" ? null : user.companyId;
      const data = await checkinService.getActive(companyId);
      res.json({ success: true, data });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Greška pri dohvaćanju aktivnih check-ina";
      res.status(500).json({ success: false, error: message });
    }
  }
);

// GET /api/checkins/history
router.get(
  "/history",
  roleMiddleware(["dispatcher", "dc_manager", "admin"]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const companyId = user.role === "admin" ? null : user.companyId;

      const data = await checkinService.getHistory({
        companyId,
        warehouseId: req.query.warehouse_id
          ? parseInt(String(req.query.warehouse_id), 10)
          : undefined,
        driverId: req.query.driver_id
          ? parseInt(String(req.query.driver_id), 10)
          : undefined,
        dateFrom: req.query.date_from
          ? String(req.query.date_from)
          : undefined,
        dateTo: req.query.date_to
          ? String(req.query.date_to)
          : undefined,
        page: req.query.page
          ? parseInt(String(req.query.page), 10)
          : undefined,
        limit: req.query.limit
          ? parseInt(String(req.query.limit), 10)
          : undefined,
      });

      res.json({ success: true, data });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Greška pri dohvaćanju povijesti";
      res.status(500).json({ success: false, error: message });
    }
  }
);

// GET /api/checkins/warehouse/:id/stats
router.get(
  "/warehouse/:id/stats",
  roleMiddleware(["dispatcher", "dc_manager", "admin"]),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, error: "Nevažeći ID" });
        return;
      }
      const data = await checkinService.calculateCurrentWait(id);
      res.json({ success: true, data });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Greška pri izračunu statistike";
      res.status(500).json({ success: false, error: message });
    }
  }
);

export default router;
