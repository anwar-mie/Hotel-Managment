import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BillingService } from './billing.service.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import {
  createInvoiceSchema,
  addInvoiceItemSchema,
  recordPaymentSchema,
  createServiceSchema,
  updateServiceSchema,
  createServiceOrderSchema,
  invoiceFilterSchema,
} from 'shared-schemas';
import type {
  IInvoice,
  IService,
  IServiceOrder,
  ICreateInvoiceInput,
  IAddInvoiceItemInput,
  IRecordPaymentInput,
  ICreateServiceInput,
  IUpdateServiceInput,
  ICreateServiceOrderInput,
  IInvoiceFilterQuery,
  IBillingSummary,
} from 'shared-types';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('invoices/summary')
  @Roles('ADMIN', 'MANAGER', 'ACCOUNTANT')
  async getBillingSummary(): Promise<IBillingSummary> {
    return this.billingService.getBillingSummary();
  }

  @Get('invoices')
  @Roles('ADMIN', 'MANAGER', 'ACCOUNTANT', 'RECEPTIONIST')
  @UsePipes(new ZodValidationPipe(invoiceFilterSchema))
  async findAllInvoices(@Query() query: IInvoiceFilterQuery): Promise<{
    data: IInvoice[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    return this.billingService.findAllInvoices(query);
  }

  @Get('invoices/:id')
  @Roles('ADMIN', 'MANAGER', 'ACCOUNTANT', 'RECEPTIONIST')
  async findInvoice(@Param('id') id: string): Promise<IInvoice> {
    return this.billingService.findInvoice(id);
  }

  @Post('invoices')
  @Roles('ADMIN', 'MANAGER', 'ACCOUNTANT', 'RECEPTIONIST')
  @UsePipes(new ZodValidationPipe(createInvoiceSchema))
  async generateInvoice(
    @Body() body: ICreateInvoiceInput,
    @CurrentUser('id') userId?: string,
  ): Promise<IInvoice> {
    return this.billingService.generateInvoiceForReservation(body, userId);
  }

  @Post('invoices/:id/items')
  @Roles('ADMIN', 'MANAGER', 'ACCOUNTANT', 'RECEPTIONIST')
  @UsePipes(new ZodValidationPipe(addInvoiceItemSchema))
  async addInvoiceItem(
    @Param('id') id: string,
    @Body() body: IAddInvoiceItemInput,
  ): Promise<IInvoice> {
    return this.billingService.addInvoiceItem(id, body);
  }

  @Delete('invoices/:id/items/:itemId')
  @Roles('ADMIN', 'MANAGER', 'ACCOUNTANT')
  async removeInvoiceItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ): Promise<IInvoice> {
    return this.billingService.removeInvoiceItem(id, itemId);
  }

  @Post('invoices/:id/payments')
  @Roles('ADMIN', 'MANAGER', 'ACCOUNTANT', 'RECEPTIONIST')
  @UsePipes(new ZodValidationPipe(recordPaymentSchema))
  async recordPayment(
    @Param('id') id: string,
    @Body() body: IRecordPaymentInput,
    @CurrentUser('id') userId?: string,
  ): Promise<IInvoice> {
    return this.billingService.recordPayment(id, body, userId);
  }

  @Post('payments/:paymentId/refund')
  @Roles('ADMIN', 'MANAGER', 'ACCOUNTANT')
  @HttpCode(HttpStatus.OK)
  async refundPayment(
    @Param('paymentId') paymentId: string,
    @CurrentUser('id') userId?: string,
  ): Promise<IInvoice> {
    return this.billingService.refundPayment(paymentId, userId);
  }

  @Post('invoices/:id/void')
  @Roles('ADMIN', 'MANAGER', 'ACCOUNTANT')
  @HttpCode(HttpStatus.OK)
  async voidInvoice(
    @Param('id') id: string,
    @CurrentUser('id') userId?: string,
  ): Promise<IInvoice> {
    return this.billingService.voidInvoice(id, userId);
  }

  // ============================================================================
  // SERVICES & ORDERS
  // ============================================================================

  @Get('services')
  async findAllServices(): Promise<IService[]> {
    return this.billingService.findAllServices();
  }

  @Post('services')
  @Roles('ADMIN', 'MANAGER')
  @UsePipes(new ZodValidationPipe(createServiceSchema))
  async createService(@Body() body: ICreateServiceInput): Promise<IService> {
    return this.billingService.createService(body);
  }

  @Patch('services/:id')
  @Roles('ADMIN', 'MANAGER')
  @UsePipes(new ZodValidationPipe(updateServiceSchema))
  async updateService(
    @Param('id') id: string,
    @Body() body: IUpdateServiceInput,
  ): Promise<IService> {
    return this.billingService.updateService(id, body);
  }

  @Post('service-orders')
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
  @UsePipes(new ZodValidationPipe(createServiceOrderSchema))
  async createServiceOrder(
    @Body() body: ICreateServiceOrderInput,
    @CurrentUser('id') userId?: string,
  ): Promise<IServiceOrder> {
    return this.billingService.createServiceOrder(body, userId);
  }
}
