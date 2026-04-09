import "dotenv/config";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  warehouses,
  warehouseDepartments,
  companies,
  users,
  vehicles,
  checkins,
  alerts,
  rolloverOrders,
} from "./schema";

// ⚠️  GPS koordinate su aproksimativne — gate koordinate MORAJU se ručno verificirati!

interface SeedWarehouse {
  name: string;
  slug: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  gateLatitude: number;
  gateLongitude: number;
  chain: "kaufland" | "lidl" | "plodine" | "spar" | "konzum" | "tommy" | "studenac" | "metro" | "other";
  departments: ("frozen" | "chilled" | "ambient" | "mixed")[];
}

const warehouseData: SeedWarehouse[] = [
  { name: "Kaufland DC Jastrebarsko", slug: "kaufland-dc-jastrebarsko", address: "Ulica Marijana Cvetkovića 4, 10450 Jastrebarsko", city: "Jastrebarsko", latitude: 45.663, longitude: 15.643, gateLatitude: 45.6632, gateLongitude: 15.6435, chain: "kaufland", departments: ["frozen", "chilled", "ambient"] },
  { name: "Kaufland DC Kaštel Sućurac", slug: "kaufland-dc-kastel-sucurac", address: "Gospodarska zona, 21212 Kaštel Sućurac", city: "Kaštel Sućurac", latitude: 43.548, longitude: 16.432, gateLatitude: 43.5482, gateLongitude: 16.4325, chain: "kaufland", departments: ["frozen", "chilled", "ambient"] },
  { name: "Lidl DC Perušić", slug: "lidl-dc-perusic", address: "Gospodarska zona, 53202 Perušić", city: "Perušić", latitude: 44.638, longitude: 15.374, gateLatitude: 44.6382, gateLongitude: 15.3745, chain: "lidl", departments: ["frozen", "chilled", "ambient"] },
  { name: "Lidl DC Šenkovec", slug: "lidl-dc-senkovec", address: "Industrijska zona, 40000 Čakovec", city: "Šenkovec", latitude: 46.366, longitude: 16.428, gateLatitude: 46.3662, gateLongitude: 16.4285, chain: "lidl", departments: ["frozen", "chilled", "ambient"] },
  { name: "Lidl DC Novska", slug: "lidl-dc-novska", address: "Gospodarska zona, 44330 Novska", city: "Novska", latitude: 45.343, longitude: 16.979, gateLatitude: 45.3432, gateLongitude: 16.9795, chain: "lidl", departments: ["frozen", "chilled", "ambient"] },
  { name: "Plodine DC Rijeka", slug: "plodine-dc-rijeka", address: "Kukuljanovo bb, 51227", city: "Rijeka", latitude: 45.354, longitude: 14.462, gateLatitude: 45.3542, gateLongitude: 14.4625, chain: "plodine", departments: ["frozen", "chilled", "ambient", "mixed"] },
  { name: "Plodine DC Sveta Nedelja", slug: "plodine-dc-sveta-nedelja", address: "Gospodarska zona, 10431", city: "Sveta Nedelja", latitude: 45.785, longitude: 15.782, gateLatitude: 45.7852, gateLongitude: 15.7825, chain: "plodine", departments: ["frozen", "chilled", "ambient"] },
  { name: "Spar DC Sveta Nedelja", slug: "spar-dc-sveta-nedelja", address: "Rakitje, 10431", city: "Sveta Nedelja", latitude: 45.792, longitude: 15.76, gateLatitude: 45.7922, gateLongitude: 15.7605, chain: "spar", departments: ["frozen", "chilled", "ambient", "mixed"] },
  { name: "Spar DC Dugopolje", slug: "spar-dc-dugopolje", address: "Gospodarska zona, 21204", city: "Dugopolje", latitude: 43.582, longitude: 16.59, gateLatitude: 43.5822, gateLongitude: 16.5905, chain: "spar", departments: ["frozen", "chilled", "ambient"] },
  { name: "Konzum DC Zagreb", slug: "konzum-dc-zagreb-zitnjak", address: "Samoborska cesta 258, 10090", city: "Zagreb", latitude: 45.787, longitude: 15.871, gateLatitude: 45.7872, gateLongitude: 15.8715, chain: "konzum", departments: ["frozen", "chilled", "ambient", "mixed"] },
  { name: "Konzum DC Dugopolje", slug: "konzum-dc-dugopolje", address: "Gospodarska zona, 21204", city: "Dugopolje", latitude: 43.578, longitude: 16.585, gateLatitude: 43.5782, gateLongitude: 16.5855, chain: "konzum", departments: ["frozen", "chilled", "ambient"] },
  { name: "Konzum DC Rijeka", slug: "konzum-dc-rijeka", address: "Kukuljanovo bb, 51227", city: "Rijeka", latitude: 45.351, longitude: 14.458, gateLatitude: 45.3512, gateLongitude: 14.4585, chain: "konzum", departments: ["frozen", "chilled", "ambient"] },
  { name: "Konzum DC Osijek", slug: "konzum-dc-osijek", address: "Nemetin, 31000", city: "Osijek", latitude: 45.557, longitude: 18.735, gateLatitude: 45.5572, gateLongitude: 18.7355, chain: "konzum", departments: ["frozen", "chilled", "ambient"] },
  { name: "Tommy DC Split", slug: "tommy-dc-split", address: "Kopilica 62, 21000", city: "Split", latitude: 43.511, longitude: 16.43, gateLatitude: 43.5112, gateLongitude: 16.4305, chain: "tommy", departments: ["frozen", "chilled", "ambient"] },
  { name: "Tommy DC Dugopolje", slug: "tommy-dc-dugopolje", address: "Gospodarska zona, 21204", city: "Dugopolje", latitude: 43.585, longitude: 16.587, gateLatitude: 43.5852, gateLongitude: 16.5875, chain: "tommy", departments: ["frozen", "chilled", "ambient", "mixed"] },
  { name: "Tommy DC Zadar", slug: "tommy-dc-zadar", address: "Murvica, 23000", city: "Zadar", latitude: 44.102, longitude: 15.225, gateLatitude: 44.1022, gateLongitude: 15.2255, chain: "tommy", departments: ["frozen", "chilled", "ambient"] },
  { name: "Studenac DC Dugopolje", slug: "studenac-dc-dugopolje", address: "Gospodarska zona, 21204", city: "Dugopolje", latitude: 43.58, longitude: 16.592, gateLatitude: 43.5802, gateLongitude: 16.5925, chain: "studenac", departments: ["frozen", "chilled", "ambient"] },
  { name: "Studenac DC Solin", slug: "studenac-dc-solin", address: "Gospodarska zona, 21210", city: "Solin", latitude: 43.54, longitude: 16.48, gateLatitude: 43.5402, gateLongitude: 16.4805, chain: "studenac", departments: ["frozen", "chilled", "ambient"] },
  { name: "Metro DC Zagreb", slug: "metro-dc-zagreb-jankomir", address: "Jankomir 31, 10090", city: "Zagreb", latitude: 45.798, longitude: 15.855, gateLatitude: 45.7982, gateLongitude: 15.8555, chain: "metro", departments: ["frozen", "chilled", "ambient", "mixed"] },
  { name: "Metro DC Split", slug: "metro-dc-split", address: "Starčevićeva 32, 21000", city: "Split", latitude: 45.519, longitude: 16.462, gateLatitude: 43.5192, gateLongitude: 16.4625, chain: "metro", departments: ["frozen", "chilled", "ambient"] },
  { name: "Velpro DC Zagreb", slug: "velpro-dc-zagreb", address: "Škorpika 32, 10090", city: "Zagreb", latitude: 45.78, longitude: 15.88, gateLatitude: 45.7802, gateLongitude: 15.8805, chain: "other", departments: ["frozen", "chilled", "ambient"] },
  { name: "Eurospin DC Lučko", slug: "eurospin-dc-lucko", address: "Lučko, 10250", city: "Zagreb", latitude: 45.767, longitude: 15.862, gateLatitude: 45.7672, gateLongitude: 15.8625, chain: "other", departments: ["chilled", "ambient"] },
  { name: "KTC DC Križevci", slug: "ktc-dc-krizevci", address: "Križevci, 48260", city: "Križevci", latitude: 46.022, longitude: 16.543, gateLatitude: 46.0222, gateLongitude: 16.5435, chain: "other", departments: ["frozen", "chilled", "ambient"] },
  { name: "Ribola DC Split", slug: "ribola-dc-split", address: "Kopilica bb, 21000", city: "Split", latitude: 43.513, longitude: 16.433, gateLatitude: 43.5132, gateLongitude: 16.4335, chain: "other", departments: ["frozen", "chilled", "ambient"] },
  { name: "NTL DC Sesvete", slug: "ntl-dc-sesvete", address: "Sesvete, 10360", city: "Zagreb", latitude: 45.828, longitude: 16.11, gateLatitude: 45.8282, gateLongitude: 16.1105, chain: "other", departments: ["chilled", "ambient", "mixed"] },
];

