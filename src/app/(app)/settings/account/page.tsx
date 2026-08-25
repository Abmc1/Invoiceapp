import { getCurrentUser } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/settings/change-password-form";

export default async function AccountSettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Your Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Name:</span> {user?.name}
          </p>
          <p>
            <span className="text-muted-foreground">Email:</span> {user?.email}
          </p>
          <p>
            <span className="text-muted-foreground">Role:</span> {user?.role === "ADMIN" ? "Administrator" : "User"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
