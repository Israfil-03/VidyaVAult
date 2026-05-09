import { Subject } from '@prisma/client'

/**
 * Subject Code mapping (Physics, Chemistry, Mathematics):
 * - Selected subject keeps its letter (P/C/M)
 * - Unselected subject becomes O
 * Examples:
 * - PCM -> PCM
 * - PC  -> PCO
 * - PM  -> POM
 * - CM  -> OCM
 * - P   -> POO
 * - C   -> OCO
 * - M   -> OOM
 */
export const getSubjectCode = (subjects: Subject[]): string => {
  const hasPhysics = subjects.includes(Subject.PHYSICS)
  const hasChemistry = subjects.includes(Subject.CHEMISTRY)
  const hasMath = subjects.includes(Subject.MATHEMATICS)

  return `${hasPhysics ? 'P' : 'O'}${hasChemistry ? 'C' : 'O'}${hasMath ? 'M' : 'O'}`
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
 * Batch number mapping (Physics, Chemistry, Mathematics):
 * - Selected subject -> 1
 * - Unselected subject -> 0
 * Example: PCM -> 111, PC -> 110, PM -> 101
 */
export const getSubjectBatchNo = (subjects: Subject[]): string => {
  const hasPhysics = subjects.includes(Subject.PHYSICS)
  const hasChemistry = subjects.includes(Subject.CHEMISTRY)
  const hasMath = subjects.includes(Subject.MATHEMATICS)

  return `${hasPhysics ? '1' : '0'}${hasChemistry ? '1' : '0'}${hasMath ? '1' : '0'}`
}

/**
 * Long ID Formula: [Overall Serial 2 digits] + [Subject Code 3 chars] + [Class 2 digits] + [Medium 1 char] + [Batch No 3 digits] + [Year 2 digits] + [Batch Serial No 6 digits]
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
  const batchNoStr = params.batchNo.padStart(3, '0')
  const yearStr = (params.year % 100).toString().padStart(2, '0')
  const batchSerialStr = params.batchSerialNo.toString().padStart(6, '0')

  return `${serialStr}${subjectCode}${classStr}${mediumChar}${batchNoStr}${yearStr}${batchSerialStr}`
}
