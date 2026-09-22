import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  IInvoice,
  IInvoiceItem,
  IPayment,
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

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  private generateInvoiceNumber(): string {
    const yearMonth = new Date().toISOString().slice(2, 7).replace('-', '');
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `INV-${yearMonth}-${random}`;
  }

  private mapInvoice(inv: any): IInvoice {
    const items = (inv.items || []).map((it: any) => ({
      ...it,
      unitPrice: Number(it.unitPrice),
      total: Number(it.total),
    }));

    const payments = (inv.payments || []).map((p: any) => ({
      ...p,
      amount: Number(p.amount),
    }));

    const totalPaid = payments
      .filter((p: any) => p.status === 'COMPLETED')
      .reduce((sum: number, p: any) => sum + p.amount, 0);

    const invoiceTotal = Number(inv.total);
    const balanceDue = Math.max(0, invoiceTotal - totalPaid);

    return {
      ...inv,
      subtotal: Number(inv.subtotal),
      tax: Number(inv.tax),
      discount: Number(inv.discount),
      total: invoiceTotal,
      items,
      payments,
      totalPaid,
      balanceDue,
    };
  }

  async generateInvoiceForReservation(
    input: ICreateInvoiceInput,
    userId?: string,
  ): Promise<IInvoice> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: input.reservationId },
      include: {
        stays: {
          include: {
            room: true,
            roomType: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID '${input.reservationId}' not found`);
    }

    if (reservation.stays.length === 0) {
      throw new BadRequestException('Cannot generate invoice for reservation without stays');
    }

    const itemsToCreate: { description: string; quantity: number; unitPrice: number; total: number }[] = [];

    // 1. Calculate room nights for each stay
    for (const stay of reservation.stays) {
      const checkIn = new Date(stay.checkInDate).getTime();
      const checkOut = new Date(stay.checkOutDate).getTime();
      const diffMs = checkOut - checkIn;
      const nights = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      const rate = Number(stay.ratePerNight);
      const stayTotal = nights * rate;

      const roomInfo = stay.room ? `Room ${stay.room.number}` : 'Unassigned Room';
      const desc = `${roomInfo} (${stay.roomType.name}) - ${nights} night(s) @ $${rate.toFixed(2)}`;

      itemsToCreate.push({
        description: desc,
        quantity: nights,
        unitPrice: rate,
        total: stayTotal,
      });
    }

    // 2. Attach any uninvoiced service orders for this reservation
    const serviceOrders = await this.prisma.serviceOrder.findMany({
      where: {
        reservationId: input.reservationId,
        status: { not: 'CANCELLED' },
      },
      include: { service: true },
    });

    for (const order of serviceOrders) {
      itemsToCreate.push({
        description: `Service: ${order.service.name} (Qty: ${order.quantity})`,
        quantity: order.quantity,
        unitPrice: Number(order.unitPrice),
        total: Number(order.total),
      });
    }

    const subtotal = itemsToCreate.reduce((sum, it) => sum + it.total, 0);
    const taxRate = input.taxRatePercent ?? 10;
    const tax = Number(((subtotal * taxRate) / 100).toFixed(2));
    const discount = Number((input.discount ?? 0).toFixed(2));
    const total = Number(Math.max(0, subtotal + tax - discount).toFixed(2));

    let invoiceNumber = this.generateInvoiceNumber();
    while (await this.prisma.invoice.findUnique({ where: { invoiceNumber } })) {
      invoiceNumber = this.generateInvoiceNumber();
    }

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        reservationId: input.reservationId,
        subtotal,
        tax,
        discount,
        total,
        status: 'ISSUED',
        issuedAt: new Date(),
        items: {
          create: itemsToCreate,
        },
      },
      include: {
        items: true,
        payments: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'INVOICE_GENERATED',
        entityType: 'Invoice',
        entityId: invoice.id,
        userId: userId ?? null,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          total: invoice.total,
        },
      },
    });

    return this.mapInvoice(invoice);
  }

  async findAllInvoices(filter?: IInvoiceFilterQuery): Promise<{
    data: IInvoice[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.reservationId) {
      where.reservationId = filter.reservationId;
    }

    if (filter?.search) {
      where.invoiceNumber = { contains: filter.search, mode: 'insensitive' };
    }

    const [total, invoices] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          payments: true,
        },
      }),
    ]);

    return {
      data: invoices.map((inv: any) => this.mapInvoice(inv)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findInvoice(id: string): Promise<IInvoice> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID '${id}' not found`);
    }

    return this.mapInvoice(invoice);
  }

  async addInvoiceItem(
    invoiceId: string,
    item: IAddInvoiceItemInput,
  ): Promise<IInvoice> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID '${invoiceId}' not found`);
    }

    if (invoice.status === 'PAID' || invoice.status === 'VOID') {
      throw new BadRequestException(
        `Cannot add items to invoice with status '${invoice.status}'`,
      );
    }

    const itemTotal = Number((item.quantity * item.unitPrice).toFixed(2));

    await this.prisma.invoiceItem.create({
      data: {
        invoiceId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: itemTotal,
      },
    });

    // Recalculate totals
    const currentSubtotal = Number(invoice.subtotal) + itemTotal;
    const currentTax = Number(invoice.tax);
    const currentDiscount = Number(invoice.discount);
    const newTotal = Number(
      Math.max(0, currentSubtotal + currentTax - currentDiscount).toFixed(2),
    );

    const updated = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        subtotal: currentSubtotal,
        total: newTotal,
      },
      include: {
        items: true,
        payments: true,
      },
    });

    return this.mapInvoice(updated);
  }

  async removeInvoiceItem(
    invoiceId: string,
    itemId: string,
  ): Promise<IInvoice> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID '${invoiceId}' not found`);
    }

    if (invoice.status === 'PAID' || invoice.status === 'VOID') {
      throw new BadRequestException(`Cannot modify invoice with status '${invoice.status}'`);
    }

    const targetItem = invoice.items.find((it: { id: string }) => it.id === itemId);
    if (!targetItem) {
      throw new NotFoundException(`Invoice item '${itemId}' not found on this invoice`);
    }

    await this.prisma.invoiceItem.delete({
      where: { id: itemId },
    });

    const newSubtotal = Number(
      Math.max(0, Number(invoice.subtotal) - Number(targetItem.total)).toFixed(2),
    );
    const currentTax = Number(invoice.tax);
    const currentDiscount = Number(invoice.discount);
    const newTotal = Number(
      Math.max(0, newSubtotal + currentTax - currentDiscount).toFixed(2),
    );

    const updated = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        subtotal: newSubtotal,
        total: newTotal,
      },
      include: {
        items: true,
        payments: true,
      },
    });

    return this.mapInvoice(updated);
  }

  async recordPayment(
    invoiceId: string,
    input: IRecordPaymentInput,
    userId?: string,
  ): Promise<IInvoice> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true, items: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID '${invoiceId}' not found`);
    }

    if (invoice.status === 'VOID') {
      throw new BadRequestException('Cannot apply payments to a VOID invoice');
    }

    const payment = await this.prisma.payment.create({
      data: {
        invoiceId,
        amount: input.amount,
        method: input.method,
        status: 'COMPLETED',
        transactionReference: input.transactionReference ?? null,
        paidAt: new Date(),
      },
    });

    // Recompute total completed payments
    const previousCompleted = invoice.payments
      .filter((p: { status: string; amount: any }) => p.status === 'COMPLETED')
      .reduce((sum: number, p: { amount: any }) => sum + Number(p.amount), 0);

    const totalPaid = previousCompleted + input.amount;
    const invoiceTotal = Number(invoice.total);

    let nextStatus = invoice.status;
    let paidAt = invoice.paidAt;

    if (totalPaid >= invoiceTotal) {
      nextStatus = 'PAID';
      paidAt = new Date();
    } else if (totalPaid > 0) {
      nextStatus = 'PARTIALLY_PAID';
    }

    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: nextStatus,
        paidAt,
      },
      include: {
        items: true,
        payments: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'PAYMENT_RECORDED',
        entityType: 'Payment',
        entityId: payment.id,
        userId: userId ?? null,
        metadata: {
          invoiceId,
          amount: input.amount,
          method: input.method,
          newStatus: nextStatus,
        },
      },
    });

    return this.mapInvoice(updatedInvoice);
  }

  async refundPayment(
    paymentId: string,
    userId?: string,
  ): Promise<IInvoice> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: { include: { payments: true, items: true } } },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID '${paymentId}' not found`);
    }

    if (payment.status === 'REFUNDED') {
      throw new BadRequestException('Payment has already been refunded');
    }

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'REFUNDED' },
    });

    // Recompute remaining active payments
    const remainingPaid = payment.invoice.payments
      .filter((p: { id: string; status: string; amount: any }) => p.id !== paymentId && p.status === 'COMPLETED')
      .reduce((sum: number, p: { amount: any }) => sum + Number(p.amount), 0);

    let newStatus = payment.invoice.status;
    if (remainingPaid >= Number(payment.invoice.total)) {
      newStatus = 'PAID';
    } else if (remainingPaid > 0) {
      newStatus = 'PARTIALLY_PAID';
    } else {
      newStatus = 'ISSUED';
    }

    const updated = await this.prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: {
        status: newStatus,
        paidAt: newStatus === 'PAID' ? payment.invoice.paidAt : null,
      },
      include: {
        items: true,
        payments: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'PAYMENT_REFUNDED',
        entityType: 'Payment',
        entityId: paymentId,
        userId: userId ?? null,
      },
    });

    return this.mapInvoice(updated);
  }

  async voidInvoice(
    id: string,
    userId?: string,
  ): Promise<IInvoice> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID '${id}' not found`);
    }

    const hasActivePayments = invoice.payments.some(
      (p: { status: string }) => p.status === 'COMPLETED',
    );

    if (hasActivePayments) {
      throw new BadRequestException(
        'Cannot void an invoice with active completed payments. Refund payments first.',
      );
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: 'VOID' },
      include: {
        items: true,
        payments: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'INVOICE_VOIDED',
        entityType: 'Invoice',
        entityId: id,
        userId: userId ?? null,
      },
    });

    return this.mapInvoice(updated);
  }

  async getBillingSummary(): Promise<IBillingSummary> {
    const [allInvoices, completedPayments, statusCounts] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { status: { not: 'VOID' } },
        select: { total: true },
      }),
      this.prisma.payment.findMany({
        where: { status: 'COMPLETED' },
        select: { amount: true },
      }),
      this.prisma.invoice.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    const totalInvoiced = allInvoices.reduce(
      (sum: number, inv: { total: any }) => sum + Number(inv.total),
      0,
    );
    const totalPaid = completedPayments.reduce(
      (sum: number, p: { amount: any }) => sum + Number(p.amount),
      0,
    );
    const totalOutstanding = Math.max(0, totalInvoiced - totalPaid);

    const counts: Record<string, number> = {};
    for (const group of statusCounts) {
      counts[group.status] = group._count.id;
    }

    return {
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      invoicesCount: {
        draft: counts['DRAFT'] ?? 0,
        issued: counts['ISSUED'] ?? 0,
        partiallyPaid: counts['PARTIALLY_PAID'] ?? 0,
        paid: counts['PAID'] ?? 0,
        void: counts['VOID'] ?? 0,
      },
    };
  }

  // ============================================================================
  // ANCILLARY SERVICES & SERVICE ORDERS
  // ============================================================================

  async findAllServices(): Promise<IService[]> {
    const services = await this.prisma.service.findMany({
      orderBy: { name: 'asc' },
    });

    return services.map((s: any) => ({
      ...s,
      price: Number(s.price),
    }));
  }

  async createService(input: ICreateServiceInput): Promise<IService> {
    const existing = await this.prisma.service.findUnique({
      where: { name: input.name },
    });

    if (existing) {
      throw new ConflictException(`Service with name '${input.name}' already exists`);
    }

    const created = await this.prisma.service.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        price: input.price,
      },
    });

    return {
      ...created,
      price: Number(created.price),
    };
  }

  async updateService(id: string, input: IUpdateServiceInput): Promise<IService> {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException(`Service '${id}' not found`);
    }

    if (input.name) {
      const duplicate = await this.prisma.service.findFirst({
        where: { name: input.name, NOT: { id } },
      });
      if (duplicate) {
        throw new ConflictException(`Another service with name '${input.name}' already exists`);
      }
    }

    const updated = await this.prisma.service.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.price !== undefined && { price: input.price }),
        ...(input.active !== undefined && { active: input.active }),
      },
    });

    return {
      ...updated,
      price: Number(updated.price),
    };
  }

  async createServiceOrder(
    input: ICreateServiceOrderInput,
    userId?: string,
  ): Promise<IServiceOrder> {
    const service = await this.prisma.service.findUnique({
      where: { id: input.serviceId },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID '${input.serviceId}' not found`);
    }

    if (!service.active) {
      throw new BadRequestException(`Service '${service.name}' is currently inactive`);
    }

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: input.reservationId },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID '${input.reservationId}' not found`);
    }

    const unitPrice = Number(service.price);
    const orderTotal = Number((unitPrice * input.quantity).toFixed(2));

    const order = await this.prisma.serviceOrder.create({
      data: {
        serviceId: input.serviceId,
        reservationId: input.reservationId,
        quantity: input.quantity,
        unitPrice,
        total: orderTotal,
        status: 'PENDING',
      },
      include: {
        service: true,
      },
    });

    // Optionally post directly to reservation's active invoice
    if (input.postToInvoice !== false) {
      const activeInvoice = await this.prisma.invoice.findFirst({
        where: {
          reservationId: input.reservationId,
          status: { in: ['DRAFT', 'ISSUED', 'PARTIALLY_PAID'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (activeInvoice) {
        await this.addInvoiceItem(activeInvoice.id, {
          description: `Service: ${service.name} (x${input.quantity})`,
          quantity: input.quantity,
          unitPrice,
        });
      }
    }

    return {
      ...order,
      unitPrice,
      total: orderTotal,
      service: {
        ...order.service,
        price: Number(order.service.price),
      },
    };
  }
}
