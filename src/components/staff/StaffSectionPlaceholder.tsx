import { CustomerShell } from "@/components/layout/CustomerShell";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/app/staff/actions";

export interface StaffSectionPlaceholderProps {
  staffName: string;
  roleLabel: string;
  sectionTitle: string;
  builtInMilestone: string;
}

/** Stands in for a role's real landing page until the milestone that builds it. */
export function StaffSectionPlaceholder(props: StaffSectionPlaceholderProps) {
  const { staffName, roleLabel, sectionTitle, builtInMilestone } = props;

  return (
    <CustomerShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{sectionTitle}</h1>
        <p className="text-sm text-text-muted">
          Signed in as {staffName} · {roleLabel}
        </p>
        <p className="max-w-xs text-sm text-text-muted">
          The real {sectionTitle.toLowerCase()} screen arrives in {builtInMilestone}.
        </p>
        <form action={signOut}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </div>
    </CustomerShell>
  );
}
