import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { v4 } from 'uuid';

import { Client } from 'pg';
import { InjectClient } from 'nest-postgres';

import { Order } from '../models';

@Injectable()
export class OrderService {
  constructor(@InjectClient() private readonly pg: Client) { }
  private orders: Record<string, Order> = {}

  async findById(orderId: string): Promise<Order> {
    try {
      const result = await this.pg.query(
        'SELECT * FROM orders WHERE id=$1',
        [orderId],
      );

      return result.rows[0];
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async create(data: Order): Promise<Order> {
    try {
      const id = v4()
      const order = {
        ...data,
        id,
        status: data.status || 'IN PROGRESS',
      };

      const result = await this.pg.query(
        'INSERT INTO orders (id, user_id, cart_id, payment, delivery, comments, status, total) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [order.id, order.user_id, order.cart_id, JSON.stringify(order.payment), JSON.stringify(order.delivery), order.comments, order.status, order.total],
      );

      return result.rows[0];
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async update(orderId: string, data: Partial<Order>): Promise<void> {
    const order = await this.findById(orderId);

    if (!order) {
      throw new NotFoundException();
    }

    try {
      const orderUpdates = Object.entries(data).map(updateEntry => {
        if (['payment', 'delivery'].includes(updateEntry[0])) {
          const [key, value] = updateEntry;

          return [key, JSON.stringify(value)]
        }

        return updateEntry;
      });

      await this.pg.query(
        `UPDATE orders SET ${orderUpdates.map((updateEntry, idx) => {
          const [key, _] = updateEntry;

          return `${key}=$${idx + 2}`
        }).join(', ')} WHERE id=$1 RETURNING *`,
        [
          orderId,
          ...orderUpdates.map(updateEntry => updateEntry[1]),
        ],
      );
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }
}
