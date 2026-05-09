import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

export const hashPassword = async (value: string): Promise<string> => 
  new Promise((resolve, reject) => {
    bcrypt.hash(value, SALT_ROUNDS, (err, hash) => {
      if (err) reject(err)
      else resolve(hash)
    })
  })

export const verifyPassword = async (value: string, hash: string): Promise<boolean> =>
  new Promise((resolve, reject) => {
    bcrypt.compare(value, hash, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
