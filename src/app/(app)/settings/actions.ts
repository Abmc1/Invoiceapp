"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser, getCurrentSessionId, invalidateOtherSessions } from "@/lib/auth/session";
import { updateCompanySettings, type CompanySettingsUpdate } from "@/lib/services/settings";
import { createUser, setUserActive, setUserRole, changeOwnPassword, type UserRole } from "@/lib/services/users";
import { isPasswordStrongEnough } from "@/lib/auth/password";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { runDueReminders } from "@/lib/services/reminders";

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || null;
}

export async function updateBusinessSettingsAction(formData: FormData) {
  const user = await requireAdmin();
  const update: CompanySettingsUpdate = {
    companyName: str(formData, "companyName") ?? "MotivAction",
    tradingName: str(formData, "tradingName"),
    addressLine1: str(formData, "addressLine1"),
    addressLine2: str(formData, "addressLine2"),
    city: str(formData, "city"),
    county: str(formData, "county"),
    postcode: str(formData, "postcode"),
    country: str(formData, "country") ?? "Ireland",
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    mobile: str(formData, "mobile"),
    website: str(formData, "website"),
    vatRegistered: formData.get("vatRegistered") === "on",
    vatNumber: str(formData, "vatNumber"),
    companyRegistrationNumber: str(formData, "companyRegistrationNumber"),
  };
  await updateCompanySettings(update, user.id);
  revalidatePath("/settings/business");
}

export async function updateInvoiceSettingsAction(formData: FormData) {
  const user = await requireAdmin();
  const update: CompanySettingsUpdate = {
    invoicePrefix: str(formData, "invoicePrefix") ?? "MA",
    invoiceNumberFormat: str(formData, "invoiceNumberFormat") ?? "{PREFIX}-{YEAR}-{SEQ:4}",
    invoiceNumberResetYearly: formData.get("invoiceNumberResetYearly") === "on",
    defaultCurrency: str(formData, "defaultCurrency") ?? "EUR",
    defaultPaymentTermsDays: Number(str(formData, "defaultPaymentTermsDays") ?? "14"),
    defaultTaxRate: str(formData, "defaultTaxRate") ?? "0",
    invoiceFooter: str(formData, "invoiceFooter"),
    paymentInstructions: str(formData, "paymentInstructions"),
  };
  await updateCompanySettings(update, user.id);
  revalidatePath("/settings/invoices");
}

export async function updateBankDetailsAction(formData: FormData) {
  const user = await requireAdmin();
  const update: CompanySettingsUpdate = {
    bankName: str(formData, "bankName"),
    bankAccountName: str(formData, "bankAccountName"),
    iban: str(formData, "iban"),
    bic: str(formData, "bic"),
  };
  await updateCompanySettings(update, user.id);
  revalidatePath("/settings/bank-details");
}

export async function updateEmailSettingsAction(formData: FormData) {
  const user = await requireAdmin();
  const update: CompanySettingsUpdate = {
    emailProvider: str(formData, "emailProvider") ?? "mock",
    emailFromName: str(formData, "emailFromName") ?? "MotivAction",
    emailFromAddress: str(formData, "emailFromAddress"),
  };
  await updateCompanySettings(update, user.id);
  revalidatePath("/settings/email");
}

export async function updateReminderSettingsAction(formData: FormData) {
  const user = await requireAdmin();
  const update: CompanySettingsUpdate = {
    remindersEnabled: formData.get("remindersEnabled") === "on",
    reminderBeforeDueDays: Number(str(formData, "reminderBeforeDueDays") ?? "3"),
    reminderOnDueDate: formData.get("reminderOnDueDate") === "on",
    reminderAfterDueDaysList: str(formData, "reminderAfterDueDaysList") ?? "7,14",
  };
  await updateCompanySettings(update, user.id);
  revalidatePath("/settings/reminders");
}

export async function runRemindersNowAction() {
  await requireAdmin();
  return runDueReminders();
}

const newUserSchema = z.object({
  name: z.string().trim().min(1),
  email: z.email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "USER"]),
});

export async function createUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const raw = Object.fromEntries(formData.entries());
  const parsed = newUserSchema.parse(raw);

  if (!isPasswordStrongEnough(parsed.password)) {
    throw new Error("Password must be at least 8 characters and include a letter and a number.");
  }

  await createUser(parsed, admin.id);
  revalidatePath("/settings/users");
}

export async function setUserActiveAction(userId: string, active: boolean) {
  const admin = await requireAdmin();
  await setUserActive(userId, active, admin.id);
  revalidatePath("/settings/users");
}

export async function setUserRoleAction(userId: string, role: UserRole) {
  const admin = await requireAdmin();
  await setUserRole(userId, role, admin.id);
  revalidatePath("/settings/users");
}

export interface ChangePasswordState {
  error?: string;
  success?: boolean;
}

export async function changeOwnPasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const user = await requireUser();

  // Prevents brute-forcing the "current password" check itself — without
  // this, an attacker who already has a valid session (e.g. a stolen
  // cookie) could try unlimited password guesses through this form.
  const rateLimit = checkRateLimit(`password-change:${user.id}`, { maxAttempts: 5, windowMs: 15 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return { error: `Too many attempts. Try again in ${rateLimit.retryAfterSeconds}s.` };
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword) {
    return { error: "Fill in both your current and new password." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "New password and confirmation don't match." };
  }

  try {
    await changeOwnPassword(user.id, currentPassword, newPassword);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to change password." };
  }

  // Kill every other session for this account — a session cookie stolen
  // before the change should stop working the moment the password changes,
  // not remain valid until it naturally expires. The session performing
  // this change is kept alive.
  const currentSessionId = await getCurrentSessionId();
  await invalidateOtherSessions(user.id, currentSessionId);

  return { success: true };
}
