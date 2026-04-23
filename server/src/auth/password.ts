import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

export const hashPassword = async (value: string): Promise<string> => bcrypt.hash(value, SALT_ROUNDS)

export const verifyPassword = async (value: string, hash: string): Promise<boolean> =>
  bcrypt.compare(value, hash)
