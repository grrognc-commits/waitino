import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import warehouseRouter from "./routes/warehouses";
import adminWarehouseRouter from "./routes/adminWarehouses";
import checkinRouter from "./routes/checkins";
import dashboardRouter from "./routes/dashboard";
import rolloverRouter from "./routes/rollovers";
import integrationRouter from "./routes/integration";
import { errorHandler } from "./middleware/errorHandler";
import { initSocket } from "./socket";
import { generateAlerts } from "./services/checkin";

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Socket.IO
initSocket(server);

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://terrific-bravery-production-78c1.up.railway.app",
  ],
  credentials: true,
}));
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/warehouses", warehouseRouter);
app.use("/api/admin/warehouses", adminWarehouseRouter);
app.use("/api/checkins", checkinRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/rollovers", rolloverRouter);
app.use("/api/integration", integrationRouter);

app.use(errorHandler);

// Alert generation every 5 minutes
const ALERT_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
  generateAlerts().catch((err) =>
    console.error("Greška pri generiranju alertova:", err)
  );
}, ALERT_INTERVAL_MS);

server.listen(PORT, () => {
  console.log(`Poslužitelj pokrenut na portu ${PORT}`);
});
