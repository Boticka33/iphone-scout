import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getUserByEmail, getUserById, createUser, getAllUsers, deleteUser } from '../db/database';

const JWT_SECRET = process.env.JWT_SECRET || 'iphone-scout-secret-jwt-key-2026';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: 'admin' | 'reseller';
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Neautorizovaný přístup. Chybí přihlašovací token.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: 'admin' | 'reseller' };
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Neplatný nebo vypršený přihlašovací token.' });
  }
}

export function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Přístup odepřen. Pouze pro administrátory.' });
  }
  next();
}

const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Zadejte e-mail a heslo.' });
    }

    const user = await getUserByEmail(email);
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Nesprávný e-mail nebo heslo.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Nesprávný e-mail nebo heslo.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Chyba při přihlašování.' });
  }
});

// GET /api/auth/me
authRouter.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Neautorizováno' });
    const user = await getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Uživatel nenalezen' });
    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ error: 'Chyba při načítání profilu' });
  }
});

// GET /api/auth/users (Admin only)
authRouter.get('/users', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: 'Chyba při načítání uživatelů' });
  }
});

// POST /api/auth/users (Admin only - create new reseller account)
authRouter.post('/users', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail a heslo jsou povinné.' });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Uživatel s tímto e-mailem již existuje.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const userId = await createUser(email, hash, role === 'admin' ? 'admin' : 'reseller');

    res.json({ message: 'Uživatel vytvořen', userId });
  } catch (error: any) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Chyba při vytváření uživatele' });
  }
});

// DELETE /api/auth/users/:id (Admin only)
authRouter.delete('/users/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (req.user?.id === id) {
      return res.status(400).json({ error: 'Nemůžete smazat svůj vlastní účet.' });
    }
    await deleteUser(id);
    res.json({ message: 'Uživatel smazán' });
  } catch (error: any) {
    res.status(500).json({ error: 'Chyba při mazání uživatele' });
  }
});

export default authRouter;
