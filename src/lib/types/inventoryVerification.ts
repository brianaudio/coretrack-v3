export interface InventoryVerificationRecord {
  id: string;
  date: string; // ISO date string
  locationId: string;
  staffId: string;
  staffName: string;
  items: InventoryVerificationItem[];
  notes?: string;
  photoUrl?: string;
  createdAt: string;
}

export interface InventoryVerificationItem {
  itemId: string;
  itemName: string;
  expectedQty: number;
  actualQty: number;
  discrepancy: number;
  notes?: string;
}
