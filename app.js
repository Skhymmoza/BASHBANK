const API_URL = 'api'; // Относительный путь, так как api лежит рядом

const app = {
    token: localStorage.getItem('token'),
    
    init: () => {
        if (app.token) {
            app.loadDashboard();
        }
    },

    // --- Navigation ---
    showScreen: (id) => {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    },

    toggleAuth: () => {
        const current = document.querySelector('.screen.active').id;
        app.showScreen(current === 'screen-auth' ? 'screen-reg' : 'screen-auth');
    },

    showDash: () => {
        app.showScreen('screen-dash');
        app.loadDashboard();
    },

    showTransfer: () => {
        app.showScreen('screen-transfer');
    },

    // --- API Calls ---
    async request(endpoint, method = 'GET', data = null) {
        const headers = { 'Content-Type': 'application/json' };
        if (app.token) headers['Authorization'] = `Bearer ${app.token}`;
        
        try {
            const res = await fetch(`${API_URL}/${endpoint}`, {
                method,
                headers,
                body: data ? JSON.stringify(data) : null
            });
            return await res.json();
        } catch (e) {
            alert('Ошибка соединения');
            return null;
        }
    },

    // --- Actions ---
    login: async () => {
        const login = document.getElementById('login-user').value;
        const pass = document.getElementById('login-pass').value;
        
        const res = await app.request('login', 'POST', { login, password: pass });
        if (res && res.token) {
            app.token = res.token;
            localStorage.setItem('token', res.token);
            app.loadDashboard();
        } else {
            alert('Неверный логин или пароль');
        }
    },

    register: async () => {
        const fullName = document.getElementById('reg-name').value;
        const login = document.getElementById('reg-login').value;
        const phone = document.getElementById('reg-phone').value;
        const pass = document.getElementById('reg-pass').value;

        if(!fullName || !login || !pass) return alert("Заполните все поля");

        const res = await app.request('register', 'POST', { 
            full_name: fullName, login, phone, password: pass 
        });

        if (res && res.status === 'success') {
            alert('Успешно! Теперь войдите.');
            app.toggleAuth();
        } else {
            alert('Ошибка регистрации (возможно логин занят)');
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        app.token = null;
        app.showScreen('screen-auth');
    },

    loadDashboard: async () => {
        const user = await app.request('me');
        if (!user || user.error) return app.logout();

        document.getElementById('user-name').innerText = user.full_name;
        // Маскировка карты
        const num = user.card_number;
        const masked = `${num.substring(0,4)} **** **** ${num.substring(12)}`;
        document.getElementById('card-number').innerText = masked;
        document.getElementById('card-balance').innerText = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(user.balance);

        app.showScreen('screen-dash');
        app.loadHistory();
    },

    loadHistory: async () => {
        const txs = await app.request('history');
        const container = document.getElementById('tx-history');
        container.innerHTML = '';

        if(txs && txs.length) {
            txs.forEach(tx => {
                const isIncome = tx.direction === 'income';
                const sign = isIncome ? '+' : '-';
                const colorClass = isIncome ? 'income' : 'outcome';
                
                const html = `
                    <div class="tx-item">
                        <div>
                            <div style="font-weight:600">${tx.description || 'Перевод'}</div>
                            <div style="font-size:12px; color:#999">${tx.created_at}</div>
                        </div>
                        <div class="tx-amount ${colorClass}">${sign} ${tx.amount} ₽</div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', html);
            });
        } else {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#999">Операций пока нет</div>';
        }
    },

    makeTransfer: async () => {
        const toCard = document.getElementById('tx-to').value;
        const amount = document.getElementById('tx-amount').value;

        if (!toCard || !amount) return alert('Заполните поля');

        const res = await app.request('transfer', 'POST', { to_card: toCard, amount });
        
        if (res && res.status === 'success') {
            alert('Перевод выполнен успешно!');
            document.getElementById('tx-to').value = '';
            document.getElementById('tx-amount').value = '';
            app.showDash();
        } else {
            alert('Ошибка: ' + (res.error || 'Неизвестная ошибка'));
        }
    }
};

// Start
app.init();