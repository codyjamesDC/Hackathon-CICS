import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { loginDto, registerDto } from './users.dto.js';

const usersRoutes = new Hono();

// POST /api/users/register
usersRoutes.post('/register', zValidator('json', registerDto), async (c) => {
  const data = c.req.valid('json');
  // TODO: call service.register(data)
  return c.json({ message: 'not implemented' }, 501);
});

// POST /api/users/login
usersRoutes.post('/login', zValidator('json', loginDto), async (c) => {
  const data = c.req.valid('json');
  // TODO: call service.login(data.email, data.password)
  return c.json({ message: 'not implemented' }, 501);
});

// GET /api/users/me
usersRoutes.get('/me', async (c) => {
  // TODO: extract user from auth context
  return c.json({ message: 'not implemented' }, 501);
});

export { usersRoutes };
