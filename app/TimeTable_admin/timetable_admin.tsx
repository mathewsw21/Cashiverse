import { useEffect, useState } from "react";
import { db } from "../../src/firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc
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

export function TimeTable_ADMIN() {
  const [firstName, setFirstName] = useState("");
  const [data, setData] = useState<any>({});
  const [timecard, setTimecard] = useState("current");

  const [employeeId, setEmployeeId] = useState("");
  const [addStatus, setAddStatus] = useState("");
  
  const [showInfo, setShowInfo] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [employees, setEmployees] = useState<any[]>([]);{/* POPUP */}
      
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const dates = getMonthDates(timecard === "previous" ? -1 : 0);

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
    } else {
      setSelectedEmployee("");
    }
    
   setCurrentUser({
	      id: admin.uid,
	      email: admin.email,
	      ...adminData
	    });
    
  };

  useEffect(() => {
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

      await fetchAdminData();

    } catch (err) {
      console.error(err);
      setAddStatus("Failed");
    }
  };
  
  const deleteAccount = async () => {
    const user = getAuth().currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data();

      if (data.employees) {
        for (const empId of data.employees) {
          await updateDoc(doc(db, "users", empId), {
            employer: ""
          });
        }
      }
    }

    await deleteDoc(userRef);
    await user.delete();
    window.location.href = "/";
  };

  const removeEmployee = async () => {
    try {
      const admin = getAuth().currentUser;
      if (!admin || !selectedEmployee) return;

      await updateDoc(doc(db, "users", admin.uid), {
        employees: arrayRemove(selectedEmployee)
      });

      await updateDoc(doc(db, "users", selectedEmployee), {
        employer: ""
      });

      // update UI immediately
      setEmployees((prev) => {
        const updated = prev.filter((e) => e.id !== selectedEmployee);

        if (updated.length > 0) {
          setSelectedEmployee(updated[0].id);
        } else {
          setSelectedEmployee("");
        }

        return updated;
      });

    } catch (err) {
      console.error("Error removing employee:", err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedEmployee) {
        setData({});
        return;
      }

      const snapshot = await getDocs(collection(db, "timecards"));
      const temp: any = {};

      snapshot.docs.forEach((docSnap) => {
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
  }, [selectedEmployee, timecard]);

  const updateAdminField = async (date: Date, field: string, value: any) => {
    if (!selectedEmployee) return;

    const id = getISODate(date);
    const docId = `${selectedEmployee}_${id}`;
    const existing = data[id] || {};

    const updated: any = {
      ...existing,
      [field]: value,
      userId: selectedEmployee,
      date: id
    };

    if (updated.clockIn && updated.clockOut) {
      const hours =
        (new Date(`1970-01-01T${updated.clockOut}`).getTime() -
          new Date(`1970-01-01T${updated.clockIn}`).getTime()) /
        3600000;

      updated.total = parseFloat(hours.toFixed(2));
    } else {
      updated.total = 0;
    }

    setData((prev: any) => ({ ...prev, [id]: updated }));
    await setDoc(doc(db, "timecards", docId), updated, { merge: true });
  };

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center p-6">

      <div className="w-full max-w-7xl flex flex-col gap-4 mb-6">

        <h1 className="text-3xl font-bold">
          {`Hello${firstName ? `, ${firstName}` : ""}`}
        </h1>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Employee ID"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="border px-3 py-2"
          />
          <button onClick={addEmployee} className="bg-blue-600 text-white px-4 py-2 rounded">
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
           <button
            onClick={() => setShowInfo(true)}
            className="bg-gray-700 text-white px-4 py-2 rounded"
          >
            Info
          </button>
        
          <button
            onClick={async () => {
              await signOut(getAuth());
              window.location.href = "/";
            }}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            Sign Out
          </button>

          <button onClick={removeEmployee} className="bg-red-600 text-white px-4 py-2 rounded">
            Remove
          </button>
        </div>
      </div>

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
                  <td className="border px-2 py-2">{row.total || "0"}</td>
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
      
      {/* POPUP */}
      {showInfo && currentUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded flex flex-col gap-4">
            <p><strong>Email:</strong> {currentUser.email}</p>
            <p><strong>ID:</strong> {currentUser.id}</p>

            <div className="flex justify-between">
              <button
                onClick={() => setShowInfo(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={deleteAccount}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
