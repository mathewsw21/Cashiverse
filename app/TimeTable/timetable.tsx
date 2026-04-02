import { useEffect, useState } from "react";
import { db } from "../../src/firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  deleteDoc
} from "firebase/firestore";
import { getAuth, signOut, deleteUser, onAuthStateChanged } from "firebase/auth";

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

  const auth = getAuth();
  const user = auth.currentUser;

  const dates = getMonthDates(timecard === "previous" ? -1 : 0);
  
	useEffect(() => {
	  const unsubscribe = onAuthStateChanged(auth, async (user) => {
	  if (!user) return;

	  setCurrentUser(user);

	    const userRef = doc(db, "users", user.uid);
	    const snap = await getDoc(userRef);

	    if (snap.exists()) {
	      setFirstName(snap.data().first_name || "");
	    }
	  });

	  return () => unsubscribe();
	}, []);

useEffect(() => {
  const fetchData = async () => {
    if (!currentUser) return;

    const snapshot = await getDocs(collection(db, "timecards"));
    const temp: any = {};

    snapshot.docs.forEach(docSnap => {
      const fullId = docSnap.id;
      const parts = fullId.split("_");
      const docUserId = parts[0];
      const docDate = parts.slice(1).join("_");

      if (docUserId === currentUser.uid) {
        temp[docDate] = docSnap.data();
      }
    });

    setData(temp);
  };

  fetchData();
}, [timecard, currentUser]);

  const updateField = async (date: Date, field: string, value: any) => {
    if (!currentUser) return;

    const id = getISODate(date);
    const docId = `${currentUser.uid}_${id}`;

    const newData = {
      ...(data[id] || {}),
      [field]: value,
      currentUser: currentUser.uid,
      date: id
    };

    setData((prev: any) => ({ ...prev, [id]: newData }));

    await setDoc(doc(db, "timecards", docId), newData, { merge: true });
  };


  const approveTimecard = async () => {
	  if (!currentUser) return;

	  const validDates = new Set(dates.map(d => getISODate(d)));
	  
	  const entries = Object.entries(data).filter(([docDate]) =>
	    validDates.has(docDate)
	  );

	  if (entries.length === 0) return;

	  const allApproved = entries.every(
	    ([_, d]: any) => d.approved === true
	  );

	  const updatedLocal: any = { ...data };

	  for (const [docDate, existing] of entries as any) {
	    const fullId = `${currentUser.uid}_${docDate}`;

	    const newData = {
	      ...existing,
	      approved: !allApproved,
	      userId: currentUser.uid,
	      date: docDate
	    };

	    await setDoc(doc(db, "timecards", fullId), newData, { merge: true });

	    updatedLocal[docDate] = newData;
	  }

	  setData(updatedLocal);
	};

  const handleDeleteAccount = async () => {
    if (!currentUser) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete your account? This cannot be undone."
    );

    if (!confirmDelete) return;

    try {
      const usersSnapshot = await getDocs(collection(db, "users"));

      for (const docSnap of usersSnapshot.docs) {
        const employerId = docSnap.id;
        const userData = docSnap.data();

        if (userData.employees && Array.isArray(userData.employees)) {
          if (userData.employees.includes(currentUser.uid)) {
            const updatedEmployees = userData.employees.filter(
              (id: string) => id !== user.uid
            );

            await setDoc(
              doc(db, "users", employerId),
              { employees: updatedEmployees },
              { merge: true }
            );
          }
        }
      }
      await deleteDoc(doc(db, "users", currentUser.uid));

      const snapshot = await getDocs(collection(db, "timecards"));

      for (const docSnap of snapshot.docs) {
        const fullId = docSnap.id;
        if (fullId.startsWith(currentUser.uid + "_")) {
          await deleteDoc(doc(db, "timecards", fullId));
        }
      }
      
      await deleteUser(currentUser);

      window.location.href = "/";
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center p-4">

      <div className="w-full max-w-5xl flex justify-between items-center mb-4">
        <h1 className="text-lg font-semibold whitespace-nowrap">
          {(() => {
            const hour = new Date().getHours();
            let greeting = "Good morning";
            if (hour >= 12 && hour < 18) greeting = "Good afternoon";
            if (hour >= 18) greeting = "Good evening";

            return `${greeting}${firstName ? `, ${firstName}` : ""}`;
          })()}
        </h1>

        <div className="flex gap-2 items-center text-sm">
          <span className="text-xs text-gray-600 max-w-[150px] truncate">
            {currentUser?.email}
          </span>

          <select
            value={timecard}
            onChange={(e) => setTimecard(e.target.value)}
            className="border px-2 py-1 text-sm"
          >
            <option value="previous">Previous</option>
            <option value="current">Current</option>
          </select>

          <button
            onClick={approveTimecard}
            className="bg-green-600 text-white px-2 py-1 text-sm rounded"
          >
            {(() => {
		  const validDates = new Set(dates.map(d => getISODate(d)));

		  const entries = Object.entries(data).filter(([docDate]) =>
		    validDates.has(docDate)
		  );

		  if (entries.length === 0) return "Approve Month";

		  const allApproved = entries.every(
		    ([_, d]: any) => d.approved === true
		  );

		  return allApproved ? "Remove Approval" : "Approve Month";
		})()}
          </button>

          <button
            onClick={() => setShowInfo(true)}
            className="bg-blue-600 text-white px-2 py-1 text-sm rounded"
          >
            Info
          </button>

          <button
            onClick={async () => {
              await signOut(auth);
              window.location.href = "/";
            }}
            className="bg-red-600 text-white px-2 py-1 text-sm rounded"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="w-full max-w-5xl overflow-x-auto border bg-white">
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

              let buttonLabel = "Clock In";
              if (row.clockIn && !row.clockOut) buttonLabel = "Clock Out";
              if (row.clockIn && row.clockOut) buttonLabel = "Done";

              const handleClock = async () => {
                const now = new Date();
                const time = now.toTimeString().slice(0, 5);

                if (!row.clockIn) {
                  await updateField(date, "clockIn", time);
                } else if (!row.clockOut) {
                  await updateField(date, "clockOut", time);
                }
              };

              return (
                <tr key={idx} className={`hover:bg-blue-50 ${
                  timecard === "current" && isToday(date) ? "bg-yellow-200" : ""
                }`}>
                  <td className="border px-2 py-2 bg-gray-100">
                    {formatDate(date)}
                  </td>

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
                    <div>{row.clockIn || "--:--"}</div>
                  </td>

                  <td className="border px-2 py-2">
                    <div>{row.clockOut || "--:--"}</div>
                  </td>

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
                    <input
                      type="checkbox"
                      checked={row.approved || false}
                      disabled
                    />
                  </td>

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
