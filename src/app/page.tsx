// This file now redirects to orders page which serves as the home page
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/orders");
}
