import { Client, Environment, Order, Location, Error as SquareError, OrderLineItem, Refund, Tender } from 'square';
import { isEmpty } from '../common/utils';
import { SalesSummary, SalesSummaryOrder, TestSalesSummary, TestSalesSummaryOrder } from '../models/franchise';
import { DateTime } from 'luxon';
import fs from 'fs';
import path from 'path';

const enum LocationStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE'
}

export class SquareService {
  private static instance: SquareService;
  private squareClient: Client;
  private accessToken = process.env.SQUARE_ACCESS_TOKEN as string;
  private timezone = 'America/Denver';

  private constructor() {
    this.squareClient = new Client({
      bearerAuthCredentials: {
        accessToken: this.accessToken
      },
      environment: Environment.Production
    });
  }

  public static getInstance() {
    if (!SquareService.instance) {
      SquareService.instance = new SquareService();
    }

    return SquareService.instance;
  }

  /* Locations API */
  listLocations = async (): Promise<Location[]> => {
    const { locationsApi } = this.squareClient;

    const response = await locationsApi.listLocations();

    const activeLocations = response.result.locations?.filter((location) => location.status === LocationStatus.Active) || [];

    return activeLocations || [];
  };

  getLocation = async (locationId: string): Promise<Location | undefined> => {
    const { locationsApi } = this.squareClient;

    const response = await locationsApi.retrieveLocation(locationId);

    return response.result.location;
  };

  /* Orders API */
  getGrossSales = async (locationId: string, startDate: Date, endDate: Date): Promise<SalesSummary> => {
    const startDateInMST = DateTime.fromObject(
      { year: startDate.getFullYear(), month: startDate.getMonth() + 1, day: startDate.getDate(), hour: 0, minute: 0, second: 0 },
      { zone: this.timezone }
    );
    const endDateInMST = DateTime.fromObject(
      { year: endDate.getFullYear(), month: endDate.getMonth() + 1, day: endDate.getDate(), hour: 23, minute: 59, second: 59 },
      { zone: this.timezone }
    );

    const startDateInUTC = startDateInMST.toISO();
    const endDateInUTC = endDateInMST.toISO();

    console.log(`Fetching sales data for location ${locationId} from ${startDateInUTC} to ${endDateInUTC}.`);

    let parsedOrders: SalesSummaryOrder[] = [];

    try {
      const ordersResult = await this.searchOrders(locationId, startDateInUTC, endDateInUTC);

      if (!isEmpty(ordersResult.orders)) {
        parsedOrders = ordersResult.orders.map<SalesSummaryOrder>((order: Order) => {
          // TODO: Get returns

          const amounts = Number(order.netAmounts?.totalMoney?.amount || 0);
          const taxes = Number(order.netAmounts?.taxMoney?.amount || 0);
          const tips = Number(order.netAmounts?.tipMoney?.amount || 0);
          const discounts = Number(order.netAmounts?.discountMoney?.amount || 0);

          const giftcardSales =
            order.lineItems?.reduce((acc: number, lineItem: OrderLineItem) => {
              if (lineItem.itemType === 'GIFT_CARD') {
                return acc + Number(lineItem.totalMoney?.amount || 0);
              }

              return acc;
            }, 0) || 0;

          const returnAmount = Number(order.returnAmounts?.totalMoney?.amount || 0);
          // const returnTax = Number(order.returnAmounts?.taxMoney.amount || 0);
          const returnTip = Number(order.returnAmounts?.tipMoney?.amount || 0);
          const returnDiscount = Number(order.returnAmounts?.discountMoney?.amount || 0);
          // const returnServiceCharge = Number(order.returnAmounts?.serviceChargeMoney.amount || 0);
          const returnProcessingFee =
            order.refunds?.reduce((acc: number, refund: Refund) => {
              return acc + Number(refund.processingFeeMoney?.amount || 0);
            }, 0) || 0;

          const returns = returnAmount + returnTip + returnDiscount - returnProcessingFee;

          return {
            orderId: order.id,
            amounts,
            taxes,
            tips,
            discounts,
            giftcardSales,
            returns
            // returns: order.returns,
            // tenders: order.tenders
          };
        });
      } else {
        console.log('Error fetching orders: ', ordersResult.errors);
      }
    } catch (error) {
      console.error(error);
      throw new Error('An error occurred while fetching sales data.');
    }

    const returns = parsedOrders.reduce((acc: number, order: SalesSummaryOrder) => acc + order.returns, 0);
    const discounts = parsedOrders.reduce((acc: number, order: SalesSummaryOrder) => acc + order.discounts, 0);
    const taxes = parsedOrders.reduce((acc: number, order: SalesSummaryOrder) => acc + order.taxes, 0);
    const tips = parsedOrders.reduce((acc: number, order: SalesSummaryOrder) => acc + order.tips, 0);
    const giftCards = parsedOrders.reduce((acc: number, order: SalesSummaryOrder) => acc + order.giftcardSales, 0);
    const totalSales = parsedOrders.reduce((acc: number, order: SalesSummaryOrder) => acc + order.amounts, 0);
    const netSales = totalSales - taxes - tips - giftCards;
    const grossSales = netSales + discounts + returns;
    const royalties = Math.ceil(grossSales * 0.06);
    const marketingFees = Math.ceil(grossSales * 0.02);

    return {
      grossSales: grossSales / 100,
      returns: returns / 100,
      discounts: discounts / 100,
      netSales: netSales / 100,
      taxes: taxes / 100,
      tips: tips / 100,
      giftCards: giftCards / 100,
      totalSales: totalSales / 100,
      royalties: royalties / 100,
      marketingFees: marketingFees / 100
    };
  };

