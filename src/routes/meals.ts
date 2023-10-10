import { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { knex } from '../database'
import { checkUserIdExists } from '../middlewares/check-user-id-exists'

export async function mealsRoutes(app: FastifyInstance) {
  app.get(
    '/',
    {
      preHandler: [checkUserIdExists],
    },
    async (request) => {
      const { userId } = request.cookies

      const meals = await knex('meals')
        .select()
        .where({
          user_id: userId,
        })
        .orderBy('date_time', 'desc')

      return {
        meals,
      }
    },
  )

  app.get(
    '/:id',
    {
      preHandler: [checkUserIdExists],
    },
    async (request) => {
      const { userId } = request.cookies

      const getMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = getMealParamsSchema.parse(request.params)

      const meal = await knex('meals')
        .where({
          id,
          user_id: userId,
        })
        .first()

      return {
        meal,
      }
    },
  )

  app.get(
    '/metrics',
    {
      preHandler: [checkUserIdExists],
    },
    async (request) => {
      const { userId } = request.cookies

      const meals = await knex('meals')
        .select()
        .where({
          user_id: userId,
        })
        .orderBy('date_time', 'desc')

      const onDietMeals = meals.reduce(
        (total, meal) => (meal.on_diet ? ++total : total),
        0,
      )

      const offDietMeals = meals.reduce(
        (total, meal) => (!meal.on_diet ? ++total : total),
        0,
      )

      let bestSequence = 0
      let bestSequenceSoFar = 0

      meals.forEach((meal) => {
        meal.on_diet ? bestSequenceSoFar++ : (bestSequenceSoFar = 0)

        if (bestSequenceSoFar > bestSequence) {
          bestSequence = bestSequenceSoFar
        }
      })

      return {
        metrics: {
          recorded_meals: meals.length,
          on_diet_meals: onDietMeals,
          off_diet_meals: offDietMeals,
          best_sequence: bestSequence,
        },
      }
    },
  )

  app.post('/', async (request, reply) => {
    const createMealBodySchema = z.object({
      name: z.string(),
      description: z.string().optional(),
      dateTime: z.coerce.date(),
      onDiet: z.boolean(),
    })

    const { name, description, dateTime, onDiet } = createMealBodySchema.parse(
      request.body,
    )

    let userId = request.cookies.userId

    if (!userId) {
      userId = randomUUID()

      reply.cookie('userId', userId, {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      })
    }

    await knex('meals').insert({
      id: randomUUID(),
      user_id: userId,
      name,
      description,
      date_time: String(dateTime),
      on_diet: onDiet,
    })

    return reply.status(201).send()
  })

  app.put(
    '/:id',
    {
      preHandler: [checkUserIdExists],
    },
    async (request, reply) => {
      const { userId } = request.cookies

      const getMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = getMealParamsSchema.parse(request.params)

      const meal = await knex('meals')
        .where({
          user_id: userId,
          id,
        })
        .first()

      if (!meal) {
        throw new Error('Not Found')
      }

      const updateMealBodySchema = z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        dateTime: z.coerce.date().optional(),
        onDiet: z.boolean().optional(),
      })

      const { name, description, dateTime, onDiet } =
        updateMealBodySchema.parse(request.body)

      await knex('meals')
        .where({
          id,
          user_id: userId,
        })
        .update({
          name,
          description,
          date_time: dateTime ? String(dateTime) : undefined,
          on_diet: onDiet,
        })

      return reply.status(204).send()
    },
  )

  app.delete(
    '/:id',
    {
      preHandler: [checkUserIdExists],
    },
    async (request, reply) => {
      const { userId } = request.cookies

      const getMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = getMealParamsSchema.parse(request.params)

      const meal = await knex('meals')
        .where({
          user_id: userId,
          id,
        })
        .first()

      if (!meal) {
        throw new Error('Not Found')
      }

      await knex('meals')
        .where({
          id,
          user_id: userId,
        })
        .del()

      return reply.status(204).send()
    },
  )
}
