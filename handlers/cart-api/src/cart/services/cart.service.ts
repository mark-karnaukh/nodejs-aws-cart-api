import { Injectable } from '@nestjs/common';

import { v4 } from 'uuid';
import moment from 'moment';

import { Client } from 'pg';
import { InjectClient } from 'nest-postgres';

import { Cart } from '../models';

@Injectable()
export class CartService {
  constructor(@InjectClient() private readonly pg: Client) {}

  async findByUserId(userId: string): Promise<Cart> {
    const userCart = await this.pg.query(
      'SELECT * FROM carts WHERE user_id=$1',
      [userId],
    );

    const cartItems = await this.pg.query(
      'SELECT * FROM cart_items WHERE cart_id=$1',
      [userCart.rows[0].id],
    );

    return { ...userCart.rows[0], items: [...cartItems.rows] };
  }

  async createByUserId(userId: string): Promise<Cart> {
    const id = v4();

    // Creation date: PostgreSQL timestamp format
    const date = moment().format('YYYY-MM-DD HH:mm:ss');

    const result = await this.pg.query(
      'INSERT INTO carts (id, user_id, created_at, updated_at, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, userId, date, date, 'OPEN'],
    );

    return { ...result.rows[0], items: [] } as Cart;
  }

  async findOrCreateByUserId(userId: string): Promise<Cart> {
    const userCart = await this.findByUserId(userId);

    if (userCart) {
      return userCart;
    }

    return await this.createByUserId(userId);
  }

  async updateByUserId(userId: string, { items }: Cart): Promise<Cart> {
    const { id, ...rest } = await this.findOrCreateByUserId(userId);

    const cartItems = (
      await Promise.all(
        items.map((item) => {
          return this.pg.query(
            'INSERT INTO cart_items (cart_id, product_id, count) VALUES ($1, $2, $3) RETURNING *',
            [id, item.product.id, item.count],
          );
        }),
      )
    ).map((result) => result.rows[0]);

    const updatedCart = {
      id,
      ...rest,
      items: [...cartItems],
    };

    return { ...updatedCart };
  }

  async removeByUserId(userId): Promise<void> {
    const removedCart = await this.findByUserId(userId);

    await this.pg.query('DELETE FROM cart_items WHERE cart_id=$1', [
      removedCart.id,
    ]);

    await this.pg.query('DELETE FROM cart WHERE user_id=$1', [userId]);
  }
}