  testGrossSales = async (): Promise<TestSalesSummary> => {
    // Read json file from disk
    const filePath = path.join(__dirname, './orders.json');
    const file = fs.readFileSync(filePath, 'utf8');
    const orders = JSON.parse(file);

    const parsedOrders: TestSalesSummaryOrder[] = orders.map((order: Order) => {
      const tenderAmount =
        order.tenders?.reduce((acc: number, tender: Tender) => {
          return acc + Number(tender.amountMoney?.amount || 0);
        }, 0) || 0;

      const processingFees =
        order.tenders?.reduce((acc: number, tender: Tender) => {
          return acc + Number(tender.processingFeeMoney?.amount || 0);
        }, 0) || 0;

      const giftcardSales =
        order.lineItems?.reduce((acc: number, lineItem: OrderLineItem) => {
          if (lineItem.itemType === 'GIFT_CARD') {
            return acc + Number(lineItem.totalMoney?.amount || 0);
          }

          return acc;
        }, 0) || 0;

      const netAmounts = Number(order.netAmounts?.totalMoney?.amount || 0);
      const netTaxes = Number(order.netAmounts?.taxMoney?.amount || 0);
      const netTips = Number(order.netAmounts?.tipMoney?.amount || 0);
      const netDiscounts = Number(order.netAmounts?.discountMoney?.amount || 0);

      const returnAmount = Number(order.returnAmounts?.totalMoney?.amount || 0);
      const returnTax = Number(order.returnAmounts?.taxMoney?.amount || 0);
      const returnTip = Number(order.returnAmounts?.tipMoney?.amount || 0);
      const returnDiscount = Number(order.returnAmounts?.discountMoney?.amount || 0);
      const returnServiceCharge = Number(order.returnAmounts?.serviceChargeMoney?.amount || 0);
      const returnProcessingFee = order.refunds?.reduce((acc: number, refund: Refund) => {
        return acc + Number(refund.processingFeeMoney?.amount || 0);
      }, 0);

      return {
        orderId: order.id,
        tenderAmount,
        processingFees,
        tenderTotal: tenderAmount - processingFees || 0,
        taxes: tenderAmount > 0 ? Number(order.totalTaxMoney?.amount || 0) : 0,
        tips: tenderAmount > 0 ? Number(order.totalTipMoney?.amount || 0) : 0,
        giftcardSales,
        discounts: Number(order.totalDiscountMoney?.amount || 0),
        returnAmount,
        returnTax,
        returnTip,
        returnDiscount,
        returnServiceCharge,
        returnProcessingFee: Number(returnProcessingFee || 0),
        netAmounts,
        netTaxes,
        netTips,
        netDiscounts,
        returns: order.returns,
        refunds: order.refunds,
        tenders: order.tenders
      };
    });

    const discounts = parsedOrders.reduce((acc: number, order: TestSalesSummaryOrder) => acc + (order.discounts - order.returnDiscount), 0);
    const taxes = parsedOrders.reduce((acc: number, order: TestSalesSummaryOrder) => acc + (order.taxes - order.returnTax), 0);
    const tips = parsedOrders.reduce((acc: number, order: TestSalesSummaryOrder) => acc + order.tips, 0);
    const giftCards = parsedOrders.reduce((acc: number, order: TestSalesSummaryOrder) => acc + order.giftcardSales, 0);
    const totalSales = parsedOrders.reduce(
      (acc: number, order: TestSalesSummaryOrder) => acc + (order.tenderAmount - order.returnAmount),
      0
    );
    const netSales = totalSales - taxes - tips - giftCards;
    const returnAmounts = parsedOrders.reduce((acc: number, order: TestSalesSummaryOrder) => acc + order.returnAmount, 0);
    const returnTaxes = parsedOrders.reduce((acc: number, order: TestSalesSummaryOrder) => acc + order.returnTax, 0);
    const returnTips = parsedOrders.reduce((acc: number, order: TestSalesSummaryOrder) => acc + order.returnTip, 0);
    const returnDiscounts = parsedOrders.reduce((acc: number, order: TestSalesSummaryOrder) => acc + order.returnDiscount, 0);
    const returnServiceCharges = parsedOrders.reduce((acc: number, order: TestSalesSummaryOrder) => acc + order.returnServiceCharge, 0);
    const returnProcessingFees = parsedOrders.reduce((acc: number, order: TestSalesSummaryOrder) => acc + order.returnProcessingFee, 0);
    const returns = returnAmounts + returnTips + returnDiscounts - returnProcessingFees;
    const grossSales = netSales + discounts + returns;
    const netAmounts = parsedOrders.reduce((acc: number, order: TestSalesSummaryOrder) => acc + order.netAmounts, 0);
    const netTaxes = parsedOrders.reduce((acc: number, order: TestSalesSummaryOrder) => acc + order.netTaxes, 0);
    const netTips = parsedOrders.reduce((acc: number, order: TestSalesSummaryOrder) => acc + order.netTips, 0);
    const netDiscounts = parsedOrders.reduce((acc: number, order: TestSalesSummaryOrder) => acc + order.netDiscounts, 0);

    return {
      grossSales: grossSales / 100,
      returns: returns / 100,
      discounts: discounts / 100,
      netSales: netSales / 100,
      taxes: taxes / 100,
      tips: tips / 100,
      giftCards: giftCards / 100,
      totalSales: totalSales / 100,
      returnAmounts: {
        amounts: returnAmounts / 100,
        taxes: returnTaxes / 100,
        tips: returnTips / 100,
        discounts: returnDiscounts / 100,
        serviceCharges: returnServiceCharges / 100,
        processingFees: returnProcessingFees / 100
      },
      netAmounts: {
        amounts: netAmounts / 100,
        taxes: netTaxes / 100,
        tips: netTips / 100,
        discounts: netDiscounts / 100
      },
      orders: parsedOrders
    };
  };

