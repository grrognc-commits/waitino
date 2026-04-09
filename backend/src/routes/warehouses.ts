import { Router, Request, Response } from "express";
import * as warehouseService from "../services/warehouse";

const router = Router();

// GET /api/warehouses/geofences — gate coordinates + radius for mobile geofencing
router.get("/geofences", async (_req: Request, res: Response) => {
  try {
    const data = await warehouseService.getGeofenceRegions();
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri dohvaćanju geofence regija";
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/warehouses/map — mora biti prije /:id
router.get("/map", async (_req: Request, res: Response) => {
  try {
    const data = await warehouseService.getMapData();
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri dohvaćanju podataka za kartu";
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/warehouses
router.get("/", async (req: Request, res: Response) => {
  try {
    const chain = req.query.chain as string | undefined;
    const city = req.query.city as string | undefined;

    const data = await warehouseService.listWarehouses({ chain, city });
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri dohvaćanju skladišta";
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/warehouses/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: "Nevažeći ID" });
      return;
    }

    const data = await warehouseService.getWarehouseById(id);
    if (!data) {
      res.status(404).json({ success: false, error: "Skladište nije pronađeno" });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri dohvaćanju skladišta";
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/warehouses/:id/departments
router.get("/:id/departments", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: "Nevažeći ID" });
      return;
    }

    const data = await warehouseService.getDepartmentsWithWait(id);
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri dohvaćanju odjela";
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
