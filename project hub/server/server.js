import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

app.use(cors());
app.use(express.json());

// Обслуживаем статические файлы
app.use(express.static(path.join(__dirname, '../client')));

// In-memory база данных
let users = [];
let projects = [];
let portalBlocks = [];
let moderationRequests = [];

// Middleware для проверки JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Токен доступа отсутствует' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Недействительный токен' });
    }
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Требуются права администратора' });
  }
  next();
};

// Регистрация
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, company, position } = req.body;

    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      company,
      position,
      moderationStatus: 'pending',
      isAdmin: false,
      createdAt: new Date().toISOString(),
      points: 0,
      rating: 0
    };

    users.push(newUser);

    moderationRequests.push({
      id: Date.now().toString(),
      userId: newUser.id,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ 
      message: 'Регистрация успешна. Ожидайте модерации.',
      userId: newUser.id 
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Авторизация
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(400).json({ error: 'Пользователь не найден' });
    }

    if (user.moderationStatus !== 'approved') {
      return res.status(400).json({ error: 'Аккаунт ожидает модерации' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Неверный пароль' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        isAdmin: user.isAdmin 
      }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        company: user.company,
        position: user.position,
        isAdmin: user.isAdmin,
        points: user.points,
        rating: user.rating
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Профиль пользователя
app.get('/api/profile', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }
  const { password, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// Проекты
app.post('/api/projects', authenticateToken, (req, res) => {
  try {
    const { title, description, status } = req.body;

    const newProject = {
      id: Date.now().toString(),
      title,
      description,
      status: status || 'draft',
      ownerId: req.user.id,
      ownerName: `${users.find(u => u.id === req.user.id)?.firstName} ${users.find(u => u.id === req.user.id)?.lastName}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    projects.push(newProject);

    // Начисление баллов
    const user = users.find(u => u.id === req.user.id);
    user.points += 50;

    res.status(201).json(newProject);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/my-projects', authenticateToken, (req, res) => {
  const userProjects = projects.filter(project => project.ownerId === req.user.id);
  res.json(userProjects);
});

app.get('/api/portal-projects', (req, res) => {
  const portalProjects = projects
    .filter(project => project.status !== 'draft')
    .map(project => {
      const owner = users.find(u => u.id === project.ownerId);
      return {
        ...project,
        ownerCompany: owner?.company,
        ownerRating: owner?.rating
      };
    });
  res.json(portalProjects);
});

// Блоки портала
app.get('/api/portal-blocks', (req, res) => {
  res.json(portalBlocks);
});

app.post('/api/portal-blocks', authenticateToken, (req, res) => {
  try {
    const { type, content, title } = req.body;

    const newBlock = {
      id: Date.now().toString(),
      type,
      content,
      title,
      authorId: req.user.id,
      authorName: `${users.find(u => u.id === req.user.id)?.firstName} ${users.find(u => u.id === req.user.id)?.lastName}`,
      createdAt: new Date().toISOString(),
      likes: 0,
      comments: []
    };

    portalBlocks.push(newBlock);
    res.status(201).json(newBlock);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Админские endpoints
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  const usersForAdmin = users.map(user => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
  res.json(usersForAdmin);
});

app.get('/api/admin/moderation-requests', authenticateToken, requireAdmin, (req, res) => {
  const requestsWithUserInfo = moderationRequests
    .filter(req => req.status === 'pending')
    .map(request => {
      const user = users.find(u => u.id === request.userId);
      return {
        ...request,
        user: user ? {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          company: user.company,
          position: user.position
        } : null
      };
    });
  res.json(requestsWithUserInfo);
});

app.post('/api/admin/moderate-user', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { userId, status, adminComment } = req.body;

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    user.moderationStatus = status;
    
    const request = moderationRequests.find(r => r.userId === userId && r.status === 'pending');
    if (request) {
      request.status = status;
      request.resolvedBy = req.user.id;
      request.resolvedAt = new Date().toISOString();
      request.adminComment = adminComment;
    }

    res.json({ message: `Пользователь ${status === 'approved' ? 'одобрен' : 'отклонен'}` });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создание начального админа
const createInitialAdmin = async () => {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = {
    id: '1',
    email: 'admin@projecthub.ru',
    password: hashedPassword,
    firstName: 'Администратор',
    lastName: 'Системы',
    phone: '+79999999999',
    company: 'ProjectHub',
    position: 'Администратор',
    moderationStatus: 'approved',
    isAdmin: true,
    createdAt: new Date().toISOString(),
    points: 0,
    rating: 0
  };
  users.push(adminUser);
  console.log('✅ Админ создан: admin@projecthub.ru / admin123');
};

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Обработка для SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Запуск сервера
app.listen(PORT, async () => {
  await createInitialAdmin();
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📍 Демо доступ: admin@projecthub.ru / admin123`);
});