import { useEffect, useState } from "react";
import { db } from "../../src/firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion
} from "firebase/firestore";
import { getAuth, signOut } from "firebase/auth";

function getMonthDates(offset = 0) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + offset;

  const dates: Date[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(new Date(year, month, d));
  }

  return dates;
}

function formatDate(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getISODate(date: Date) {
  return date.toISOString().split("T")[0];
}

function isToday(date: Date) {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function TimeTable_ADMIN() {
  const [firstName, setFirstName] = useState("");
  const [data, setData] = useState<any>({});
  const [timecard, setTimecard] = useState("current");

  const [employeeId, setEmployeeId] = useState("");
  const [addStatus, setAddStatus] = useState("");

  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const dates = getMonthDates(timecard === "previous" ? -1 : 0);


  useEffect(() => {
    const fetchAdminData = async () => {
      const auth = getAuth();
      const admin = auth.currentUser;
      if (!admin) return;

      const adminSnap = await getDoc(doc(db, "users", admin.uid));
      if (!adminSnap.exists()) return;

      const adminData = adminSnap.data();
      setFirstName(adminData.first_name || "");

      const employeeIds = adminData.employees || [];
      const temp: any[] = [];

      for (const uid of employeeIds) {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (userSnap.exists()) {
          temp.push({
            id: uid,
            ...userSnap.data()
          });
        }
      }

      setEmployees(temp);

      if (temp.length > 0) {
        setSelectedEmployee(temp[0].id);
      }
    };

    fetchAdminData();
  }, []);

  const addEmployee = async () => {
    const auth = getAuth();
    const admin = auth.currentUser;
    if (!admin) return;

    try {
      const employeeRef = doc(db, "users", employeeId);
      const employeeSnap = await getDoc(employeeRef);

      if (!employeeSnap.exists()) {
        setAddStatus("Employee not found");
        return;
      }

      await updateDoc(doc(db, "users", admin.uid), {
        employees: arrayUnion(employeeId)
      });

      await updateDoc(employeeRef, {
        employer: admin.uid
      });

      setAddStatus("Employee added");
      setEmployeeId("");

      window.location.reload();

    } catch (err) {
      console.error(err);
      setAddStatus("Failed");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedEmployee) return;

      const snapshot = await getDocs(collection(db, "timecards"));
      const temp: any = {};

      snapshot.docs.forEach(docSnap => {
        const fullId = docSnap.id;
        const parts = fullId.split("_");
        const docUserId = parts[0];
        const docDate = parts.slice(1).join("_");

        if (docUserId === selectedEmployee) {
          temp[docDate] = docSnap.data();
        }
      });

      setData(temp);
    };

    fetchData();
  }, [timecard, selectedEmployee]);

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center p-6">

      {/* HEADER */}
      <div className="w-full max-w-7xl flex flex-col gap-4 mb-6">

        <h1 className="text-3xl font-bold">
          {(() => {
            const hour = new Date().getHours();
            let greeting = "Good morning";
            if (hour >= 12 && hour < 18) greeting = "Good afternoon";
            if (hour >= 18) greeting = "Good evening";

            return `${greeting}${firstName ? `, ${firstName}` : ""}`;
          })()}
        </h1>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Employee ID"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="border px-3 py-2"
          />
          <button
            onClick={addEmployee}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Add Employee
          </button>
        </div>

        <p className="text-sm">{addStatus}</p>
        
        <div className="flex gap-2 items-center">
          <label>Select Employee:</label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="border px-3 py-2"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-4">
          <select
            value={timecard}
            onChange={(e) => setTimecard(e.target.value)}
            className="border px-4 py-2"
          >
            <option value="previous">Previous</option>
            <option value="current">Current</option>
          </select>

          <button
            onClick={async () => {
              const auth = getAuth();
              await signOut(auth);
              window.location.href = "/";
            }}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="w-full overflow-x-auto border bg-white">
        <table className="min-w-full text-xs border-collapse">

          <thead>
            <tr className="bg-gray-300">
              <th className="border px-2 py-2">Date</th>
              <th className="border px-2 py-2">Clock In</th>
              <th className="border px-2 py-2">Clock Out</th>
              <th className="border px-2 py-2">Total</th>
              <th className="border px-2 py-2">Approved</th>
              <th className="border px-2 py-2">Notes</th>
            </tr>
          </thead>

          <tbody>
            {dates.map((date, idx) => {
              const id = getISODate(date);
              const row = data[id] || {};

              return (
                <tr key={idx}>
                  <td className="border px-2 py-2">{formatDate(date)}</td>

                  <td className="border px-2 py-2">{row.clockIn || ""}</td>
                  <td className="border px-2 py-2">{row.clockOut || ""}</td>

                  <td className="border px-2 py-2">
                    {row.clockIn && row.clockOut
                      ? (
                          (new Date(`1970-01-01T${row.clockOut}`).getTime() -
                            new Date(`1970-01-01T${row.clockIn}`).getTime()) /
                          3600000
                        ).toFixed(2)
                      : "0"}
                  </td>

                  <td className="border px-2 py-2 text-center">
                    {row.approved ? "✓" : "X"}
                  </td>

                  <td className="border px-2 py-2">{row.notes || ""}</td>
                </tr>
              );
            })}
          </tbody>

        </table>
      </div>

    </main>
  );
}
