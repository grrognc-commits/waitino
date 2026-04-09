import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import * as authService from "../services/auth";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  message: { success: false, error: "Previše pokušaja prijave. Pokušajte ponovo za minutu." },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { companyName, email, password, firstName, lastName, phone } = req.body;

    if (!companyName || !email || !password || !firstName || !lastName || !phone) {
      res.status(400).json({ success: false, error: "Sva polja su obavezna" });
      return;
    }

    const result = await authService.registerCompany({
      companyName,
      email,
      password,
      firstName,
      lastName,
      phone,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri registraciji";
    res.status(400).json({ success: false, error: message });
  }
});

// POST /api/auth/login
router.post("/login", loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: "Email i lozinka su obavezni" });
      return;
    }

    const result = await authService.login(email, password);
    res.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri prijavi";
    res.status(401).json({ success: false, error: message });
  }
});

// POST /api/auth/refresh
router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ success: false, error: "Refresh token je obavezan" });
      return;
    }

    const result = await authService.refresh(refreshToken);
    res.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri obnovi tokena";
    res.status(401).json({ success: false, error: message });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ success: false, error: "Email je obavezan" });
      return;
    }

    await authService.forgotPassword(email);
    // Uvijek vrati uspjeh da ne otkrijemo postoji li korisnik
    res.json({ success: true, data: { message: "Ako račun postoji, poslali smo upute za reset lozinke." } });
  } catch {
    res.json({ success: true, data: { message: "Ako račun postoji, poslali smo upute za reset lozinke." } });
  }
});

// POST /api/auth/register-driver
router.post("/register-driver", async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, phone, companyId } = req.body;

    if (!email || !password || !firstName || !lastName || !phone) {
      res.status(400).json({ success: false, error: "Sva polja su obavezna" });
      return;
    }

    const result = await authService.registerDriver({
      email,
      password,
      firstName,
      lastName,
      phone,
      companyId,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri registraciji vozača";
    res.status(400).json({ success: false, error: message });
  }
});

export default router;
