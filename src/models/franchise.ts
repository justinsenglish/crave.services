import { OrderReturn, Refund, Tender } from 'square';

export interface FranchiseSummary {
  id?: string | undefined;
  name?: string | null | undefined;
  address: FranchiseAddress;
  email?: string | null | undefined;
}

export interface FranchiseAddress {
  addressLine1?: string | null | undefined;
  addressLine2?: string | null | undefined;
  city?: string | null | undefined;
  state?: string | null | undefined;
  postalCode?: string | null | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
}

export interface SalesSummaryOrder {
  orderId: string | undefined;
  amounts: number;
  taxes: number;
  tips: number;
  giftcardSales: number;
  discounts: number;
  returns: number;
}

export interface TestSalesSummaryOrder {
  orderId: string;
  tenderAmount: number;
  processingFees: number;
  tenderTotal: number;
  taxes: number;
  tips: number;
  giftcardSales: number;
  discounts: number;
  returnAmount: number;
  returnTax: number;
  returnTip: number;
  returnDiscount: number;
  returnServiceCharge: number;
  returnProcessingFee: number;
  netAmounts: number;
  netTaxes: number;
  netTips: number;
  netDiscounts: number;
  returns: OrderReturn[];
  refunds: Refund;
  tenders: Tender[];
}

export interface SalesSummary {
  grossSales: number | undefined;
  returns: number | undefined;
  discounts: number | undefined;
  netSales: number | undefined;
  taxes: number | undefined;
  tips: number | undefined;
  giftCards: number | undefined;
  totalSales: number | undefined;
  royalties: number | undefined;
  marketingFees: number | undefined;
}

export interface TestSalesSummary {
  grossSales: number;
  returns: number;
  discounts: number;
  netSales: number;
  taxes: number;
  tips: number;
  giftCards: number;
  totalSales: number;
  returnAmounts: {
    amounts: number;
    taxes: number;
    tips: number;
    discounts: number;
    serviceCharges: number;
    processingFees: number;
  };
  netAmounts: {
    amounts: number;
    taxes: number;
    tips: number;
    discounts: number;
  };
  orders: TestSalesSummaryOrder[];
}
