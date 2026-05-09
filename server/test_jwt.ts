import jwt from 'jsonwebtoken'

try {
  const payload = {
    userId: '123',
    role: 'superadmin',
    teacherId: undefined,
    forcePasswordChange: false
  }
  
  const token = jwt.sign(payload, 'secretsecretsecret')
  console.log('Token signed successfully')
  console.log('Decoded:', jwt.decode(token))
} catch (e) {
  console.log('Signing FAILED:', e instanceof Error ? e.message : String(e))
}
