import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { Client } from 'pg';
import { InjectClient } from 'nest-postgres';

import { v4 } from 'uuid';

import { User } from '../models';

@Injectable()
export class UsersService {
  constructor(@InjectClient() private readonly pg: Client) {}

  private readonly users: Record<string, User>;

  async findOne(userId: string): Promise<User> {
    try {
      const queryResults = await this.pg.query(
        'SELECT * FROM users WHERE id=$1',
        [userId],
      );
  
      return queryResults.rows[0]
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async createOne({ name, password, email }: User): Promise<User> {
    try {
      const id = v4();

      const result = await this.pg.query(
        'INSERT INTO users (id, name, email, password) VALUES ($1, $2, $3, $4) RETURNING *',
        [id, name, email, password],
      );
  
      return result.rows[0];
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

}
