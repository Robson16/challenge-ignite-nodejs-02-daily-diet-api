// eslint-disable-next-line prettier/prettier
import { Knex } from 'knex'

declare module 'knex/types/tables' {
  export interface Tables {
    meals: {
      id: string
      user_id: string
      name: string
      description: string
      date_time: string
      on_diet: boolean
      created_at: string
    }
  }
}
