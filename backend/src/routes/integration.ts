import { Router, Request, Response } from "express";
import { ruterinoMasterAuth, apiKeyAuth } from "../middleware/apiKeyAuth";
import * as integrationService from "../services/integration";

const router = Router();

// POST /api/integration/ruterino/activate
router.post("/ruterino/activate", ruterinoMasterAuth, async (req: Request, res: Response) => {
  try {
    const { company_name, admin_email, admin_name, ruterino_company_id } = req.body;

    if (!company_name || !admin_email || !admin_name || !ruterino_company_id) {
      res.status(400).json({
        success: false,
        error: "Obavezna polja: company_name, admin_email, admin_name, ruterino_company_id",
      });
      return;
    }

    const data = await integrationService.activate({
      companyName: company_name,
      adminEmail: admin_email,
      adminName: admin_name,
      ruterinoCompanyId: ruterino_company_id,
    });

    res.status(201).json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri aktivaciji";
    res.status(400).json({ success: false, error: message });
  }
});

// GET /api/integration/ruterino/widget
router.get("/ruterino/widget", apiKeyAuth, async (_req: Request, res: Response) => {
  try {
    const warehouses = await integrationService.getWidgetData();
    res.json({ success: true, data: { warehouses } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri dohvaćanju widget podataka";
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
