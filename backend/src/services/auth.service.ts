import bcrypt from 'bcrypt'
import { prisma } from '../config/prisma'
import { ApiError } from '../utils/api-error'
import { signToken } from '../utils/jwt'
import { activityService } from './activity.service'
import { resolveUserPermissions } from './role-permissions.service'

const findUserByLoginIdentifier = async (identifier: string) => {
  const value = identifier.trim()
  return prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: value, mode: 'insensitive' } },
        { username: { equals: value, mode: 'insensitive' } },
      ],
    },
  })
}

export const authService = {
  register: async (input: { name: string; email: string; password: string }) => {
    const existingUser = await prisma.user.findUnique({ where: { email: input.email } })
    if (existingUser) throw new ApiError(409, 'Email already in use')

    const passwordHash = await bcrypt.hash(input.password, 10)
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: 'USER',
      },
    })

    await activityService.create({
      action: 'REGISTER',
      entityType: 'USER',
      entityId: user.id,
      description: 'User registered',
      userId: user.id,
    })

    const permissions = await resolveUserPermissions(user.id, user.role)
    const token = signToken({ userId: user.id, role: user.role, permissions })
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions,
      },
    }
  },

  login: async (input: { identifier: string; password: string }) => {
    const user = await findUserByLoginIdentifier(input.identifier)
    if (!user) throw new ApiError(401, 'Invalid email/username or password')

    const valid = await bcrypt.compare(input.password, user.passwordHash)
    if (!valid) throw new ApiError(401, 'Invalid email/username or password')

    await activityService.create({
      action: 'LOGIN',
      entityType: 'USER',
      entityId: user.id,
      description: 'User logged in',
      userId: user.id,
    })

    const permissions = await resolveUserPermissions(user.id, user.role)
    const token = signToken({ userId: user.id, role: user.role, permissions })
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions,
      },
    }
  },

  forgotPassword: async (input: { email: string }) => {
    const user = await prisma.user.findUnique({ where: { email: input.email } })
    if (user) {
      await activityService.create({
        action: 'PASSWORD_RESET_REQUEST',
        entityType: 'USER',
        entityId: user.id,
        description: 'Password reset requested',
        userId: user.id,
      })
    }

    return {
      message:
        'If an account exists for this email, an administrator will help you reset your password. Please contact your system admin.',
    }
  },

  refreshSession: async (userId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new ApiError(404, 'User not found')

    const permissions = await resolveUserPermissions(user.id, user.role)
    const token = signToken({ userId: user.id, role: user.role, permissions })
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions,
      },
    }
  },
}
