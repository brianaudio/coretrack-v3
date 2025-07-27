"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../lib/context/AuthContext";
import { getInventoryVerificationRecords } from "../../lib/firebase/inventoryVerification";
import { InventoryVerificationRecord } from "../../lib/types/inventoryVerification";

const InventoryDiscrepancyDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [records, setRecords] = useState<InventoryVerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      if (!user || !profile?.tenantId) return;
      setLoading(true);
      const data = await getInventoryVerificationRecords(profile.tenantId);
      setRecords(data);
      setLoading(false);
    };
    fetchRecords();
  }, [user, profile?.tenantId]);

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6 mt-8">
      <h2 className="text-lg font-semibold mb-4">Inventory Discrepancy Dashboard</h2>
      {loading ? (
        <div className="text-gray-500">Loading records...</div>
      ) : records.length === 0 ? (
        <div className="text-gray-500">No verification records found.</div>
      ) : (
        <table className="w-full mb-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left px-2 py-1">Date</th>
              <th className="text-left px-2 py-1">Staff</th>
              <th className="text-left px-2 py-1">Location</th>
              <th className="text-left px-2 py-1">Discrepancies</th>
              <th className="text-left px-2 py-1">Notes</th>
            </tr>
          </thead>
          <tbody>
            {records.map(record => (
              <tr key={record.id}>
                <td className="px-2 py-1">{new Date(record.date).toLocaleString()}</td>
                <td className="px-2 py-1">{record.staffName}</td>
                <td className="px-2 py-1">{record.locationId}</td>
                <td className="px-2 py-1">
                  {record.items.filter(i => i.discrepancy !== 0).length === 0 ? (
                    <span className="text-green-600">No discrepancies</span>
                  ) : (
                    <ul className="list-disc ml-4 text-red-600">
                      {record.items.filter(i => i.discrepancy !== 0).map(i => (
                        <li key={i.itemId}>
                          {i.itemName}: {i.discrepancy > 0 ? "+" : ""}{i.discrepancy}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-2 py-1">{record.notes || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default InventoryDiscrepancyDashboard;
