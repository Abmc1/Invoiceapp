import { requireAdminPage } from "@/lib/auth/session";
import { listUsers } from "@/lib/services/users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NewUserDialog } from "@/components/settings/new-user-dialog";
import { createUserAction, setUserActiveAction } from "../actions";

export default async function UsersSettingsPage() {
  const currentUser = await requireAdminPage();
  const users = await listUsers();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <NewUserDialog action={createUserAction} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant={user.role === "ADMIN" ? "brand" : "default"}>{user.role}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={user.active ? "success" : "muted"}>{user.active ? "Active" : "Deactivated"}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {user.id !== currentUser.id ? (
                  <form action={setUserActiveAction.bind(null, user.id, !user.active)} className="inline">
                    <Button size="sm" variant="ghost" type="submit">
                      {user.active ? "Deactivate" : "Reactivate"}
                    </Button>
                  </form>
                ) : (
                  <span className="text-xs text-muted-foreground">You</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
