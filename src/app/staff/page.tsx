import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/server/auth/currentStaff";
import { roleHomePath } from "@/server/auth/roleHome";

// Reads the session cookie on every request.
export const instant = false;

/** `/staff` is just a dispatcher: on to the signed-in staff member's own section, or sign-in. */
export default async function StaffIndexPage() {
  const staff = await getCurrentStaff();
  redirect(staff ? roleHomePath(staff.role) : "/staff/sign-in");
}
