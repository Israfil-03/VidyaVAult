import { describe, expect, it } from 'vitest'

import { canAccessTeacherResource, requireTeacherId } from './accessService.js'

describe('canAccessTeacherResource', () => {
  it('allows superadmin access to any teacher resource', () => {
    expect(
      canAccessTeacherResource({ role: 'superadmin', teacherId: undefined }, 'teacher-1'),
    ).toBe(true)
  })

  it('allows teacher access to owned resources only', () => {
    expect(
      canAccessTeacherResource({ role: 'teacher_admin', teacherId: 'teacher-1' }, 'teacher-1'),
    ).toBe(true)
    expect(
      canAccessTeacherResource({ role: 'teacher_admin', teacherId: 'teacher-1' }, 'teacher-2'),
    ).toBe(false)
  })

  it('blocks student access to teacher resources', () => {
    expect(canAccessTeacherResource({ role: 'student', teacherId: undefined }, 'teacher-1')).toBe(
      false,
    )
  })
})

describe('requireTeacherId', () => {
  it('returns the teacher id for teacher_admin', () => {
    expect(
      requireTeacherId({
        userId: 'u1',
        role: 'teacher_admin',
        teacherId: 't1',
        forcePasswordChange: false,
      }),
    ).toBe('t1')
  })

  it('throws for missing teacher scope', () => {
    expect(() =>
      requireTeacherId({
        userId: 'u1',
        role: 'teacher_admin',
        forcePasswordChange: false,
      }),
    ).toThrow('Teacher scope is required')
  })
})
