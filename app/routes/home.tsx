import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";


export function meta({}: Route.MetaArgs) {
  return [
    { title: "Cashiverse" },
    { name: "description", content: "Welcome to Cashiverse!" },
  ];
}

export default function Home() {
  return <Welcome />;
}
