import { listAccounts } from "@/src/infrastructure/repositories/account-repository";
import { listCreditCards } from "@/src/infrastructure/repositories/credit-card-repository";
import { QuickEntryPanel } from "@/src/components/quick-entry-panel";

export async function QuickEntrySection() {
  const [accounts, creditCards] = await Promise.all([
    listAccounts().catch(() => []),
    listCreditCards().catch(() => [])
  ]);

  return <QuickEntryPanel accounts={accounts} creditCards={creditCards} />;
}
