import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientForm } from "@/components/clients/client-form";
import { createClientAction } from "../actions";

export default function NewClientPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl">New Client</h1>
        <p className="text-sm text-muted-foreground">Add a person or organisation to bill.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm action={createClientAction} submitLabel="Create Client" />
        </CardContent>
      </Card>
    </div>
  );
}
