import { useEffect, useState } from "react";
import { db, auth } from "../../src/firebase";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import { useNavigate } from "react-router";

export function Welcome() {
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState("Connecting to Firestore...");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authStatus, setAuthStatus] = useState("");

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [isAdmin, setIsAdmin] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const navigate = useNavigate();

  const signUp = async () => {
    try {
      if (!firstName || !lastName) {
        setAuthStatus("X Please enter first and last name");
        return;
      }

      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        first_name: firstName,
        last_name: lastName,
        createdAt: new Date(),
        role: isAdmin ? "admin" : "employee",

        ...(isAdmin && {
          employees: []
        })
      });

      setAuthStatus(`Account created as ${isAdmin ? "ADMIN" : "EMPLOYEE"}`);

      navigate(isAdmin ? "/timetable_admin" : "/timetable");

    } catch (err: any) {
      console.error(err);
      setAuthStatus(err.message);
    }
  };

  const signIn = async () => {
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        setAuthStatus("User data not found");
        return;
      }

      const role = userDoc.data().role;

      setAuthStatus("Signed in");

      navigate(role === "admin" ? "/timetable_admin" : "/timetable");

    } catch (err: any) {
      console.error(err);
      setAuthStatus(err.message);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snapshot = await getDocs(collection(db, "items"));
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setItems(data);
        setStatus("Firestore connected");
      } catch (err) {
        console.error("Firestore error:", err);
        setStatus("Firestore failed");
      }
    };

    fetchData();
  }, []);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-900">
      <img
        src="/logo.jpeg"
        alt="Cashiverse Logo"
        className="mb-6 w-120 h-auto"
      />

      <div className="w-full max-w-md p-8 bg-gray-50 dark:bg-gray-800 rounded-2xl shadow text-center">

        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
          Welcome to Cashiverse
        </h1>

        <div className="flex mb-6">
          <button
            onClick={() => setMode("signin")}
            className={`flex-1 p-2 rounded-l-lg ${
              mode === "signin" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            Sign In
          </button>

          <button
            onClick={() => setMode("signup")}
            className={`flex-1 p-2 rounded-r-lg ${
              mode === "signup" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            Create Account
          </button>
        </div>

        <div className="flex flex-col gap-3">
        
          {mode === "signup" && (
            <>
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="p-2 rounded border"
              />

              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="p-2 rounded border"
              />
            </>
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-2 rounded border"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-2 rounded border"
          />

          {mode === "signup" && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
              />
              Create as Admin
            </label>
          )}

          <button
            onClick={mode === "signup" ? signUp : signIn}
            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
          >
            {mode === "signup" ? "Create Account" : "Sign In"}
          </button>

          <p className="text-sm text-gray-500 text-center">
            {authStatus}
          </p>
        </div>

        <p className="text-xs text-center mt-4 text-green-500">
          {status}
        </p>
      </div>
    </main>
  );
}
