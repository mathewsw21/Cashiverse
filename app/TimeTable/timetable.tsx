import { useEffect, useState } from "react";
import { db } from "../../src/firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc
} from "firebase/firestore";
import { getAuth, signOut, deleteUser } from "firebase/auth";
import { getDoc } from "firebase/firestore";

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

export function TimeTable() {
  const [firstName, setFirstName] = useState("");
  const [data, setData] = useState<any>({});
  const [timecard, setTimecard] = useState("current");
  const [showInfo, setShowInfo] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const dates = getMonthDates(timecard === "previous" ? -1 : 0);

  useEffect(() => {
    const fetchUser = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      setCurrentUser(user);

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        setFirstName(snap.data().first_name || "");
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const snapshot = await getDocs(collection(db, "timecards"));

      const temp: any = {};

      snapshot.docs.forEach(docSnap => {
        const fullId = docSnap.id; // USERID_DATE

        // split USERID_DATE
        const parts = fullId.split("_");
        const docUserId = parts[0];
        const docDate = parts.slice(1).join("_");

        if (docUserId === user.uid) {
          temp[docDate] = docSnap.data();
        }
      });

      setData(temp);
    };

    fetchData();
  }, [timecard]);

  const updateField = async (date: Date, field: string, value: any) => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    const id = getISODate(date);
    const docId = `${user.uid}_${id}`;

    const newData = {
      ...(data[id] || {}),
      [field]: value,
      userId: user.uid,
      date: id
    };

    setData((prev: any) => ({ ...prev, [id]: newData }));

    try {
      await setDoc(doc(db, "timecards", docId), newData, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  const approveTimecard = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    const allApproved = Object.values(data).length > 0 && Object.values(data).every((d: any) => d.approved === true);

    const snapshot = await getDocs(collection(db, "timecards"));
    const updatedLocal: any = { ...data };

    for (const docSnap of snapshot.docs) {
      const fullId = docSnap.id;

      const parts = fullId.split("_");
      const docUserId = parts[0];
      const docDate = parts.slice(1).join("_");

      if (docUserId === user.uid) {
        const existing = docSnap.data();

        const newData = {
          ...existing,
          approved: !allApproved,
          userId: user.uid,
          date: docDate
        };

        await setDoc(doc(db, "timecards", fullId), newData, { merge: true });

        updatedLocal[docDate] = newData;
      }
    }

    setData(updatedLocal);
  };
 
const handleDeleteAccount = async () => {
  const auth = getAuth();
  const user = auth.currentUser;

  console.log("DELETE CLICKED", user);

  if (!user) {
    alert("User not loaded");
    return;
  }

  try {
    console.log("STEP A");

    await deleteDoc(doc(db, "users", user.uid));

    console.log("STEP B");

    const snapshot = await getDocs(collection(db, "timecards"));

    for (const docSnap of snapshot.docs) {
      if (docSnap.id.startsWith(user.uid + "_")) {
        await deleteDoc(doc(db, "timecards", docSnap.id));
      }
    }

    console.log("STEP C");

    try {
      await deleteUser(user);
    } catch (err: any) {
      console.log("DELETE AUTH FAILED:", err.code);
    }

    console.log("STEP D");

    await signOut(auth);

    window.location.href = "/";
  } catch (err: any) {
    console.error(err);
    alert(err.message);
  }
};

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center p-6">

      {/* HEADER */}
      <div className="w-full max-w-7xl flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          {(() => {
            const hour = new Date().getHours();
            let greeting = "Good morning";
            if (hour >= 12 && hour < 18) greeting = "Good afternoon";
            if (hour >= 18) greeting = "Good evening";

            return `${greeting}${firstName ? `, ${firstName}` : ""}`;
          })()}
        </h1>

        <div className="flex gap-4">
          <select
            value={timecard}
            onChange={(e) => setTimecard(e.target.value)}
            className="border px-4 py-2"
          >
            <option value="previous">Previous Timecard</option>
            <option value="current">Current Timecard</option>
          </select>

          <button
            onClick={approveTimecard}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            {Object.values(data).length > 0 && Object.values(data).every((d: any) => d.approved === true)
              ? "Remove Approval"
              : "Approve Timecard"}
          </button>

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
          
          <button
            onClick={() => setShowInfo(true)}
            className="bg-blue-600 text-white px-2 py-1 text-sm rounded"
          >
            Info
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
              const todayRow = isToday(date);

              // Determine button label
              let buttonLabel = "Clock In";
              if (row.clockIn && !row.clockOut) buttonLabel = "Clock Out";
              if (row.clockIn && row.clockOut) buttonLabel = "Done";

              const handleClock = async () => {
                const now = new Date();
                const time = now.toTimeString().slice(0,5);

                if (!row.clockIn) {
                  await updateField(date, "clockIn", time);
                } else if (!row.clockOut) {
                  await updateField(date, "clockOut", time);
                }
              };

              return (
                <tr
                  key={idx}
                  className={`hover:bg-blue-50 ${
                    timecard === "current" && isToday(date)
                      ? "bg-yellow-200"
                      : ""
                  }`}
                >
                  <td className="border px-2 py-2 bg-gray-100">
                    {formatDate(date)}
                  </td>

                  

                  {/* CLOCK IN */}
                  <td className="border px-2 py-2">
                    {todayRow && (
                      <button
                        onClick={handleClock}
                        disabled={buttonLabel === "Done"}
                        className="bg-blue-600 text-white px-2 py-1 rounded text-xs mb-1"
                      >
                        {buttonLabel}
                      </button>
                    )}
                    <input
                      type="time"
                      value={row.clockIn || ""}
                      onChange={(e) =>
                        updateField(date, "clockIn", e.target.value)
                      }
                    />
                  </td>

                  {/* CLOCK OUT */}
                  <td className="border px-2 py-2">
                    <input
                      type="time"
                      value={row.clockOut || ""}
                      onChange={(e) =>
                        updateField(date, "clockOut", e.target.value)
                      }
                    />
                  </td>

                  {/* TOTAL */}
                  <td className="border px-2 py-2">
                    {row.clockIn && row.clockOut
                      ? (
                          (new Date(`1970-01-01T${row.clockOut}` as any).getTime() -
                            new Date(`1970-01-01T${row.clockIn}` as any).getTime()) /
                          3600000
                        ).toFixed(2)
                      : "0"}
                  </td>

                  {/* APPROVED */}
                  <td className="border px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={row.approved || false}
                      onChange={(e) =>
                        updateField(date, "approved", e.target.checked)
                      }
                    />
                  </td>

                  {/* NOTES */}
                  <td className="border px-2 py-2">
                    <input
                      type="text"
                      value={row.notes || ""}
                      onChange={(e) =>
                        updateField(date, "notes", e.target.value)
                      }
                      placeholder="Add note"
                      className="w-full"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

	{showInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg w-80">
            <h2 className="text-lg font-bold mb-4">User Info</h2>

            <p className="mb-2 text-sm">
              <strong>Email:</strong> {currentUser?.email}
            </p>

            <p className="mb-4 text-xs break-all">
              <strong>User ID:</strong> {currentUser?.uid}
            </p>

            <button
              onClick={handleDeleteAccount}
              className="bg-red-700 text-white px-2 py-1 text-sm rounded w-full mb-2"
            >
              Delete Account
            </button>

            <button
              onClick={() => setShowInfo(false)}
              className="bg-gray-600 text-white px-2 py-1 text-sm rounded w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </main>
  );
}

