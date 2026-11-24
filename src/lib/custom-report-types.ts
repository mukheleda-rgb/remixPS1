import { Reading, FlowRow } from "./calculations";
import { BranchRow } from "@/components/BranchesTable";

export type ReportTimePreset = "today" | "last24h" | "last7days" | "thisMonth" | "custom";

export type ShiftType = "all" | "day" | "night";

export type MaterialType =
  | "all"
  | "basrah_heavy"
  | "basrah_medium"
  | "basrah_light"
  | "rumaila_crude"
  | "wq_crude"
  | "fuel_oil"
  | "custom";

export interface MaterialSpec {
  id: MaterialType;
  nameAr: string;
  nameEn: string;
  apiGravity: number;
  density: number; // kg/m³
  sulfurPct: number;
  tempC: number;
  color: string;
}

export const MATERIAL_SPECS: Record<MaterialType, MaterialSpec> = {
  all: {
    id: "all",
    nameAr: "جميع المواد والمنتجات (مزيج المستودع)",
    nameEn: "All Products (Depot Blend)",
    apiGravity: 28.5,
    density: 884,
    sulfurPct: 3.1,
    tempC: 32,
    color: "#3b82f6",
  },
  basrah_heavy: {
    id: "basrah_heavy",
    nameAr: "نفط خام البصرة الثقيل (Basrah Heavy)",
    nameEn: "Basrah Heavy Crude Oil",
    apiGravity: 24.0,
    density: 910,
    sulfurPct: 3.8,
    tempC: 35,
    color: "#78350f",
  },
  basrah_medium: {
    id: "basrah_medium",
    nameAr: "نفط خام البصرة المتوسط (Basrah Medium)",
    nameEn: "Basrah Medium Crude Oil",
    apiGravity: 27.9,
    density: 887,
    sulfurPct: 3.0,
    tempC: 33,
    color: "#b45309",
  },
  basrah_light: {
    id: "basrah_light",
    nameAr: "نفط خام البصرة الخفيف (Basrah Light)",
    nameEn: "Basrah Light Crude Oil",
    apiGravity: 31.4,
    density: 868,
    sulfurPct: 2.1,
    tempC: 30,
    color: "#eab308",
  },
  rumaila_crude: {
    id: "rumaila_crude",
    nameAr: "خام حقل الرميلة الشمالي (N. Rumaila Crude)",
    nameEn: "North Rumaila Crude Oil",
    apiGravity: 33.2,
    density: 859,
    sulfurPct: 2.0,
    tempC: 31,
    color: "#10b981",
  },
  wq_crude: {
    id: "wq_crude",
    nameAr: "خام حقل غرب القرنة (West Qurna Crude)",
    nameEn: "West Qurna Crude Blend",
    apiGravity: 29.5,
    density: 878,
    sulfurPct: 2.8,
    tempC: 34,
    color: "#6366f1",
  },
  fuel_oil: {
    id: "fuel_oil",
    nameAr: "زيت الوقود والمشتقات الثقيلة (Fuel Oil)",
    nameEn: "Fuel Oil & Heavy Distillates",
    apiGravity: 18.0,
    density: 946,
    sulfurPct: 4.2,
    tempC: 45,
    color: "#1e293b",
  },
  custom: {
    id: "custom",
    nameAr: "مواصفة مادة مخصصة",
    nameEn: "Custom Material Specification",
    apiGravity: 29.0,
    density: 880,
    sulfurPct: 3.0,
    tempC: 30,
    color: "#8b5cf6",
  },
};

export type WarehouseScope =
  | "all_ps1"
  | "north_farm"
  | "south_farm"
  | "branches_only"
  | "custom_tanks";

export interface CustomReportFilter {
  // Time period
  timePreset: ReportTimePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  shift: ShiftType;
  selectedHours: string[]; // e.g. ["02:00", "04:00", ...]
  
  // Material / Product
  material: MaterialType;
  customMaterialName?: string;
  customApiGravity?: number;
  customDensity?: number;
  customTempC?: number;

  // Warehouse & Tanks
  warehouseScope: WarehouseScope;
  selectedTanks: string[];
  selectedReceivePipes: string[];
  selectedPumpPipes: string[];
  selectedBranches: string[];

  // Report metadata
  reportTitle: string;
  referenceNo: string;
  preparedBy: string;
  shiftSupervisor: string;
  department: string;
  notes: string;

  // Visual & Section toggles
  units: "m3" | "bbl" | "both";
  includeKpis: boolean;
  includeTankLevels: boolean;
  includeFlowTables: boolean;
  includeBranches: boolean;
  includeCharts: boolean;
  includeMaterialSpecs: boolean;
  includeSignatures: boolean;
}

export interface CustomReportComputedData {
  reportDate: string;
  generatedAt: string;
  filter: CustomReportFilter;
  materialSpec: MaterialSpec;
  
  // Computed values
  filteredReadings: Reading[];
  filteredReceiveRows: FlowRow[];
  filteredPumpRows: FlowRow[];
  filteredBranches: BranchRow[];
  
  // Aggregated KPIs
  initialStockM3: number;
  currentStockM3: number;
  netStockChangeM3: number;
  totalReceiveM3: number;
  totalPumpM3: number;
  availPumpM3: number;
  freeVolumeM3: number;
  totalCapacityM3: number;
  fillPercentage: number;
  activeTanksCount: number;
  
  // Barrels
  currentStockBbl: number;
  totalReceiveBbl: number;
  totalPumpBbl: number;
  availPumpBbl: number;
  
  // Pipeline breakdowns
  receiveBreakdown: Record<string, number>;
  pumpBreakdown: Record<string, number>;
  
  // Tank levels breakdown (latest)
  tankLevelsBreakdown: Array<{
    tank: string;
    levelCm: number | null;
    stockM3: number;
    stockBbl: number;
    capacityM3: number;
    fillPct: number;
    status: "active" | "standby" | "isolated" | "empty";
  }>;

  // Chart data
  hourlyFlowChartData: Array<{
    hour: string;
    receiveM3: number;
    pumpM3: number;
    netChangeM3: number;
    stockM3: number;
  }>;
}
