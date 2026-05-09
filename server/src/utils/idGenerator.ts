import { Subject } from '@prisma/client'

/**
 * Subject Code mapping:
 * - Physics only → P0
 * - Chemistry only → C0
 * - Math only → M0
 * - Physics + Chemistry → PC
 * - Physics + Chemistry + Math → PCM
 */
export const getSubjectCode = (subjects: Subject[]): string => {
  const hasPhysics = subjects.includes(Subject.PHYSICS)
  const hasChemistry = subjects.includes(Subject.CHEMISTRY)
  const hasMath = subjects.includes(Subject.MATHEMATICS)

  if (hasPhysics && hasChemistry && hasMath) return 'PCM'
  if (hasPhysics && hasChemistry) return 'PC'
  if (hasPhysics && hasMath) return 'PM' // Extended
  if (hasChemistry && hasMath) return 'CM' // Extended
  if (hasPhysics) return 'P0'
  if (hasChemistry) return 'C0'
  if (hasMath) return 'M0'
  
  return 'XX' // Fallback
}

/**
 * Short ID Formula: [Overall Serial 2 digits] + [Class 2 digits] + [Medium 1 char] + [Year last 2 digits]
 */
export const generateShortId = (params: {
  overallSerial: number
  classLevel: string
  medium: 'ENGLISH' | 'BENGALI'
  year: number
}): string => {
  const serialStr = params.overallSerial.toString().padStart(2, '0')
  const classStr = params.classLevel.padStart(2, '0')
  const mediumChar = params.medium === 'BENGALI' ? 'B' : 'E'
  const yearStr = (params.year % 100).toString().padStart(2, '0')

  return `${serialStr}${classStr}${mediumChar}${yearStr}`
}

/**
 * Long ID Formula: [Overall Serial 2 digits] + [Subject Code 2-3 chars] + [Class 2 digits] + [Medium 1 char] + [Batch No 2-3 digits] + [Year 4 digits as 0026] + [Batch Serial No 6 digits]
 */
export const generateLongId = (params: {
  overallSerial: number
  subjects: Subject[]
  classLevel: string
  medium: 'ENGLISH' | 'BENGALI'
  batchNo: string
  year: number
  batchSerialNo: number
}): string => {
  const serialStr = params.overallSerial.toString().padStart(2, '0')
  const subjectCode = getSubjectCode(params.subjects)
  const classStr = params.classLevel.padStart(2, '0')
  const mediumChar = params.medium === 'BENGALI' ? 'B' : 'E'
  const batchNoStr = params.batchNo.padStart(2, '0') // 2-3 digits
  const yearStr = params.year.toString().padStart(4, '0').replace(/^20/, '00') // Year 2026 -> 0026 as per requirement
  const batchSerialStr = params.batchSerialNo.toString().padStart(6, '0')

  return `${serialStr}${subjectCode}${classStr}${mediumChar}${batchNoStr}${yearStr}${batchSerialStr}`
}
