import { MeetingStatus } from './types';

// Plain (non-'use server') module: a 'use server' file may only export async
// functions, so this synchronous validator lives outside lib/meetings.ts.
export const MEETING_STATUSES: MeetingStatus[] = ['Planned', 'Completed', 'Cancelled'];

export function isMeetingStatus(value: unknown): value is MeetingStatus {
  return typeof value === 'string' && MEETING_STATUSES.includes(value as MeetingStatus);
}
