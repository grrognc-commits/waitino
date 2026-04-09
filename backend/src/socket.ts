import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { JwtPayload } from "./types";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      socket.data.user = null;
      return next();
    }
    try {
      const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
      socket.data.user = payload;
      next();
    } catch {
      next(new Error("Nevažeći token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    // Everyone joins public room
    socket.join("public");

    const user = socket.data.user as JwtPayload | null;
    if (user?.companyId) {
      socket.join(`company:${user.companyId}`);
    }

    // Client can subscribe to specific warehouse rooms
    socket.on("join_warehouse", (warehouseId: number) => {
      socket.join(`warehouse:${warehouseId}`);
    });

    socket.on("leave_warehouse", (warehouseId: number) => {
      socket.leave(`warehouse:${warehouseId}`);
    });

    socket.on("disconnect", () => {
      // cleanup handled by socket.io
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.IO nije inicijaliziran");
  }
  return io;
}

// ── Broadcast helpers ──────────────────────────────────

export function broadcastWarehouseStatus(
  warehouseId: number,
  stats: {
    trucksWaiting: number;
    avgWaitMinutes: number;
    status: string;
  }
) {
  const io = getIO();
  const payload = {
    warehouseId,
    trucksWaiting: stats.trucksWaiting,
    avgWait: stats.avgWaitMinutes,
    status: stats.status,
  };
  io.to("public").emit("warehouse_status_update", payload);
  io.to(`warehouse:${warehouseId}`).emit("warehouse_status_update", payload);
}

export function broadcastNewCheckin(
  warehouseId: number,
  companyId: number | null,
  data: {
    driverName: string;
    warehouseName: string;
    cargoType: string;
    enteredAt: Date;
  }
) {
  const io = getIO();
  const payload = {
    warehouseId,
    driverName: data.driverName,
    warehouseName: data.warehouseName,
    cargoType: data.cargoType,
    enteredAt: data.enteredAt,
  };
  if (companyId) {
    io.to(`company:${companyId}`).emit("new_checkin", payload);
  }
  io.to(`warehouse:${warehouseId}`).emit("new_checkin", payload);
  io.to("public").emit("new_checkin", payload);
}

export function broadcastCheckinCompleted(
  warehouseId: number,
  companyId: number | null,
  data: {
    driverName: string;
    warehouseName: string;
    waitMinutes: number;
  }
) {
  const io = getIO();
  const payload = {
    warehouseId,
    driverName: data.driverName,
    warehouseName: data.warehouseName,
    waitMinutes: data.waitMinutes,
  };
  if (companyId) {
    io.to(`company:${companyId}`).emit("checkin_completed", payload);
  }
  io.to(`warehouse:${warehouseId}`).emit("checkin_completed", payload);
  io.to("public").emit("checkin_completed", payload);
}

export function broadcastAlert(
  companyId: number,
  alert: {
    alertType: string;
    message: string;
    warehouseId: number | null;
    warehouseName?: string;
  }
) {
  const io = getIO();
  io.to(`company:${companyId}`).emit("alert_created", {
    alertType: alert.alertType,
    message: alert.message,
    warehouseId: alert.warehouseId,
    warehouseName: alert.warehouseName ?? null,
  });
}
