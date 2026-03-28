import { route } from "@react-router/dev/routes";

export default [
  route("/", "./routes/home.tsx"),
  route("/timetable", "./routes/timetable.tsx"),
  route("/timetable_admin", "./routes/timetable_admin.tsx"),
];
