import type { AccountDTO } from "../../types/Account/AccountDTO";
import type { AccountViewModel } from "../../types/Account/AccountViewModel";

export function mapAccountToViewModel(
  dto: AccountDTO
): AccountViewModel {
  return {
    id: dto.id,
    bankName: dto.bank,
    agency: dto.agency.value,
    accountNumber: dto.number.value,
    balance: dto.balance.amount,
    isActive: dto.isActive,
  };
}
