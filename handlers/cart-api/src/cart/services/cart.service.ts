import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { v4 } from 'uuid';
import moment from 'moment';

import { Client } from 'pg';
import { InjectClient } from 'nest-postgres';

import { Cart } from '../models';

// TODO: Provide error handling
@Injectable()
export class CartService {
  constructor(@InjectClient() private readonly pg: Client) {}

  async findByUserId(userId: string): Promise<Cart> {
    try {
      const userCart = await this.pg.query(
        'SELECT * FROM carts WHERE user_id=$1',
        [userId],
      );
  
      const cartItems = await this.pg.query(
        'SELECT * FROM cart_items WHERE cart_id=$1',
        [userCart.rows[0].id],
      );
  
      return { ...userCart.rows[0], items: [...cartItems.rows] };
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async createByUserId(userId: string): Promise<Cart> {
    try {
      const id = v4();

      // Creation date: PostgreSQL timestamp format
      const date = moment().format('YYYY-MM-DD HH:mm:ss');
  
      const result = await this.pg.query(
        'INSERT INTO carts (id, user_id, created_at, updated_at, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [id, userId, date, date, 'OPEN'],
      );
  
      return { ...result.rows[0], items: [] };
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async findOrCreateByUserId(userId: string): Promise<Cart> {
    try {
      const userCart = await this.findByUserId(userId);

      if (userCart) {
        return userCart;
      }
  
      return await this.createByUserId(userId);
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async updateByUserId(userId: string, { items = [], status }: Partial<Cart>): Promise<Cart> {
    try {
      const { id, ...rest } = await this.findOrCreateByUserId(userId);

      // Creation date: PostgreSQL timestamp format
      const date = moment().format('YYYY-MM-DD HH:mm:ss');
  
      const cartUpdates = ['updated_at=$1', ...(status ? ['status=$1'] : [])]
  
      await await this.pg.query(
        `UPDATE carts SET ${cartUpdates.join(', ')} WHERE user_id=$1 RETURNING *`,
        [userId, date, ],
      );
  
      const insertedCartItems = (
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
        items: [...rest.items, ...insertedCartItems],
      };
  
      return { ...updatedCart };
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async removeByUserId(userId): Promise<void> {
    try {
      const removedCart = await this.findByUserId(userId);

      await this.pg.query('DELETE FROM cart_items WHERE cart_id=$1', [
        removedCart.id,
      ]);
  
      await this.pg.query('DELETE FROM cart WHERE user_id=$1', [userId]);
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }
}
