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

  const [employeeId, setEmployeeId] = useState("");
  const [addStatus, setAddStatus] = useState("");

  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const [showInfo, setShowInfo] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const dates = getMonthDates();

  useEffect(() => {
    const fetchAdminData = async () => {
      const auth = getAuth();
      const admin = auth.currentUser;
      if (!admin) return;

      const snap = await getDoc(doc(db, "users", admin.uid));
      if (!snap.exists()) return;

      const adminData = snap.data();
      setFirstName(adminData.first_name || "");

      const ids = adminData.employees || [];
      const temp: any[] = [];

      for (const uid of ids) {
        const s = await getDoc(doc(db, "users", uid));
        if (s.exists()) temp.push({ id: uid, ...s.data() });
      }

      setEmployees(temp);
      setSelectedEmployee(temp[0]?.id || "");

      setCurrentUser({
        id: admin.uid,
        email: admin.email,
        ...adminData
      });
    };

    fetchAdminData();
  }, []);

  const addEmployee = async () => {
	  const admin = getAuth().currentUser;
	  if (!admin) return;

	  const trimmedId = employeeId.trim();

	  try {
	    const ref = doc(db, "users", trimmedId);
	    const snap = await getDoc(ref);

	    if (!snap.exists()) {
	      setAddStatus("User not found");
	      return;
	    }

	    const user = snap.data();

	    if (employees.some((e) => e.id === trimmedId)) {
	      setAddStatus("Already added");
	      return;
	    }

	    await updateDoc(doc(db, "users", admin.uid), {
	      employees: arrayUnion(trimmedId)
	    });

	    await updateDoc(ref, { employer: admin.uid });

	    const newEmployee = { id: trimmedId, ...user };

	    // 🔥 UPDATE LIST
	    setEmployees((prev) => [...prev, newEmployee]);

	    // 🔥 FORCE SELECT NEW EMPLOYEE (THIS FIXES YOUR BUG)
	    setSelectedEmployee(trimmedId);

	    setEmployeeId("");
	    setAddStatus("Employee added");
	  } catch {
	    setAddStatus("Error");
	  }
	};

  const removeEmployee = async () => {
    const admin = getAuth().currentUser;
    if (!admin || !selectedEmployee) return;

    await updateDoc(doc(db, "users", admin.uid), {
      employees: arrayRemove(selectedEmployee)
    });

    await updateDoc(doc(db, "users", selectedEmployee), {
      employer: ""
    });

    setEmployees((prev) => prev.filter((e) => e.id !== selectedEmployee));
    setSelectedEmployee("");
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

  useEffect(() => {
	  const fetch = async () => {
	    // 🔥 IF NO EMPLOYEE → CLEAR TABLE
	    if (!selectedEmployee) {
	      setData({});
	      return;
	    }

	    const snapshot = await getDocs(collection(db, "timecards"));
	    const temp: any = {};

	    snapshot.docs.forEach((d) => {
	      const [uid, ...rest] = d.id.split("_");
	      if (uid === selectedEmployee) {
		temp[rest.join("_")] = d.data();
	      }
	    });

	    setData(temp);
	  };

	  fetch();
	}, [selectedEmployee]);

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

      {/* HEADER */}
      <div className="w-full max-w-7xl mb-6 flex justify-between">
        <h1 className="text-3xl font-bold">
          {firstName ? `Hello, ${firstName}` : "Admin"}
        </h1>

        <div className="flex gap-2">
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
            className="bg-blue-700 text-white px-4 py-2 rounded"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="w-full max-w-7xl mb-6 flex flex-col gap-3">
        <input
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          placeholder="Employee ID"
          className="border p-2"
        />

        <button onClick={addEmployee} className="bg-blue-600 text-white p-2">
          Add Employee
        </button>

        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
        >
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.first_name}
            </option>
          ))}
        </select>

        <button onClick={removeEmployee} className="bg-red-600 text-white p-2">
          Remove
        </button>
      </div>

      {/* TABLE */}
      <div className="w-full max-w-7xl overflow-x-auto border bg-white">
        <table className="min-w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-300">
              <th className="border px-2 py-2">Date</th>
              <th className="border px-2 py-2">Clock In</th>
              <th className="border px-2 py-2">Clock Out</th>
              <th className="border px-2 py-2">Total</th>
              <th className="border px-2 py-2">Notes</th>
            </tr>
          </thead>

          <tbody>
            {dates.map((date, i) => {
              const id = getISODate(date);
              const row = data[id] || {};

              return (
                <tr key={i} className="hover:bg-blue-50">
                  <td className="border px-2 py-2 bg-gray-100">
                    {formatDate(date)}
                  </td>

                  <td className="border px-2 py-2">
                    <input
                      type="time"
                      value={row.clockIn || ""}
                      onChange={(e) =>
                        updateAdminField(date, "clockIn", e.target.value)
                      }
                      className="border px-1 py-1 w-full"
                    />
                  </td>

                  <td className="border px-2 py-2">
                    <input
                      type="time"
                      value={row.clockOut || ""}
                      onChange={(e) =>
                        updateAdminField(date, "clockOut", e.target.value)
                      }
                      className="border px-1 py-1 w-full"
                    />
                  </td>

                  <td className="border px-2 py-2">
                    {row.total || "0"}
                  </td>

                  <td className="border px-2 py-2">
                    <input
                      type="text"
                      value={row.notes || ""}
                      onChange={(e) =>
                        updateAdminField(date, "notes", e.target.value)
                      }
                      className="border px-1 py-1 w-full"
                    />
                  </td>
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
