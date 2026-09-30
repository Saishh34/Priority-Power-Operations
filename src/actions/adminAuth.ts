'use server';

import { cookies } from 'next/headers';

export async function adminLoginAction(password: string) {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('Server configuration error: ADMIN_PASSWORD is not set.');
    return { success: false, error: 'Internal server error. Admin login is currently unavailable.' };
  }
  
  if (password === adminPassword) {
    (await cookies()).set('adminSession', 'true', { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    });
    return { success: true };
  }
  
  return { success: false, error: 'Invalid admin password' };
}

export async function adminLogoutAction() {
  (await cookies()).delete('adminSession');
}
