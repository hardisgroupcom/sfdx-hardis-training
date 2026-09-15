#!/usr/bin/env node
/**
 * Generates the CSV files of the Helios baseline data workspace.
 *
 * The data is deterministic: the same seed always produces the same records, so
 * two learners on two continents see the same numbers in the same screenshots.
 * Run it from the repository root:
 *
 *     node scripts/build/data.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const OUT = path.join(ROOT, "scripts", "data", "HeliosBaseline");

// A tiny deterministic generator, so no dependency and no surprise.
let seed = 20260916;
function rand() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
const pick = (list) => list[Math.floor(rand() * list.length)];
const between = (min, max) => min + Math.floor(rand() * (max - min + 1));

const CITIES = [
  ["Sevilla", "Spain"], ["Malaga", "Spain"], ["Valencia", "Spain"],
  ["Lisboa", "Portugal"], ["Faro", "Portugal"],
  ["Marseille", "France"], ["Montpellier", "France"], ["Perpignan", "France"],
  ["Palermo", "Italy"], ["Bari", "Italy"], ["Cagliari", "Italy"],
  ["Athina", "Greece"], ["Thessaloniki", "Greece"]
];
const FIRST = ["Ana", "Luis", "Marta", "Pedro", "Sofia", "Diogo", "Chloe", "Hugo", "Elena", "Matteo",
  "Giulia", "Nikos", "Eleni", "Paulo", "Ines", "Thomas", "Camille", "Rafael", "Bianca", "Andreas"];
const LAST = ["Ferreira", "Costa", "Moreau", "Rossi", "Papadopoulos", "Lopez", "Garcia", "Bernard",
  "Conti", "Silva", "Dubois", "Marino", "Nikolaou", "Almeida", "Sanchez", "Leroy"];
const SUFFIX = ["Rooftops", "Energy Coop", "Residences", "Homes", "Estates", "Properties",
  "Solar Club", "Housing", "Villas", "Terraces"];
const ROOFS = ["Tile", "Slate", "Flat", "Metal"];
const STATUSES = ["Planned", "Scheduled", "In Progress", "Completed"];

function csv(rows) {
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n") + "\n";
}

function isoDate(offsetDays) {
  const d = new Date(Date.UTC(2026, 0, 15));
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- Accounts
const accounts = [];
for (let i = 1; i <= 40; i++) {
  const [city, country] = pick(CITIES);
  accounts.push({
    Name: `${city} ${pick(SUFFIX)} ${String(i).padStart(2, "0")}`,
    Type: pick(["Customer - Direct", "Customer - Channel", "Prospect"]),
    Industry: pick(["Energy", "Construction", "Real Estate"]),
    BillingCity: city,
    BillingCountry: country,
    Phone: `+34 9${between(10, 99)} ${between(100, 999)} ${between(100, 999)}`,
    Description: "Seeded by the sfdx-hardis training. Not a real customer."
  });
}

// ---------------------------------------------------------------- Contacts
const contacts = [];
for (let i = 1; i <= 60; i++) {
  const account = accounts[i % accounts.length];
  const first = pick(FIRST);
  const last = pick(LAST);
  contacts.push({
    FirstName: first,
    LastName: last,
    Email: `${first.toLowerCase()}.${last.toLowerCase()}.${String(i).padStart(2, "0")}@helios-training.invalid`,
    Title: pick(["Owner", "Building manager", "Technical contact", "Co-owner"]),
    Phone: `+34 6${between(10, 99)} ${between(100, 999)} ${between(100, 999)}`,
    "Account.Name": account.Name
  });
}

// ----------------------------------------------------------- Opportunities
const opportunities = [];
for (let i = 1; i <= 25; i++) {
  const account = accounts[(i * 3) % accounts.length];
  opportunities.push({
    Name: `${account.Name} - Rooftop array ${String(i).padStart(2, "0")}`,
    StageName: pick(["Prospecting", "Proposal/Price Quote", "Negotiation/Review", "Closed Won"]),
    CloseDate: isoDate(between(-60, 120)),
    Amount: between(8, 95) * 1000,
    Type: "New Customer",
    "Account.Name": account.Name
  });
}

// ----------------------------------------------------------- Installations
// Crew_Size__c is deliberately left empty on every record: Level 2 lab 2 is
// built on "you cannot make a field required when the data does not have it".
const installations = [];
for (let i = 1; i <= 30; i++) {
  const account = accounts[(i * 5) % accounts.length];
  const status = i <= 8 ? "Completed" : i <= 12 ? "In Progress" : i <= 20 ? "Scheduled" : "Planned";
  installations.push({
    External_Id__c: `HEL-INST-${String(i).padStart(3, "0")}`,
    "Account__r.Name": account.Name,
    Status__c: status,
    Install_Date__c: isoDate(status === "Completed" ? between(-120, -20) : between(5, 90)),
    Roof_Type__c: pick(ROOFS),
    Crew_Size__c: "",
    Total_Capacity_kW__c: (between(30, 140) / 10).toFixed(2)
  });
}

// ----------------------------------------------------------- Panel batches
const panelBatches = [];
let batchNo = 0;
for (const inst of installations) {
  const count = between(2, 3);
  for (let b = 0; b < count && panelBatches.length < 80; b++) {
    batchNo++;
    panelBatches.push({
      External_Id__c: `HEL-BATCH-${String(batchNo).padStart(3, "0")}`,
      "Installation__r.External_Id__c": inst.External_Id__c,
      Quantity__c: between(8, 32),
      Arrival_Date__c: isoDate(between(-90, 60)),
      Serial_Prefix__c: `HS${between(2024, 2026)}-${String(between(1, 99)).padStart(2, "0")}`,
      Cost__c: (between(900, 4800)).toFixed(2)
    });
  }
}
while (panelBatches.length < 80) {
  batchNo++;
  const inst = installations[panelBatches.length % installations.length];
  panelBatches.push({
    External_Id__c: `HEL-BATCH-${String(batchNo).padStart(3, "0")}`,
    "Installation__r.External_Id__c": inst.External_Id__c,
    Quantity__c: between(8, 32),
    Arrival_Date__c: isoDate(between(-90, 60)),
    Serial_Prefix__c: `HS${between(2024, 2026)}-${String(between(1, 99)).padStart(2, "0")}`,
    Cost__c: (between(900, 4800)).toFixed(2)
  });
}

fs.mkdirSync(OUT, { recursive: true });
const files = {
  "Account.csv": accounts,
  "Contact.csv": contacts,
  "Opportunity.csv": opportunities,
  "Installation__c.csv": installations,
  "Panel_Batch__c.csv": panelBatches
};
for (const [name, rows] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), csv(rows), "utf8");
  console.log(`${name}: ${rows.length} records`);
}
console.log(`Written to ${path.relative(ROOT, OUT)}`);