// ── Helpers ────────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Weighted wait: peak at 30-90, tail towards 240
function randomWaitMinutes(chain: string, hour: number): number {
  const chainMult = chain === "kaufland" || chain === "lidl" ? 1.6 : chain === "plodine" || chain === "konzum" ? 1.2 : 0.8;
  const hourMult = hour >= 7 && hour <= 10 ? 1.5 : hour >= 11 && hour <= 14 ? 1.0 : 0.6;
  const base = rand(15, 120);
  return Math.min(Math.round(base * chainMult * hourMult), 240);
}

// ── Main ───────────────────────────────────────────────

async function seed() {
  console.log("Pokretanje demo seed skripte...\n");

  // 1. Warehouses
  const whIds: number[] = [];
  const whChains: string[] = [];
  const deptIds = new Map<number, number[]>();

  for (const wh of warehouseData) {
    const [inserted] = await db.insert(warehouses).values({
      name: wh.name, slug: wh.slug, address: wh.address, city: wh.city,
      latitude: wh.latitude, longitude: wh.longitude,
      gateLatitude: wh.gateLatitude, gateLongitude: wh.gateLongitude,
      chain: wh.chain,
    }).returning();
    whIds.push(inserted.id);
    whChains.push(wh.chain);
    const ids: number[] = [];
    for (const dept of wh.departments) {
      const [d] = await db.insert(warehouseDepartments).values({ warehouseId: inserted.id, name: dept }).returning();
      ids.push(d.id);
    }
    deptIds.set(inserted.id, ids);
  }
  console.log(`  ✓ ${whIds.length} skladišta + odjeli`);

  // 2. Companies
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const companyData = [
    { name: "Orbico Demo", slug: "orbico-demo", contactEmail: "demo@orbico.hr", contactPhone: "+38512345001" },
    { name: "Ralu Demo", slug: "ralu-demo", contactEmail: "demo@ralu.hr", contactPhone: "+38512345002" },
    { name: "Vindija Demo", slug: "vindija-demo", contactEmail: "demo@vindija.hr", contactPhone: "+38512345003" },
  ];

  const companyIds: number[] = [];
  for (const c of companyData) {
    const [inserted] = await db.insert(companies).values({
      name: c.name, slug: c.slug, address: "Demo adresa 1", city: "Zagreb",
      contactEmail: c.contactEmail, contactPhone: c.contactPhone,
    }).returning();
    companyIds.push(inserted.id);

    // Dispatcher per company
    await db.insert(users).values({
      companyId: inserted.id, email: `dispatcher@${c.slug}.hr`, passwordHash,
      firstName: "Dispečer", lastName: c.name.split(" ")[0], phone: c.contactPhone,
      role: "dispatcher",
    });
  }
  console.log(`  ✓ ${companyIds.length} firme + dispečeri`);

  // 3. Drivers (10)
  const driverData = [
    { first: "Marko", last: "Horvat", company: 0 },
    { first: "Ivan", last: "Kovačević", company: 0 },
    { first: "Ante", last: "Babić", company: 0 },
    { first: "Josip", last: "Marić", company: 0 },
    { first: "Tomislav", last: "Jurić", company: 1 },
    { first: "Petar", last: "Novak", company: 1 },
    { first: "Luka", last: "Knežević", company: 1 },
    { first: "Matej", last: "Vuković", company: 2 },
    { first: "Davor", last: "Šimić", company: 2 },
    { first: "Zdravko", last: "Perić", company: 2 },
  ];

  const driverIds: number[] = [];
  for (const d of driverData) {
    const email = `${d.first.toLowerCase()}.${d.last.toLowerCase()}@demo.hr`;
    const [inserted] = await db.insert(users).values({
      companyId: companyIds[d.company], email, passwordHash,
      firstName: d.first, lastName: d.last,
      phone: `+38591${rand(1000000, 9999999)}`, role: "driver",
    }).returning();
    driverIds.push(inserted.id);
  }
  console.log(`  ✓ ${driverIds.length} vozača`);

  // 4. Vehicles (5)
  const vehicleIds: number[] = [];
  const plates = ["ZG-1234-AB", "ZG-5678-CD", "ST-9012-EF", "RI-3456-GH", "OS-7890-IJ"];
  const types: ("truck" | "semi_trailer" | "van")[] = ["truck", "semi_trailer", "truck", "van", "semi_trailer"];
  for (let i = 0; i < 5; i++) {
    const [v] = await db.insert(vehicles).values({
      companyId: companyIds[i % 3], registrationPlate: plates[i], vehicleType: types[i],
    }).returning();
    vehicleIds.push(v.id);
  }
  console.log(`  ✓ ${vehicleIds.length} vozila`);

  // 5. Historical checkins (200)
  const cargoTypes: ("frozen" | "chilled" | "ambient" | "mixed")[] = ["frozen", "chilled", "ambient", "mixed"];
  const now = Date.now();

  for (let i = 0; i < 200; i++) {
    const daysAgo = rand(0, 30);
    const hour = rand(6, 20);
    const minute = rand(0, 59);
    const enteredAt = new Date(now - daysAgo * 86400000);
    enteredAt.setHours(hour, minute, 0, 0);

    const whIdx = rand(0, whIds.length - 1);
    const warehouseId = whIds[whIdx];
    const chain = whChains[whIdx];
    const driverId = pick(driverIds);
    const waitMins = randomWaitMinutes(chain, hour);
    const exitedAt = new Date(enteredAt.getTime() + waitMins * 60000);
    const depts = deptIds.get(warehouseId) ?? [];

    await db.insert(checkins).values({
      driverId,
      vehicleId: pick(vehicleIds),
      warehouseId,
      departmentId: depts.length > 0 ? pick(depts) : null,
      cargoType: pick(cargoTypes),
      enteredAt,
      exitedAt,
      waitMinutes: waitMins,
      source: "geofence_auto",
      status: "completed",
    });
  }
  console.log("  ✓ 200 historijskih check-ina");

  // 6. Active checkins (10 — drivers currently waiting)
  const activeDrivers = driverIds.slice(0, 10);
  const activeCheckinIds: number[] = [];
  for (let i = 0; i < 10; i++) {
    const minutesAgo = rand(5, 180);
    const enteredAt = new Date(now - minutesAgo * 60000);
    const whIdx = rand(0, whIds.length - 1);
    const depts = deptIds.get(whIds[whIdx]) ?? [];
    const [c] = await db.insert(checkins).values({
      driverId: activeDrivers[i],
      vehicleId: vehicleIds[i % vehicleIds.length],
      warehouseId: whIds[whIdx],
      departmentId: depts.length > 0 ? pick(depts) : null,
      cargoType: pick(cargoTypes),
      enteredAt,
      source: "geofence_auto",
      status: "waiting",
    }).returning();
    activeCheckinIds.push(c.id);
  }
  console.log("  ✓ 10 aktivnih check-ina");

  // 7. Alerts (5)
  const alertTypes: ("long_wait" | "driver_stuck" | "rollover" | "capacity_spike")[] = ["long_wait", "driver_stuck", "rollover", "capacity_spike", "long_wait"];
  const alertMessages = [
    "Prosječno čekanje na Kaufland DC Jastrebarsko je 145 min",
    "Vozač Marko Horvat čeka 195 min na Lidl DC Perušić",
    "Rollover: Ivan Kovačević na Konzum DC Zagreb — preraspoređeno za 10.04.2026.",
    "Kapacitet na Tommy DC Split je prekoračen — 15 kamiona čeka",
    "Prosječno čekanje na Lidl DC Šenkovec je 132 min",
  ];
  for (let i = 0; i < 5; i++) {
    await db.insert(alerts).values({
      companyId: companyIds[i % 3],
      warehouseId: whIds[i],
      alertType: alertTypes[i],
      message: alertMessages[i],
    });
  }
  console.log("  ✓ 5 alertova");

  // 8. Rollovers (2)
  for (let i = 0; i < 2; i++) {
    const checkinId = activeCheckinIds[i];
    await db.update(checkins).set({ status: "rolled_over" }).where(eq(checkins.id, checkinId));

    // Use direct SQL-like approach
    await db.insert(rolloverOrders).values({
      originalCheckinId: checkinId,
      warehouseId: whIds[i],
      driverId: activeDrivers[i],
      reason: i === 0 ? "not_accepted" : "late_arrival",
      rescheduledDate: new Date(now + 86400000),
      priority: "high",
    });
  }
  console.log("  ✓ 2 rollover-a");

  console.log("\n✅ Demo seed završen!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Greška pri seedanju:", err);
  process.exit(1);
});
