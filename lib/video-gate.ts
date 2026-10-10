import 'server-only';
export function videoTestPermitted(userId: string): boolean {
  return process.env.BYTEPLUS_VIDEO_TEST_ENABLED === 'true'
    && Boolean(process.env.ADMIN_USER_ID)
    && userId === process.env.ADMIN_USER_ID;
}
