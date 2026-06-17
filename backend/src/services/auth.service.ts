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

    return {
      message: 'Account created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
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

  getProfile: async (userId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new ApiError(404, 'User not found')

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    }
  },

  updateProfile: async (userId: string, input: { name: string }) => {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new ApiError(404, 'User not found')

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name: input.name.trim() },
    })

    await activityService.create({
      action: 'UPDATE',
      entityType: 'USER',
      entityId: userId,
      description: 'User updated profile',
      userId,
    })

    const permissions = await resolveUserPermissions(updated.id, updated.role)
    const token = signToken({ userId: updated.id, role: updated.role, permissions })
    return {
      token,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        permissions,
      },
    }
  },

  changePassword: async (
    userId: string,
    input: { currentPassword: string; newPassword: string },
  ) => {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new ApiError(404, 'User not found')

    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash)
    if (!valid) throw new ApiError(400, 'Current password is incorrect')

    const passwordHash = await bcrypt.hash(input.newPassword, 10)
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    })

    await activityService.create({
      action: 'PASSWORD_CHANGE',
      entityType: 'USER',
      entityId: userId,
      description: 'User changed password',
      userId,
    })

    return { message: 'Password updated successfully' }
  },

  deleteAccount: async (userId: string, input: { password: string }) => {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new ApiError(404, 'User not found')

    const valid = await bcrypt.compare(input.password, user.passwordHash)
    if (!valid) throw new ApiError(400, 'Password is incorrect')

    if (user.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
      if (adminCount <= 1) {
        throw new ApiError(400, 'Cannot delete the last admin account')
      }
    }

    await prisma.$executeRaw`DELETE FROM admin_user_roles WHERE "userId" = ${userId}`
    await prisma.user.delete({ where: { id: userId } })

    return { message: 'Account deleted successfully' }
  },
}
