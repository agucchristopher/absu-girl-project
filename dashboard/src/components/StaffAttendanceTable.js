"use client";
import { useState, useEffect } from "react";
import {
  fetchStaffList,
  fetchTodayAttendance,
  createStaff,
} from "@/services/api";
import { QRModal } from "./QRModal";
import { AddStaffModal } from "./AddStaffModal";

export function StaffAttendanceTable() {
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [staff, attendance] = await Promise.all([
          fetchStaffList(),
          fetchTodayAttendance(),
        ]);

        // Merge attendance data with staff data
        const staffWithAttendance = staff.map((person) => {
          const todayRecord = attendance.find((a) => a.staffId === person._id);
          return {
            ...person,
            status: todayRecord ? todayRecord.status : "Absent",
            checkIn: todayRecord ? todayRecord.checkIn : "-",
          };
        });

        setStaffList(staffWithAttendance);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleAddStaff = async (staffData) => {
    try {
      await createStaff(staffData);
      // Refresh the staff list
      const [staff, attendance] = await Promise.all([
        fetchStaffList(),
        fetchTodayAttendance(),
      ]);

      const staffWithAttendance = staff.map((person) => {
        const todayRecord = attendance.find((a) => a.staffId === person._id);
        return {
          ...person,
          status: todayRecord ? todayRecord.status : "Absent",
          checkIn: todayRecord ? todayRecord.checkIn : "-",
        };
      });

      setStaffList(staffWithAttendance);
    } catch (error) {
      console.error("Failed to add staff:", error);
    }
  };

  const handleMarkPresent = async (staffId, e) => {
    // Stop propagation to prevent opening QR modal
    e.stopPropagation();
    
    try {
      // Mark attendance in the backend using the provided endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attendance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staffId: staffId,
          status: "Present",
          checkIn: new Date().toLocaleTimeString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark attendance");
      }
      
      // Update the staff list to reflect the change
      setStaffList((currentStaffList) =>
        currentStaffList.map((person) => {
          if (person._id === staffId) {
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            
            return {
              ...person,
              status: "Present",
              checkIn: timeString,
            };
          }
          return person;
        })
      );
    } catch (error) {
      console.error("Failed to mark staff present:", error);
    }
  };

  if (loading) return <div className="text-center p-4">Loading...</div>;
  if (error) return <div className="text-center text-red-500 p-4">{error}</div>;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Staff List</h2>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
        >
          Add Staff
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                Check In
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white text-base">
            {staffList.map((person) => (
              <tr
                key={person._id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedStaff(person)}
              >
                <td className="px-6 py-5 whitespace-nowrap font-medium text-gray-900">
                  {person.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {person.department}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs rounded-full font-medium
                    ${
                      person.status === "Present"
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {person.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {person.checkIn}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {person.status !== "Present" && (
                    <button
                      onClick={(e) => handleMarkPresent(person._id, e)}
                      className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
                    >
                      Mark Present
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <QRModal
        isOpen={!!selectedStaff}
        onClose={() => setSelectedStaff(null)}
        staff={selectedStaff}
      />

      <AddStaffModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddStaff}
      />
    </>
  );
}