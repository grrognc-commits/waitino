import { Router, Request, Response } from "express";
import { authMiddleware, roleMiddleware } from "../middleware/auth";
import * as warehouseService from "../services/warehouse";

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware(["admin", "dispatcher"]));

// GET /api/admin/warehouses — full list with gate coords
router.get("/", async (_req: Request, res: Response) => {
  try {
    const data = await warehouseService.listAllWarehousesAdmin();
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri dohvaćanju skladišta";
    res.status(500).json({ success: false, error: message });
  }
});

// POST /api/admin/warehouses
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      name,
      slug,
      address,
      city,
      latitude,
      longitude,
      gateLatitude,
      gateLongitude,
      geofenceRadius,
      chain,
    } = req.body;

    if (!name || !slug || !address || !city || latitude == null || longitude == null || !chain) {
      res.status(400).json({ success: false, error: "Obavezna polja: name, slug, address, city, latitude, longitude, chain" });
      return;
    }

    const warehouse = await warehouseService.createWarehouse({
      name,
      slug,
      address,
      city,
      latitude,
      longitude,
      gateLatitude: gateLatitude ?? latitude,
      gateLongitude: gateLongitude ?? longitude,
      geofenceRadius,
      chain,
    });

    res.status(201).json({ success: true, data: warehouse });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri kreiranju skladišta";
    res.status(400).json({ success: false, error: message });
  }
});

// PATCH /api/admin/warehouses/:id
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: "Nevažeći ID" });
      return;
    }

    const updated = await warehouseService.updateWarehouse(id, req.body);
    if (!updated) {
      res.status(404).json({ success: false, error: "Skladište nije pronađeno" });
      return;
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri ažuriranju skladišta";
    res.status(400).json({ success: false, error: message });
  }
});

// DELETE /api/admin/warehouses/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: "Nevažeći ID" });
      return;
    }

    const deleted = await warehouseService.deleteWarehouse(id);
    if (!deleted) {
      res.status(404).json({ success: false, error: "Skladište nije pronađeno" });
      return;
    }

    res.json({ success: true, data: { message: "Skladište obrisano" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri brisanju skladišta";
    res.status(500).json({ success: false, error: message });
  }
});

// DELETE /api/admin/warehouses — delete ALL (requires confirm header)
router.delete("/", async (req: Request, res: Response) => {
  try {
    const confirm = req.headers["x-confirm-delete"];
    if (confirm !== "DELETE_ALL") {
      res.status(400).json({
        success: false,
        error: "Potreban je header x-confirm-delete: DELETE_ALL",
      });
      return;
    }

    const count = await warehouseService.deleteAllWarehouses();
    res.json({ success: true, data: { message: `Obrisano ${count} skladišta` } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri brisanju svih skladišta";
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
