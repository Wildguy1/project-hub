class ProjectHub {
    constructor() {
        this.currentUser = null;
        this.token = localStorage.getItem('token');
        this.init();
    }

    async init() {
        if (this.token) {
            await this.loadUserProfile();
        }
        this.showAuthScreen();
        this.setupEventListeners();
    }

    async loadUserProfile() {
        try {
            const response = await fetch('/api/profile', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                this.currentUser = await response.json();
            } else {
                localStorage.removeItem('token');
                this.token = null;
            }
        } catch (error) {
            console.error('Ошибка загрузки профиля:', error);
            localStorage.removeItem('token');
            this.token = null;
        }
    }

    showAuthScreen() {
        if (!this.token || !this.currentUser) {
            this.renderAuthForm();
        } else {
            this.renderMainApp();
        }
    }

    renderAuthForm() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="auth-container">
                <div class="auth-form">
                    <h2>Проект-Хаб</h2>
                    <div id="auth-message"></div>
                    <form id="login-form">
                        <div class="form-group">
                            <label>Email:</label>
                            <input type="email" id="login-email" required>
                        </div>
                        <div class="form-group">
                            <label>Пароль:</label>
                            <input type="password" id="login-password" required>
                        </div>
                        <button type="submit" class="btn">Войти</button>
                    </form>
                    <div class="form-toggle">
                        <a id="show-register">Нет аккаунта? Зарегистрироваться</a>
                    </div>
                    <div class="form-toggle">
                        <small>Демо доступ: admin@projecthub.ru / admin123</small>
                    </div>
                </div>
            </div>
        `;

        this.setupAuthEvents();
    }

    renderRegisterForm() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="auth-container">
                <div class="auth-form">
                    <h2>Регистрация</h2>
                    <div id="auth-message"></div>
                    <form id="register-form">
                        <div class="form-group">
                            <label>Имя:</label>
                            <input type="text" id="register-firstName" required>
                        </div>
                        <div class="form-group">
                            <label>Фамилия:</label>
                            <input type="text" id="register-lastName" required>
                        </div>
                        <div class="form-group">
                            <label>Email:</label>
                            <input type="email" id="register-email" required>
                        </div>
                        <div class="form-group">
                            <label>Телефон:</label>
                            <input type="tel" id="register-phone" required>
                        </div>
                        <div class="form-group">
                            <label>Организация:</label>
                            <input type="text" id="register-company" required>
                        </div>
                        <div class="form-group">
                            <label>Должность:</label>
                            <input type="text" id="register-position" required>
                        </div>
                        <div class="form-group">
                            <label>Пароль:</label>
                            <input type="password" id="register-password" required>
                        </div>
                        <button type="submit" class="btn">Зарегистрироваться</button>
                    </form>
                    <div class="form-toggle">
                        <a id="show-login">Уже есть аккаунт? Войти</a>
                    </div>
                </div>
            </div>
        `;

        this.setupAuthEvents();
    }

    setupAuthEvents() {
        // Переключение между формами
        const showRegister = document.getElementById('show-register');
        const showLogin = document.getElementById('show-login');
        
        if (showRegister) showRegister.addEventListener('click', () => this.renderRegisterForm());
        if (showLogin) showLogin.addEventListener('click', () => this.renderAuthForm());

        // Обработка форм
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.currentUser = data.user;
                localStorage.setItem('token', this.token);
                this.showAuthMessage('Успешный вход!', 'success');
                setTimeout(() => this.renderMainApp(), 1000);
            } else {
                this.showAuthMessage(data.error, 'error');
            }
        } catch (error) {
            this.showAuthMessage('Ошибка сети', 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const formData = {
            firstName: document.getElementById('register-firstName').value,
            lastName: document.getElementById('register-lastName').value,
            email: document.getElementById('register-email').value,
            phone: document.getElementById('register-phone').value,
            company: document.getElementById('register-company').value,
            position: document.getElementById('register-position').value,
            password: document.getElementById('register-password').value
        };

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                this.showAuthMessage('Регистрация успешна! Ожидайте модерации.', 'success');
                setTimeout(() => this.renderAuthForm(), 2000);
            } else {
                this.showAuthMessage(data.error, 'error');
            }
        } catch (error) {
            this.showAuthMessage('Ошибка сети', 'error');
        }
    }

    showAuthMessage(message, type) {
        const messageDiv = document.getElementById('auth-message');
        messageDiv.innerHTML = `<div class="${type === 'error' ? 'error-message' : 'success-message'}">${message}</div>`;
    }

    renderMainApp() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="header">
                <div class="container">
                    <div class="header-content">
                        <div class="logo">Проект-Хаб</div>
                        <div class="user-info">
                            <span>${this.currentUser.firstName} ${this.currentUser.lastName}</span>
                            <div class="avatar">${this.currentUser.firstName[0]}${this.currentUser.lastName[0]}</div>
                            <button class="btn btn-secondary" onclick="app.logout()">Выйти</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="container">
                <div class="main-content">
                    <div class="sidebar">
                        <div class="nav-item active" onclick="app.showTab('dashboard')">
                            <i>📊</i> Панель управления
                        </div>
                        <div class="nav-item" onclick="app.showTab('projects')">
                            <i>📁</i> Мои проекты
                        </div>
                        <div class="nav-item" onclick="app.showTab('loyalty')">
                            <i>⭐</i> Программа лояльности
                        </div>
                        <div class="nav-item" onclick="app.showTab('rating')">
                            <i>🏆</i> Рейтинг
                        </div>
                        <div class="nav-item" onclick="app.showTab('portal')">
                            <i>🌐</i> Общий портал
                        </div>
                        ${this.currentUser.isAdmin ? `
                        <div class="nav-item" onclick="app.showTab('admin')">
                            <i>⚙️</i> Админ-панель
                        </div>
                        ` : ''}
                    </div>

                    <div class="content">
                        <div id="dashboard" class="tab-content active"></div>
                        <div id="projects" class="tab-content"></div>
                        <div id="loyalty" class="tab-content"></div>
                        <div id="rating" class="tab-content"></div>
                        <div id="portal" class="tab-content"></div>
                        <div id="admin" class="tab-content"></div>
                    </div>
                </div>
            </div>

            <!-- Модальные окна -->
            <div id="projectModal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="app.closeModal()">&times;</span>
                    <h3 id="modalTitle">Создать проект</h3>
                    <form id="projectForm">
                        <div class="form-group">
                            <label>Название проекта:</label>
                            <input type="text" id="projectTitle" required>
                        </div>
                        <div class="form-group">
                            <label>Описание:</label>
                            <textarea id="projectDescription" rows="4" required></textarea>
                        </div>
                        <div class="form-group">
                            <label>Статус:</label>
                            <select id="projectStatus">
                                <option value="draft">Черновик</option>
                                <option value="progress">В работе</option>
                                <option value="review">На проверке</option>
                                <option value="completed">Завершен</option>
                            </select>
                        </div>
                        <button type="submit" class="btn">Сохранить</button>
                    </form>
                </div>
            </div>

            <div id="blockModal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="app.closeModal()">&times;</span>
                    <h3>Добавить блок</h3>
                    <form id="blockForm">
                        <div class="form-group">
                            <label>Тип блока:</label>
                            <select id="blockType">
                                <option value="news">Новость</option>
                                <option value="article">Статья</option>
                                <option value="question">Вопрос</option>
                                <option value="announcement">Объявление</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Заголовок:</label>
                            <input type="text" id="blockTitle" required>
                        </div>
                        <div class="form-group">
                            <label>Содержание:</label>
                            <textarea id="blockContent" rows="6" required></textarea>
                        </div>
                        <button type="submit" class="btn">Опубликовать</button>
                    </form>
                </div>
            </div>
        `;

        this.showTab('dashboard');
        this.setupModalEvents();
    }

    async showTab(tabName) {
        // Обновляем активный пункт меню
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.textContent.includes(this.getTabName(tabName))) {
                item.classList.add('active');
            }
        });

        // Скрываем все вкладки
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        
        // Показываем выбранную вкладку
        const tabContent = document.getElementById(tabName);
        tabContent.classList.add('active');

        // Загружаем контент для вкладки
        switch (tabName) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'projects':
                await this.loadProjects();
                break;
            case 'portal':
                await this.loadPortal();
                break;
            case 'admin':
                if (this.currentUser.isAdmin) {
                    await this.loadAdminPanel();
                }
                break;
            default:
                tabContent.innerHTML = `<h2>${this.getTabName(tabName)}</h2><p>Раздел в разработке</p>`;
        }
    }

    getTabName(tabKey) {
        const names = {
            'dashboard': 'Панель управления',
            'projects': 'Мои проекты',
            'loyalty': 'Программа лояльности',
            'rating': 'Рейтинг',
            'portal': 'Общий портал',
            'admin': 'Админ-панель'
        };
        return names[tabKey] || tabKey;
    }

    async loadDashboard() {
        const response = await fetch('/api/my-projects', {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });
        const projects = await response.json();

        const completedProjects = projects.filter(p => p.status === 'completed').length;
        const inProgressProjects = projects.filter(p => p.status === 'progress').length;

        document.getElementById('dashboard').innerHTML = `
            <h2>Добро пожаловать, ${this.currentUser.firstName}!</h2>
            <p style="color: #7f8c8d; margin-bottom: 30px;">Ваша статистика</p>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${projects.length}</div>
                    <div class="stat-label">Всего проектов</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${this.currentUser.points}</div>
                    <div class="stat-label">Накопленных баллов</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${inProgressProjects}</div>
                    <div class="stat-label">В работе</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${completedProjects}</div>
                    <div class="stat-label">Завершено</div>
                </div>
            </div>

            <div class="activity-feed">
                <h3 style="margin-bottom: 20px;">Последние активности</h3>
                <div class="activity-item">
                    <span>👋</span>
                    <span>Добро пожаловать в Проект-Хаб!</span>
                </div>
                <div class="activity-item">
                    <span>💡</span>
                    <span>Создайте свой первый проект</span>
                </div>
                <div class="activity-item">
                    <span>🌐</span>
                    <span>Изучите общий портал</span>
                </div>
            </div>
        `;
    }

    async loadProjects() {
        const response = await fetch('/api/my-projects', {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });
        const projects = await response.json();

        document.getElementById('projects').innerHTML = `
            <div class="projects-header">
                <h2>Мои проекты</h2>
                <button class="btn" onclick="app.openProjectModal()">+ Создать проект</button>
            </div>
            <div class="projects-grid">
                ${projects.length > 0 ? projects.map(project => `
                    <div class="project-card" onclick="app.viewProject('${project.id}')">
                        <div class="project-status status-${project.status}">
                            ${this.getStatusText(project.status)}
                        </div>
                        <h3>${project.title}</h3>
                        <p style="color: #7f8c8d; margin: 10px 0;">${project.description}</p>
                        <div style="font-size: 0.9em; color: #7f8c8d;">
                            Создан: ${new Date(project.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                `).join('') : '<p>У вас пока нет проектов</p>'}
            </div>
        `;
    }

    async loadPortal() {
        const [projectsResponse, blocksResponse] = await Promise.all([
            fetch('/api/portal-projects'),
            fetch('/api/portal-blocks')
        ]);

        const projects = await projectsResponse.json();
        const blocks = await blocksResponse.json();

        document.getElementById('portal').innerHTML = `
            <h2>Общий портал</h2>
            <p style="color: #7f8c8d; margin-bottom: 30px;">Публичные проекты и материалы сообщества</p>

            <button class="add-block-btn" onclick="app.openBlockModal()">+ Добавить блок</button>

            <h3 style="margin: 30px 0 20px 0;">Последние публикации</h3>
            <div class="blocks-grid">
                ${blocks.map(block => `
                    <div class="block-card">
                        <div class="block-header">
                            <h4>${block.title}</h4>
                            <span class="block-type">${this.getBlockTypeText(block.type)}</span>
                        </div>
                        <div class="block-content">
                            ${block.content}
                        </div>
                        <div class="block-footer">
                            <span>${block.authorName}</span>
                            <span>${new Date(block.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                `).join('')}
            </div>

            <h3 style="margin: 40px 0 20px 0;">Публичные проекты</h3>
            <div class="projects-grid">
                ${projects.map(project => `
                    <div class="project-card">
                        <div class="project-status status-${project.status}">
                            ${this.getStatusText(project.status)}
                        </div>
                        <h3>${project.title}</h3>
                        <p style="color: #7f8c8d; margin: 10px 0;">${project.description}</p>
                        <div style="font-size: 0.9em; color: #7f8c8d;">
                            Автор: ${project.ownerName} (${project.ownerCompany})
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async loadAdminPanel() {
        const [usersResponse, requestsResponse] = await Promise.all([
            fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            }),
            fetch('/api/admin/moderation-requests', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            })
        ]);

        const users = await usersResponse.json();
        const requests = await requestsResponse.json();

        document.getElementById('admin').innerHTML = `
            <h2>Админ-панель</h2>

            <div class="admin-section">
                <h3>Запросы на модерацию (${requests.length})</h3>
                <div class="requests-list">
                    ${requests.length > 0 ? requests.map(request => `
                        <div class="request-item">
                            <div>
                                <strong>${request.user.firstName} ${request.user.lastName}</strong><br>
                                <small>${request.user.email} | ${request.user.company} | ${request.user.position}</small><br>
                                <small>Зарегистрирован: ${new Date(request.createdAt).toLocaleDateString()}</small>
                            </div>
                            <div class="request-actions">
                                <button class="btn btn-success" onclick="app.moderateUser('${request.userId}', 'approved')">Одобрить</button>
                                <button class="btn btn-danger" onclick="app.moderateUser('${request.userId}', 'rejected')">Отклонить</button>
                            </div>
                        </div>
                    `).join('') : '<p>Нет ожидающих запросов</p>'}
                </div>
            </div>

            <div class="admin-section">
                <h3>Все пользователи (${users.length})</h3>
                <div class="user-list">
                    ${users.map(user => `
                        <div class="user-item">
                            <div>
                                <strong>${user.firstName} ${user.lastName}</strong>
                                ${user.isAdmin ? ' <small style="color: #e74c3c;">(Админ)</small>' : ''}<br>
                                <small>${user.email} | ${user.company} | ${user.position}</small><br>
                                <small>Статус: ${this.getModerationStatusText(user.moderationStatus)} | Баллы: ${user.points}</small>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    getStatusText(status) {
        const statuses = {
            'draft': 'Черновик',
            'progress': 'В работе',
            'review': 'На проверке',
            'completed': 'Завершен'
        };
        return statuses[status] || status;
    }

    getBlockTypeText(type) {
        const types = {
            'news': 'Новость',
            'article': 'Статья',
            'question': 'Вопрос',
            'announcement': 'Объявление'
        };
        return types[type] || type;
    }

    getModerationStatusText(status) {
        const statuses = {
            'pending': 'Ожидает',
            'approved': 'Одобрен',
            'rejected': 'Отклонен'
        };
        return statuses[status] || status;
    }

    setupModalEvents() {
        const projectForm = document.getElementById('projectForm');
        const blockForm = document.getElementById('blockForm');

        if (projectForm) {
            projectForm.addEventListener('submit', (e) => this.handleProjectSubmit(e));
        }

        if (blockForm) {
            blockForm.addEventListener('submit', (e) => this.handleBlockSubmit(e));
        }
    }

    openProjectModal() {
        document.getElementById('projectModal').style.display = 'block';
        document.getElementById('modalTitle').textContent = 'Создать проект';
        document.getElementById('projectForm').reset();
    }

    openBlockModal() {
        document.getElementById('blockModal').style.display = 'block';
    }

    closeModal() {
        document.getElementById('projectModal').style.display = 'none';
        document.getElementById('blockModal').style.display = 'none';
    }

    async handleProjectSubmit(e) {
        e.preventDefault();
        const formData = {
            title: document.getElementById('projectTitle').value,
            description: document.getElementById('projectDescription').value,
            status: document.getElementById('projectStatus').value
        };

        try {
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                this.closeModal();
                this.loadProjects();
                this.loadDashboard();
            }
        } catch (error) {
            console.error('Ошибка создания проекта:', error);
        }
    }

    async handleBlockSubmit(e) {
        e.preventDefault();
        const formData = {
            type: document.getElementById('blockType').value,
            title: document.getElementById('blockTitle').value,
            content: document.getElementById('blockContent').value
        };

        try {
            const response = await fetch('/api/portal-blocks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                this.closeModal();
                this.loadPortal();
            }
        } catch (error) {
            console.error('Ошибка создания блока:', error);
        }
    }

    async moderateUser(userId, status) {
        try {
            const response = await fetch('/api/admin/moderate-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ userId, status })
            });

            if (response.ok) {
                this.loadAdminPanel();
            }
        } catch (error) {
            console.error('Ошибка модерации:', error);
        }
    }

    viewProject(projectId) {
        alert(`Просмотр проекта ${projectId}. В реальной системе здесь открывался бы детальный просмотр.`);
    }

    logout() {
        localStorage.removeItem('token');
        this.token = null;
        this.currentUser = null;
        this.showAuthScreen();
    }

    setupEventListeners() {
        // Глобальные обработчики
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('projectModal');
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }
}

// Инициализация приложения
const app = new ProjectHub();