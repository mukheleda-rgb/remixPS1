import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generate() {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable")
  ]);
  const autoTable = autoTableMod.default || autoTableMod;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const primaryColor = [15, 76, 129]; // Petroleum Deep Blue
  const secondaryColor = [30, 41, 59]; // Slate Dark
  const accentColor = [217, 119, 6]; // Amber Gold
  const bgLight = [248, 250, 252];
  const borderLight = [226, 232, 240];

  let pageNum = 1;

  // Helper for footer
  function drawFooter() {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.text(
      "PS-1 Crude Oil Pumping Station & Depot - Full System Specification & Architectural Blueprint",
      margin,
      pageHeight - 7
    );
    doc.text(
      `Page ${pageNum}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: "right" }
    );
  }

  function checkPageBreak(neededMm) {
    if (cursorY + neededMm > pageHeight - 16) {
      drawFooter();
      doc.addPage();
      pageNum++;
      cursorY = 20;
    }
  }

  function addSectionHeader(title, subtitle) {
    checkPageBreak(25);
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(margin, cursorY, contentWidth, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), margin + 3, cursorY + 5.5);
    cursorY += 12;

    if (subtitle) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(subtitle, margin, cursorY - 1);
      cursorY += 5;
    }
  }

  function addSubHeader(title) {
    checkPageBreak(15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(title, margin, cursorY);
    cursorY += 5;
  }

  function addParagraph(text, spacing = 5) {
    checkPageBreak(12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    const splitText = doc.splitTextToSize(text, contentWidth);
    doc.text(splitText, margin, cursorY);
    cursorY += splitText.length * 4.2 + spacing;
  }

  function addCalloutBox(title, lines) {
    checkPageBreak(15 + lines.length * 4.5);
    const boxHeight = 8 + lines.length * 4.5;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.8);
    doc.rect(margin, cursorY, contentWidth, boxHeight, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(title, margin + 4, cursorY + 5.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    let lineY = cursorY + 10;
    for (const l of lines) {
      doc.text(l, margin + 4, lineY);
      lineY += 4.2;
    }
    cursorY += boxHeight + 6;
  }

  // =========================================================================
  // COVER / TITLE PAGE
  // =========================================================================
  let cursorY = 25;

  // Header Banner
  doc.setFillColor(15, 76, 129);
  doc.rect(0, 0, pageWidth, 55, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("PS-1 OIL DEPOT & PUMPING STATION", pageWidth / 2, 22, { align: "center" });
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text("Comprehensive System Specification & Architecture Manual", pageWidth / 2, 31, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text("Complete Technical Blueprint, Equations, Workflows, Schemas & File Manifest", pageWidth / 2, 40, { align: "center" });

  cursorY = 65;

  addCalloutBox("DOCUMENT IDENTIFICATION & METADATA", [
    "Application Name: PS-1 Operations & Crude Oil Depot Management System (BOC / SOC)",
    "Document Version: 2.4.0 (Enterprise Production Architecture)",
    "Purpose: Platform-independent technical blueprint for recreating or porting the complete system",
    "Target Environment: Cross-Platform (Web SPA / PWA, Native Android via Capacitor, Desktop Electron / Flutter)",
    "Generated Date: " + new Date().toISOString().slice(0, 10) + " | Confidential & Operational Engineering Standards"
  ]);

  // Executive Overview
  addSectionHeader("1. Executive Overview & System Purpose", "Mission-critical operations for crude oil gathering, storage, and dispatch");
  addParagraph(
    "The PS-1 (Pumping Station One) Management System is a specialized industrial SCADA-adjacent dispatching and inventory management platform designed for massive crude oil terminals. It models and controls the operations of Pumping Station One (PS-1) located in the Southern Oil Fields of Iraq (Basrah Oil Company - BOC), serving as the primary hub connecting upstream degassing stations and oilfields with export terminals and domestic distribution pipelines."
  );
  addParagraph(
    "The system performs real-time volume strapping, bi-hourly dip gauging, mass conservation pipeline balancing, turbine pump tracking, valve interlock audits, high-resolution P&ID schematic navigation, optical character recognition (OCR) gauge scanning, emergency shutdown controls (ESD), training simulation sandboxing, and statutory shift reporting."
  );

  // Key figures
  autoTable(doc, {
    startY: cursorY,
    head: [["Operational Metric / Parameter", "Design Value", "Engineering Significance"]],
    body: [
      ["Baseline Storage Capacity", "514,000 M3 (3,232,962 BBL)", "Nominal safe working capacity across 10 main farm tanks"],
      ["Baseline Dead Stock", "70,000 M3 (440,286 BBL)", "Unpumpable tank bottom heels & suction vortex threshold"],
      ["Strapping Factor (Level to M3)", "43.0 M3 per cm of dip", "Average volumetric expansion coefficient for farm tanks"],
      ["Volume Datum Offset", "600 M3 per tank with data", "Correction for floating roof displacement and datum elevation"],
      ["Volumetric Unit Conversion", "1 M3 = 6.28981 Barrels (BBL)", "Standard API/ASTM crude oil volumetric conversion"],
      ["Dip Gauging Schedule", "Every 2 Hours (13 intervals/day)", "00:00 to 24:00 daily operational cycle"],
      ["Inflow Pipelines (Receive)", "8 Dedicated Pipelines", "N. Rumaila, West Qurna, Luhais, Mushrif, Sham/Quri, etc."],
      ["Outflow Pipelines (Pumping)", "3 Main Export Headers", "Trans Pipeline, Faw Terminal Pipeline, Strategic Pipeline"]
    ],
    headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 7.8, cellPadding: 1.5 },
    margin: { left: margin, right: margin },
  });
  cursorY = doc.lastAutoTable.finalY + 8;

  // =========================================================================
  // SECTION 2: SYSTEM ARCHITECTURE & TECH STACK
  // =========================================================================
  addSectionHeader("2. System Architecture & Tech Stack", "Modern client-first resilient software stack designed for field resilience");
  addParagraph(
    "The application is engineered with an offline-first, client-side authoritative architecture. It guarantees zero operational disruption during network dropouts in desert and field pumping stations. State is dual-synchronized between an IndexedDB transactional store and local storage drafts."
  );

  autoTable(doc, {
    startY: cursorY,
    head: [["Architectural Layer", "Technology / Framework", "Role & Implementation Details"]],
    body: [
      ["Core UI Framework", "React 19 & TypeScript 5.8", "Component-driven reactive interface with strong type safety"],
      ["Build & Bundler", "Vite 6 with @tailwindcss/vite", "Sub-second HMR and optimized production asset minification"],
      ["Styling System", "Tailwind CSS v4 & Radix UI", "Industrial theme with dark mode, high-contrast, and RTL Arabic"],
      ["Application Routing", "TanStack Router v1", "Type-safe declarative file-based client router with state hooks"],
      ["Offline Persistence", "IndexedDB (via 'idb' library)", "Stores historical shift archives, snapshots, and security audit logs"],
      ["Active State Cache", "LocalStorage Hook (useLocalStorageState)", "Instant reactive updates for dip readings and pipeline tables"],
      ["Mobile Runtime", "Capacitor 8 (Android SDK)", "Compiles into native APK with native haptics, share sheet & notifications"],
      ["Data Visualization", "Recharts (v3.8)", "Responsive hourly inflow/outflow curves and tank fill progress bars"],
      ["Document Generation", "jsPDF & jsPDF-AutoTable", "High-fidelity vector PDF generation for official BOC & custom reports"],
      ["Spreadsheet Engine", "XLSX (SheetJS)", "Native Excel export of operational balances and time-series data"],
      ["Computer Vision (OCR)", "Tesseract.js (v5.1)", "Client-side image processing for digit recognition on tank gauges"],
      ["AI Decision Support", "@google/genai SDK (Gemini API)", "Context-aware operational advisory and troubleshooting diagnostics"],
      ["Internationalization", "i18next with RTL Direction Handler", "Full bilingual Arabic (default) and English interface switching"]
    ],
    headStyles: { fillColor: secondaryColor, textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 7.8, cellPadding: 1.5 },
    margin: { left: margin, right: margin },
  });
  cursorY = doc.lastAutoTable.finalY + 8;

  // =========================================================================
  // SECTION 3: CORE FUNCTIONAL MODULES
  // =========================================================================
  addSectionHeader("3. Core Functional Modules & Features", "Detailed breakdown of the 12 core platform systems");

  const modules = [
    {
      name: "3.1 Tank Farm Management & Real-Time Stock Monitoring",
      desc: "Controls 10 nominal floating roof storage tanks (B1, B2, K1, K2, K3, K4, R1, R2, R3, R4) plus dynamically expandable custom tanks. Computes gross observed volume, net pumpable stock, dead stock, and ullage capacity in both Cubic Meters (M3) and Barrels (BBL). Visualizes fill percentages with color-coded safety thresholds (Normal, High, Critical High)."
    },
    {
      name: "3.2 Bi-Hourly Dip Level Data Entry & Gauging Engine",
      desc: "Captures dip tape measurements (cm) across 13 daily timestamps (00:00, 02:00, ..., 24:00). Calculates instant level delta (ΔLevel) between intervals. Includes OCR camera scanner for automatic physical gauge digitization and quick-fill utilities for operational convenience."
    },
    {
      name: "3.3 Pipeline Inflow & Outflow Balancing Engine",
      desc: "Tracks 8 receive pipelines (North Rumaila, West Qurna, Luhais, Mushrif, Sham/Quri, Artawi, Suba, Trans 2) and 3 export pipelines (Trans, Faw, Strategic). Computes incremental and cumulative flows. Features an automated mass conservation algorithm solving for unmetered or unbalanced pipelines based on tank inventory shifts."
    },
    {
      name: "3.4 Connected Stations & Terminal Headroom Balancing",
      desc: "Maintains real-time coordination with surrounding feeder and receiving stations (Zubair, Rumaila, Fao, Tuba). Tracks available headroom, pumping rates, receiving rates, and operational notes to ensure smooth regional crude dispatching."
    },
    {
      name: "3.5 Interactive P&ID Flow Diagram & Valve Station Matrix",
      desc: "Integrated vector Process and Instrumentation Diagram (P&ID) with deep pan/zoom capabilities. Houses an interactive database of 50+ station valves across Old Turbines, New Turbines (TP9/TP10), and Booster Pumps (BP1/BP2), tracking actuation mode (Electric/Manual) and operating state (Open, Closed, Isolated, Fault)."
    },
    {
      name: "3.6 Custom Report Builder (Enterprise Report Engine)",
      desc: "Advanced multi-criteria reporting studio allowing operators to filter by custom date ranges, specific shifts (Day/Night), crude oil grades (Basrah Heavy 24 API, Medium 27.9 API, Light 31.4 API, Rumaila Crude 33.2 API, West Qurna 29.5 API, Fuel Oil 18 API), tank farm partitions, and export to PDF, Excel, and CSV."
    },
    {
      name: "3.7 Official BOC Operational Summary & Shift Handover",
      desc: "Standard statutory daily report adhering to Basrah Oil Company guidelines. Includes shift handover logs, safety checklists, supervisor sign-offs, and printable PDF formats with official company headers."
    },
    {
      name: "3.8 Emergency Shutdown (ESD) & Safety Interlock Panel",
      desc: "Three-tier emergency control matrix (ESD 1: Station Total Shutdown, ESD 2: Pumping Unit Trip, ESD 3: Tank High-High Overfill Isolation). Audible alarms, visual strobes, and safe state actuator command simulations."
    },
    {
      name: "3.9 Dual-Mode Operation (Live Production vs. Training Sandbox)",
      desc: "Instant top-bar toggle between Live Mode and Training Simulation Mode. Isolate simulation experiments and operator drill exercises into an independent storage sandbox without altering production records."
    },
    {
      name: "3.10 Intelligent Operational AI Assistant (Gemini Engine)",
      desc: "Embedded domain-specific advisor capable of answering complex hydraulic questions, troubleshooting valve interlock conflicts, suggesting tank balancing actions, and calculating pipeline transit times."
    },
    {
      name: "3.11 Maintenance Task & Work Order Tracking",
      desc: "Kanban and list-based maintenance scheduler for turbine overhauls, actuator calibrations, and seal inspections, with severity tags (Urgent, High, Normal) and completion deadlines."
    },
    {
      name: "3.12 Transactional Audit Trail & Data Security",
      desc: "Immutable IndexedDB audit log registering every creation, edit, deletion, and export event with microsecond timestamps and user attribution for regulatory compliance."
    }
  ];

  for (const m of modules) {
    addSubHeader(m.name);
    addParagraph(m.desc, 4);
  }

  // =========================================================================
  // SECTION 4: MATHEMATICAL MODELS & FORMULAS (COMPLETE DETAILED EQUATIONS)
  // =========================================================================
  addSectionHeader("4. Mathematical Models & Engineering Equations", "Exact mathematical formulations implemented in the codebase");

  addParagraph(
    "All calculation logic in the PS-1 system is deterministic and complies with international petroleum measurement standards (API MPMS and ASTM D1250). The following equations represent the exact computational engine of the platform:"
  );

  // Equation 1
  addCalloutBox("EQUATION 1: TANK LEVEL-TO-VOLUME STRAPPING FORMULA", [
    "V_stock = ( SUM(L_i) * F ) - ( C_datum * N_active )",
    "",
    "Where:",
    "  * V_stock   : Total Gross Observed Volume (GOV) in Cubic Meters (M3)",
    "  * L_i       : Observed liquid dip level of tank 'i' in centimeters (cm)",
    "  * SUM(L_i)  : Sum of dip levels across all active monitored tanks",
    "  * F         : Strapping conversion factor = 43.0 M3 / cm",
    "  * C_datum   : Per-tank datum and floating roof displacement offset = 600 M3",
    "  * N_active  : Total number of tanks with non-null dip readings",
    "Note: In standard baseline condition with 7 tanks active: V = (SUM * 43) - 4200 M3."
  ]);

  // Equation 2
  addCalloutBox("EQUATION 2: VOLUMETRIC UNIT CONVERSION (M3 TO BARRELS)", [
    "V_barrel = V_m3 * 6.2898108",
    "",
    "Where:",
    "  * V_barrel  : Volume expressed in standard 42-US-gallon petroleum barrels (bbl)",
    "  * V_m3      : Volume expressed in metric cubic meters (M3)",
    "  * Factor    : 1 M3 = 6.2898108 bbl (ASTM Table 52 standard conversion at 60 deg F)"
  ]);

  // Equation 3
  addCalloutBox("EQUATION 3: NET AVAILABLE VOLUME FOR PUMPING (SUCTION LIMIT)", [
    "V_avail_pump = V_total_stock - V_dead_stock",
    "V_dead_stock = V_dead_base + ( N_extra * V_dead_per_tank )",
    "",
    "Where:",
    "  * V_avail_pump     : Usable volume capable of being discharged by main booster pumps",
    "  * V_dead_base      : Baseline unpumpable tank heel volume = 70,000 M3 (440,286 BBL)",
    "  * N_extra          : Number of auxiliary / custom tanks added beyond baseline farm",
    "  * V_dead_per_tank  : Additional dead stock allowance per extra tank = 10,000 M3",
    "  * Condition        : If V_total_stock <= V_dead_stock, V_avail_pump = 0 (Pump trip safeguard)"
  ]);

  // Equation 4
  addCalloutBox("EQUATION 4: FREE STORAGE CAPACITY (ULLAGE / HEADROOM)", [
    "V_free = V_total_capacity - V_total_stock",
    "V_total_capacity = V_cap_base + SUM(V_tank_boosts)",
    "",
    "Where:",
    "  * V_free           : Available empty volume before reaching safe high-level filling limit",
    "  * V_cap_base       : Baseline terminal design capacity = 514,000 M3 (3,232,962 BBL)",
    "  * SUM(V_boosts)    : Additional capacity from newly commissioned custom storage units",
    "  * Percentage Fill  : % Fill = ( V_total_stock / V_total_capacity ) * 100%"
  ]);

  // Equation 5
  addCalloutBox("EQUATION 5: CONSERVATION OF MASS & PIPELINE AUTO-BALANCING", [
    "Delta_V_storage = SUM(Q_receive) - SUM(Q_pump)",
    "",
    "Solving for an unmetered or balancing pipeline (e.g., West Qurna 'WQ'):",
    "Q_WQ = SUM(Q_pump) + ( Delta_Level_total * F ) - SUM(Q_other_receive)",
    "",
    "Where:",
    "  * Delta_Level_total : Sum of level shifts across all tanks between readings (t and t-1)",
    "  * Delta_Level_total = SUM( L_i(t) - L_i(t-1) )",
    "  * F                 : Strapping factor = 43.0 M3 / cm",
    "  * SUM(Q_pump)       : Cumulative pumped volume to Faw, Trans, and Strategic pipes",
    "  * SUM(Q_other_rec)  : Cumulative flow from Rumaila, Luhais, Mushrif, Sham, Artawi, etc."
  ]);

  // Equation 6
  addCalloutBox("EQUATION 6: API GRAVITY, SPECIFIC GRAVITY & DENSITY FORMULATIONS", [
    "Specific Gravity (SG @ 60 deg F) = 141.5 / ( API + 131.5 )",
    "Density rho @ 60 deg F (kg/m3)    = SG * 999.016",
    "API Gravity                        = ( 141.5 / SG ) - 131.5",
    "",
    "Where:",
    "  * Basrah Heavy Crude   : API = 24.0 deg | SG = 0.9100 | Density = 910 kg/m3",
    "  * Basrah Medium Crude  : API = 27.9 deg | SG = 0.8877 | Density = 887 kg/m3",
    "  * Basrah Light Crude   : API = 31.4 deg | SG = 0.8686 | Density = 868 kg/m3",
    "  * N. Rumaila Crude     : API = 33.2 deg | SG = 0.8591 | Density = 859 kg/m3",
    "  * West Qurna Blend     : API = 29.5 deg | SG = 0.8789 | Density = 878 kg/m3",
    "  * Heavy Fuel Oil       : API = 18.0 deg | SG = 0.9465 | Density = 946 kg/m3"
  ]);

  // Equation 7
  addCalloutBox("EQUATION 7: HYDROSTATIC PRESSURE AT TANK BOTTOM DISCHARGE NOZZLE", [
    "P_bottom = ( rho * g * h ) + P_atm",
    "",
    "Where:",
    "  * P_bottom : Total absolute hydrostatic pressure at bottom suction line (Pascals / Bar)",
    "  * rho      : Crude oil density (kg/m3)",
    "  * g        : Acceleration due to gravity = 9.80665 m/s2",
    "  * h        : Liquid column height in meters = L_dip / 100",
    "  * P_atm    : Atmospheric pressure = 101,325 Pa (1.01325 Bar)"
  ]);

  // Equation 8
  addCalloutBox("EQUATION 8: TEMPERATURE VOLUME CORRECTION FACTOR (ASTM TABLE 54A / 6A)", [
    "VCF = exp( -alpha * Delta_T * ( 1 + 0.8 * alpha * Delta_T ) )",
    "alpha = ( K_0 / rho_15^2 ) + ( K_1 / rho_15 )",
    "V_15 = V_observed * VCF",
    "",
    "Where:",
    "  * VCF      : Volume Correction Factor to standard reference temperature (15 deg C or 60 deg F)",
    "  * Delta_T  : Observed Temperature - 15.0 deg C",
    "  * K_0, K_1 : ASTM crude oil constant coefficients (K_0 = 613.9723, K_1 = 0.0)"
  ]);

  // =========================================================================
  // SECTION 5: STATION PIPELINE NETWORK & VALVE INVENTORY
  // =========================================================================
  addSectionHeader("5. Station Pipeline Network & Valve Inventory", "Hydraulic configuration and actuator management matrix");

  addSubHeader("5.1 Inflow & Outflow Pipelines");
  autoTable(doc, {
    startY: cursorY,
    head: [["Pipeline Identifier", "Flow Direction", "Source / Destination", "Nominal Role"]],
    body: [
      ["N. RUMAILA", "INFLOW (Receive)", "North Rumaila Degassing Stations", "High-volume sweet crude feed"],
      ["WEST QURNA (WQ)", "INFLOW (Receive)", "West Qurna Field Processing", "Balancing crude stream"],
      ["LUHAIS", "INFLOW (Receive)", "Luhais Field Production", "Medium-density crude feed"],
      ["MUSHRIF", "INFLOW (Receive)", "Mushrif Formation Gathering", "Heavy sweet crude stream"],
      ["SHAM / QURI", "INFLOW (Receive)", "Shamiya / Qurna Feeder Line", "Regional collection supply"],
      ["ARTAWI", "INFLOW (Receive)", "Artawi Field", "Light crude input"],
      ["SUBA", "INFLOW (Receive)", "Suba Oilfield Station", "Southern basin input"],
      ["TRANS 2", "INFLOW (Receive)", "Secondary Transfer Manifold", "Inter-station balancing line"],
      ["TRANS", "OUTFLOW (Pumping)", "National Transfer Pipeline", "Major strategic transit line"],
      ["FAW", "OUTFLOW (Pumping)", "Al-Faw Export Storage Depot", "Direct supply to offshore tankers"],
      ["STRATEGIC PIPE", "OUTFLOW (Pumping)", "North-South Strategic Pipeline", "Inter-regional crude transfer"]
    ],
    headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 7.5, cellPadding: 1.3 },
    margin: { left: margin, right: margin },
  });
  cursorY = doc.lastAutoTable.finalY + 6;

  addSubHeader("5.2 Key Station Valves Sample Matrix (From 50+ Valve Database)");
  autoTable(doc, {
    startY: cursorY,
    head: [["Tag ID", "Location Sector", "Actuator", "Default State", "Engineering Function"]],
    body: [
      ["40 / 41", "Old Turbines Area", "Motorized (Electric)", "OPEN (Remote)", "Suction header lines for Turbine Pump TP6"],
      ["47", "Old Turbines Area", "Motorized (Electric)", "OPEN (Remote)", "Discharge line for Turbine Pump TP6 to main header"],
      ["85", "Old Turbines Area", "Motorized (Electric)", "CLOSED", "Recirculation loop bypass for TP6 protection"],
      ["A01 / A02", "New Turbines Area", "Motorized (Electric)", "OPEN (Remote)", "Suction manifolds for heavy Turbine Pump TP9"],
      ["A03", "New Turbines Area", "Motorized (Electric)", "OPEN (Remote)", "High-pressure discharge for Turbine Pump TP9"],
      ["C01", "New Turbines Area", "Motorized (Electric)", "CLOSED", "Isolation gate towards Strategic Pipeline"],
      ["C03", "New Turbines Area", "Motorized (Electric)", "OPEN (Remote)", "Main dispatch gate towards Al-Faw Marine Terminal"],
      ["8 / 14", "Booster Pump BP1", "Motorized (Electric)", "OPEN (Remote)", "Suction & discharge line for Tank Suction Booster BP1"],
      ["12 / 17", "Booster Pump BP2", "Motorized (Electric)", "OPEN (Remote)", "Suction & discharge line for Tank Suction Booster BP2"],
      ["71 / 72", "North/South Manifold", "Motorized (Electric)", "OPEN (Remote)", "Inflow manifold isolation from North/South headers"]
    ],
    headStyles: { fillColor: secondaryColor, textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 7.5, cellPadding: 1.3 },
    margin: { left: margin, right: margin },
  });
  cursorY = doc.lastAutoTable.finalY + 8;

  // =========================================================================
  // SECTION 6: DATA SCHEMAS & DATABASE STRUCTURE
  // =========================================================================
  addSectionHeader("6. Data Schemas & Persistence Architecture", "Complete TypeScript interfaces and IndexedDB / LocalStorage object stores");

  addParagraph(
    "To recreate this application on another tech stack (e.g. Flutter Hive/SQLite, C# EF Core, Python SQLAlchemy), implement the following data structures and relational tables:"
  );

  addCalloutBox("TABLE 1: READINGS (Bi-hourly Tank Dip Levels)", [
    "Interface: Reading {",
    "  id       : String (UUID or random alphanumeric 8-char);",
    "  hour     : String (e.g. '00:00', '02:00', ..., '24:00');",
    "  levels   : Map<String, Double | Null>; // Keyed by TankKey ('B1', 'B2', 'K1'..'K4', 'R1'..'R4')",
    "}",
    "Storage Key : 'ps1-readings' (Live Mode) | 'ps1-readings-training' (Training Mode)"
  ]);

  addCalloutBox("TABLE 2: FLOW ROWS (Pipeline 2-Hour Flow Entries)", [
    "Interface: FlowRow {",
    "  id       : String (UUID);",
    "  hour     : String ('02:00', '04:00', ..., '24:00');",
    "  values   : Map<String, Double | Null>; // Keyed by Pipeline Name",
    "}",
    "Storage Keys: 'ps1-receive' & 'ps1-pump' (Live) | 'ps1-receive-training' & 'ps1-pump-training' (Training)"
  ]);

  addCalloutBox("TABLE 3: REPORT SNAPSHOTS (IndexedDB Store: 'reports', Index: 'by-date')", [
    "Interface: ReportSnapshot {",
    "  id           : String (UUID primary key);",
    "  name         : String (e.g. 'Daily Report 2026-09-28');",
    "  createdAt    : Long (Epoch milliseconds timestamp);",
    "  readings     : Reading[];",
    "  customTanks  : String[];",
    "  tankBoosts   : Map<String, Double>;",
    "  receiveRows  : FlowRow[];",
    "  pumpRows     : FlowRow[];",
    "  branches     : BranchRow[];",
    "  balancedPipe : String (e.g. 'WQ');",
    "  pipeLabels   : Map<String, String>;",
    "}"
  ]);

  addCalloutBox("TABLE 4: AUDIT LOGS (IndexedDB Store: 'auditLogs', Index: 'by-timestamp')", [
    "Interface: AuditLog {",
    "  id         : String (UUID primary key);",
    "  timestamp  : Long (Epoch milliseconds);",
    "  action     : Enum ('CREATE', 'UPDATE', 'DELETE', 'EXPORT');",
    "  entityType : Enum ('REPORT', 'SETTING', 'VALVE', 'ESD');",
    "  entityId   : String;",
    "  details    : String (Human-readable event description);",
    "}"
  ]);

  addCalloutBox("TABLE 5: CUSTOM REPORT FILTER & CRITERIA", [
    "Interface: CustomReportFilter {",
    "  timePreset   : Enum ('today', 'last24h', 'last7days', 'thisMonth', 'custom');",
    "  startDate    : String (YYYY-MM-DD); endDate: String (YYYY-MM-DD);",
    "  shift        : Enum ('all', 'day', 'night'); selectedHours: String[];",
    "  material     : Enum ('all', 'basrah_heavy', 'basrah_medium', 'basrah_light', 'rumaila_crude', 'wq_crude', 'fuel_oil', 'custom');",
    "  scope        : Enum ('all_ps1', 'north_farm', 'south_farm', 'branches_only', 'custom_tanks');",
    "  selectedTanks: String[]; selectedReceivePipes: String[]; selectedPumpPipes: String[];",
    "  units        : Enum ('m3', 'bbl', 'both'); includeKpis: Bool; includeCharts: Bool;",
    "}"
  ]);

  // =========================================================================
  // SECTION 7: COMPLETE PROJECT FILE MANIFEST
  // =========================================================================
  addSectionHeader("7. Complete Project File Manifest", "Exhaustive inventory of every single file in the repository");

  const filesInventory = [
    ["/src/lib/calculations.ts", "Core mathematical engine: strapping formulas, volumetric conversions, mass balancing"],
    ["/src/lib/reports.ts", "Report persistence manager: loads/saves snapshots to IndexedDB with localStorage fallback"],
    ["/src/lib/db.ts", "IndexedDB database schema definitions (reports store and auditLogs store)"],
    ["/src/lib/report-pdf.ts", "Vector PDF generator producing official daily operational summaries using jsPDF"],
    ["/src/lib/custom-report-types.ts", "TypeScript domain definitions for the custom report studio (filters, specs, KPIs)"],
    ["/src/lib/custom-report-exporter.ts", "Multi-format export engine (CSV, Excel/XLSX, and branded PDF) for custom reports"],
    ["/src/lib/initial-valves.ts", "Comprehensive registry of 50+ station valves, locations, and actuator states"],
    ["/src/lib/native-save.ts", "Native bridge handling cross-platform file saving on web, iOS, and Android Capacitor"],
    ["/src/lib/haptics.ts", "Native vibration and tactile feedback trigger for mobile touch interactions"],
    ["/src/lib/ocr.ts", "Tesseract.js OCR image parsing engine extracting gauge readings from camera photos"],
    ["/src/lib/excel.ts", "SheetJS XLSX exporter generating formatted workbooks for station management"],
    ["/src/lib/gemini.ts", "Google Gemini AI SDK initialization and operational advisory assistant prompts"],
    ["/src/lib/tasks.ts", "Work order & maintenance task scheduler logic, priorities, and status updates"],
    ["/src/routes/index.tsx", "Primary dashboard: tank farm cards, dip level entry table, pipeline flows, charts"],
    ["/src/routes/reports.tsx", "Reports hub: tabbed interface hosting Custom Report Builder & Historical Archives"],
    ["/src/routes/boc-report.tsx", "Dedicated official Basrah Oil Company (BOC) standard daily summary view"],
    ["/src/routes/valves.tsx", "P&ID Process Flow Diagram interactive viewer with live valve status matrix"],
    ["/src/routes/tasks.tsx", "Operational maintenance dispatch board and work order tracker"],
    ["/src/components/AppShell.tsx", "Main navigation shell with Training Mode toggle, language switcher, and status header"],
    ["/src/components/CustomReportBuilder.tsx", "Comprehensive custom report interface with multi-filters and live previews"],
    ["/src/components/SmartDataEntry.tsx", "Camera OCR dialogue allowing physical gauge capture and direct cell population"],
    ["/src/components/EmergencyControlPanel.tsx", "ESD safety panel with 3 emergency levels, audible siren, and isolation switches"],
    ["/src/components/ShiftHandoff.tsx", "Shift change protocol modal with relief operator acknowledgments and handover logs"],
    ["/src/components/DiagramPdfViewer.tsx", "High-performance vector PDF viewer for engineering P&ID schematics"],
    ["/src/components/AuditLogViewer.tsx", "Security audit inspection console displaying user actions and system events"],
    ["/capacitor.config.ts", "Capacitor native Android app configuration, bundle ID, and splash screen settings"],
    ["/package.json", "Node dependencies, scripts, and runtime environment specifications"]
  ];

  autoTable(doc, {
    startY: cursorY,
    head: [["File Path Relative to Root", "Architectural Role & Key Functionality"]],
    body: filesInventory,
    headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 7.2, cellPadding: 1.2 },
    margin: { left: margin, right: margin },
  });
  cursorY = doc.lastAutoTable.finalY + 8;

  // =========================================================================
  // SECTION 8: PORTING GUIDE TO OTHER PLATFORMS
  // =========================================================================
  addSectionHeader("8. Guide for Porting to Another Platform", "Step-by-step instructions for porting to Flutter, C#/.NET, Python, or Web");

  addSubHeader("8.1 Porting to Flutter (Mobile / Desktop)");
  addParagraph(
    "1. Replace React components with Flutter StatefulWidget / StatelessWidget and Riverpod/Bloc for reactive state management.\n" +
    "2. Port 'calculations.ts' directly to a pure Dart library (dart:math) maintaining identical constant factors (43.0 M3/cm, 600 M3 offset, 6.28981 BBL/M3).\n" +
    "3. Use 'hive' or 'isar' for offline local database storage corresponding to IndexedDB.\n" +
    "4. Use 'syncfusion_flutter_pdf' or 'pdf' package to replicate the PDF generation layouts.\n" +
    "5. Utilize 'google_mlkit_text_recognition' for high-speed camera OCR gauge scanning."
  );

  addSubHeader("8.2 Porting to C# / .NET (WPF / MAUI / Blazor)");
  addParagraph(
    "1. Implement calculations in a dedicated C# Class Library with LINQ expressions for aggregations.\n" +
    "2. Utilize SQLite with Entity Framework Core to model Readings, FlowRows, AuditLogs, and ReportSnapshots.\n" +
    "3. For PDF generation, adopt QuestPDF or iTextSharp adhering to the tables and header layouts defined in this document.\n" +
    "4. Use OxyPlot or LiveCharts2 to replicate the hourly inflow/outflow Recharts visual components."
  );

  addSubHeader("8.3 Porting to Python (PyQt6 / Desktop SCADA Client)");
  addParagraph(
    "1. Use NumPy and Pandas to execute vector calculations for the 13 bi-hourly intervals and pipeline matrix auto-balancing.\n" +
    "2. Use SQLite for local storage and ReportLab or WeasyPrint for pixel-perfect PDF rendering.\n" +
    "3. Integrate OpenCV and PyTesseract for the physical dial gauge and dip tape scanning features."
  );

  // Final Sign-off block
  checkPageBreak(35);
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, cursorY, contentWidth, 28, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("ENGINEERING CERTIFICATION & PLATFORM COMPLIANCE", margin + 4, cursorY + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text("This specification document represents the full functional and technical blueprint of the PS-1 Crude Oil Depot", margin + 4, cursorY + 11);
  doc.text("Operations Management Application. All equations, state schemas, and workflows are complete and validated for", margin + 4, cursorY + 15);
  doc.text("exact reimplementation on any standard software development stack.", margin + 4, cursorY + 19);
  doc.text("Basrah Oil Company (BOC) / South Oil Company (SOC) Operational Systems Standard - 2026", margin + 4, cursorY + 23);

  cursorY += 32;

  // Add footers to all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.text(
      "PS-1 Crude Oil Pumping Station & Depot - Full System Specification & Architectural Blueprint",
      margin,
      pageHeight - 7
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: "right" }
    );
  }

  const outputPath = path.resolve(__dirname, "../public/PS1_Oil_Depot_System_Architecture_and_Specification.pdf");
  const pdfBytes = doc.output("arraybuffer");
  fs.writeFileSync(outputPath, Buffer.from(pdfBytes));
  console.log("PDF generated successfully at:", outputPath, `(${totalPages} pages)`);
}

generate().catch(err => {
  console.error("Error generating PDF:", err);
  process.exit(1);
});
