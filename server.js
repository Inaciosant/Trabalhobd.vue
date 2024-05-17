const express = require('express');
const path = require('path');
const sql = require('mssql');

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// Configuração do banco de dados
const config = {
    user: 'inacio',
    password: 'Azure123@',
    server: 'trabalhobd2bim.database.windows.net',
    database: 'trabalho2bim',
    options: {
        encrypt: true 
    }
};

sql.connect(config).then(pool => {
    if (pool.connected) {
        console.log('Conexão bem-sucedida ao banco de dados.');
    }
}).catch(err => {
    console.error('Erro ao conectar ao banco de dados:', err);
});

app.use(express.json());

// Servir arquivos estáticos (como index.html)
app.use(express.static(path.join(__dirname)));

let user = '';

// Rota de login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const queryLogin = `SELECT * FROM Usuarios WHERE nome_usuario = '${username}' AND senha_usuario = '${password}'`;

    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('username', sql.VarChar, username)
            .input('password', sql.VarChar, password)
            .query(queryLogin);

        if (result.recordset.length > 0) {
            user = username;
            res.sendFile(path.join(__dirname, 'index.html'));
        } else {
            res.status(401).send('Usuário ou senha incorretos.');
        }
    } catch (err) {
        console.error('Erro ao executar consulta:', err);
        res.status(500).send('Erro interno ao realizar o login');
    }
});

// Rota de cadastro
app.post('/cadastro', async (req, res) => {
    const { newUsername, newPassword } = req.body;
    const queryIfEquals = `SELECT * FROM usuarios WHERE nome_usuario = '${newUsername}' AND senha_usuario = '${newPassword}'`;
    const queryCadastro = `INSERT INTO usuarios (nome_usuario, senha_usuario) VALUES ('${newUsername}', '${newPassword}')`;

    try {
        const pool = await sql.connect(config);
        const resultEquals = await pool.request()
            .input('newUsername', sql.VarChar, newUsername)
            .input('newPassword', sql.VarChar, newPassword)
            .query(queryIfEquals);

        if (resultEquals.recordset.length > 0) {
            res.write('<script>alert("Cadastro ja realizado, tente outro usuario e senha");</script>');
            res.write('<script>setTimeout(function() { window.location.href = "/cadastro.html"; }, 400);</script>');
            res.end();
        } else {
            await pool.request()
                .input('newUsername', sql.VarChar, newUsername)
                .input('newPassword', sql.VarChar, newPassword)
                .query(queryCadastro);
            res.write('<script>alert("Cadastro realizado com sucesso!");</script>');
            res.write('<script>setTimeout(function() { window.location.href = "/login.html"; }, 400);</script>');
            res.end();
        }
    } catch (err) {
        console.error('Erro ao executar a operação de cadastro:', err);
        res.status(500).send('Erro interno ao realizar o cadastro');
    }
});

// Rota para atualizar a vida do herói e do vilão
app.post('/atualizarVida', async (req, res) => {
    const { vidaHeroi, vidaVilao } = req.body;
    const queryAtualizarVida = `
      MERGE INTO jogo AS target
      USING (VALUES ('heroi', ${vidaHeroi}'), ('vilao', '${vidaVilao}')) AS source (Nome, Vida)
      ON target.Nome = source.Nome
      WHEN MATCHED THEN
        UPDATE SET Vida = source.Vida
      WHEN NOT MATCHED THEN
        INSERT (Nome, Vida) VALUES (source.Nome, source.Vida);
    `;

    try {
        const pool = await sql.connect(config);
        await pool.request()
            .input('vidaHeroi', sql.Int, vidaHeroi)
            .input('vidaVilao', sql.Int, vidaVilao)
            .query(queryAtualizarVida);
        res.status(200).send('Vida do herói e do vilão atualizada com sucesso.');
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao atualizar a vida do herói e do vilão.');
    }
});

// Rota para fornecer os dados do herói e do vilão
app.get('/characters', async (req, res) => {
    const heroQuery = `SELECT J.vida_heroi FROM jogo J INNER JOIN  usuarios U ON J.usuario_id = U.usuario_id WHERE U.nome_usuario = '${user}'`;
    const heroConsoleQuery = `SELECT J.acao_heroi FROM jogo J INNER JOIN usuarios U ON J.usuario_id = U.usuario_id WHERE U.nome_usuario = '${user}'`;
    const villainQuery = `SELECT J.vida_vilao FROM jogo J INNER JOIN usuarios U ON J.usuario_id = U.usuario_id WHERE U.nome_usuario = '${user}'`;
    const villainConsoleQuery = `SELECT J.acao_vilao FROM jogo J INNER JOIN usuarios U ON J.usuario_id = U.usuario_id WHERE U.nome_usuario = '${user}'`;

    try {
        const pool = await sql.connect(config);
        const heroResults = await pool.request()
            .input('user', sql.VarChar, user)
            .query(heroQuery);
        const heroi = heroResults.recordset[0].vida_heroi;

        const villainResults = await pool.request()
            .input('user', sql.VarChar, user)
            .query(villainQuery);
        const vilao = villainResults.recordset[0].vida_vilao;

        const heroConsoleResults = await pool.request()
            .input('user', sql.VarChar, user)
            .query(heroConsoleQuery);
        const heroiC = heroConsoleResults.recordset[0].acao_heroi;

        const villainConsoleResults = await pool.request()
            .input('user', sql.VarChar, user)
            .query(villainConsoleQuery);
        const vilaoC = villainConsoleResults.recordset[0].acao_vilao;

        res.json({ heroi, vilao, heroiC, vilaoC });
    } catch (error) {
        console.error('Erro ao buscar dados do herói e do vilão:', error);
        res.status(500).json({ error: 'Erro ao buscar dados do herói e do vilão.' });
    }
});

// Rota para servir o arquivo HTML principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor Express rodando na porta ${PORT}`);
});