export interface AccountDTO {
  id: string;
  userId: string;
  bank: string; // enum
  agency: {
    value: string;
  };
  number: {
    value: string;
  };
  balance: {
    amount: number;
  };
  createdAt: string;
  isActive: boolean;
}
