"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../lib/context/AuthContext";
import { addInventoryVerificationRecord } from "../../lib/firebase/inventoryVerification";
import { InventoryVerificationItem } from "../../lib/types/inventoryVerification";

// Dummy inventory items for UI demo
const demoItems: InventoryVerificationItem[] = [
  { itemId: "1", itemName: "Burger Patty", expectedQty: 50, actualQty: 0, discrepancy: 0 },
  { itemId: "2", itemName: "Buns", expectedQty: 100, actualQty: 0, discrepancy: 0 },
  { itemId: "3", itemName: "Coke", expectedQty: 30, actualQty: 0, discrepancy: 0 },
];

const InventoryVerification: React.FC = () => {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<InventoryVerificationItem[]>(demoItems);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleActualQtyChange = (index: number, value: number) => {
    const updated = [...items];
    updated[index].actualQty = value;
    updated[index].discrepancy = value - updated[index].expectedQty;
    setItems(updated);
  };

  const handleSubmit = async () => {
    if (!user || !profile?.tenantId) return;
    setSaving(true);
    try {
      await addInventoryVerificationRecord(profile.tenantId, {
        date: new Date().toISOString(),
        locationId: (profile && (profile as any).locationId) ? (profile as any).locationId : "default",
        staffId: user.uid,
        staffName: user.displayName || user.email || "Unknown",
        items,
        notes,
        createdAt: new Date().toISOString(),
      });
      alert("Inventory verification submitted!");
      setItems(demoItems.map(i => ({ ...i, actualQty: 0, discrepancy: 0 })));
      setNotes("");
    } catch (error) {
      alert("Error submitting verification");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6 mt-8">
      <h2 className="text-lg font-semibold mb-4">Inventory Verification</h2>
      <table className="w-full mb-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left px-2 py-1">Item</th>
            <th className="text-right px-2 py-1">Expected</th>
            <th className="text-right px-2 py-1">Actual</th>
            <th className="text-right px-2 py-1">Discrepancy</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.itemId}>
              <td className="px-2 py-1">{item.itemName}</td>
              <td className="text-right px-2 py-1">{item.expectedQty}</td>
              <td className="text-right px-2 py-1">
                <input
                  type="number"
                  className="w-20 border rounded px-2 py-1"
                  value={item.actualQty}
                  min={0}
                  onChange={e => handleActualQtyChange(idx, Number(e.target.value))}
                  disabled={saving}
                />
              </td>
              <td className={`text-right px-2 py-1 ${item.discrepancy !== 0 ? "text-red-600 font-bold" : "text-gray-700"}`}>
                {item.discrepancy}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea
          className="w-full border rounded px-2 py-1"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          disabled={saving}
        />
      </div>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        onClick={handleSubmit}
        disabled={saving}
      >
        {saving ? "Saving..." : "Submit Verification"}
      </button>
    </div>
  );
};

export default InventoryVerification;