  private searchOrders = async (
    locationId: string,
    startDate: string | null,
    endDate: string | null
  ): Promise<{ orders: Order[]; errors: SquareError[] }> => {
    if (!startDate || !endDate) {
      throw new Error('Invalid date range.');
    }

    console.log(`Fetching orders for location ${locationId} from ${startDate} to ${endDate}.`);

    const { ordersApi } = this.squareClient;

    const limit = 500;

    let orders: Order[] = [];
    let currentCursor = undefined;
    let errors: SquareError[] = [];

    do {
      const response = await ordersApi.searchOrders({
        limit,
        cursor: currentCursor,
        locationIds: [locationId],
        query: {
          filter: {
            dateTimeFilter: {
              createdAt: {
                startAt: startDate,
                endAt: endDate
              }
            },
            stateFilter: {
              states: ['COMPLETED', 'OPEN']
            }
          }
        }
      });

      orders = orders.concat(response.result.orders || []);
      currentCursor = response.result.cursor;
      errors = errors.concat(response.result.errors || []);
    } while (currentCursor);

    // write file to disk
    const filePath = path.join(__dirname, 'orders.json');

    const replacer = (_key: string, value: unknown) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    };

    fs.writeFileSync(filePath, JSON.stringify(orders, replacer, 2));

    return {
      orders,
      errors
    };
  };
}
