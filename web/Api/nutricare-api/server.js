/**
 * NutriCare API — Backend completo para o painel do nutricionista
 * Stack: Node.js + Express (sem banco de dados externo, usa memória em desenvolvimento)
 *
 * Endpoints implementados:
 *   POST /auth/login
 *   POST /auth/cadastro
 *   POST /auth/refresh
 *   POST /auth/esqueci-senha
 *   GET  /auth/me
 *   GET  /pacientes
 *   POST /pacientes
 *   GET  /pacientes/:id
 *   PATCH /pacientes/:id
 *   DELETE /pacientes/:id
 *   GET  /registros
 *   POST /registros/glicemia
 *   POST /registros/refeicao
 *   GET  /alimentacao
 *   POST /alimentacao
 *   GET  /saude/:pacienteId
 *   POST /saude/:pacienteId
 *   GET  /perfil
 *   PATCH /perfil
 */

const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')

const app = express()
const PORT = process.env.PORT || 3333
const JWT_SECRET = process.env.JWT_SECRET || 'nutricare-dev-secret-2024'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'nutricare-refresh-secret-2024'

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }))
app.use(express.json())

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// ─── In-memory "banco de dados" ───────────────────────────────────────────────
const db = {
  usuarios: [],
  refreshTokens: new Set(),
  pacientes: [],
  registros: [],        // glicemia e refeição
  alimentacao: [],      // planos alimentares
  saude: [],            // dados antropométricos
}

// Seed: nutricionista de demonstração (senha: Demo@1234)
;(async () => {
  const hash = await bcrypt.hash('Demo@1234', 10)
  db.usuarios.push({
    id: uuidv4(),
    nome: 'Dra. Ana Nutricionista',
    email: 'demo@nutricare.com',
    senha: hash,
    role: 'nutricionista',
    criadoEm: new Date().toISOString(),
  })

  // Pacientes de exemplo
  const pacs = [
    { nome: 'João Silva', email: 'joao@email.com', glicemiaMedia: 105, status: 'ativo' },
    { nome: 'Maria Souza', email: 'maria@email.com', glicemiaMedia: 92, status: 'ativo' },
    { nome: 'Carlos Pereira', email: 'carlos@email.com', glicemiaMedia: 130, status: 'ativo' },
  ]
  pacs.forEach((p) => {
    db.pacientes.push({
      id: uuidv4(),
      ...p,
      ultimoRegistro: new Date(Date.now() - Math.random() * 7 * 24 * 3600000).toISOString(),
      criadoEm: new Date().toISOString(),
    })
  })

  // Registros de exemplo
  db.pacientes.forEach((pac) => {
    for (let i = 0; i < 5; i++) {
      db.registros.push({
        id: uuidv4(),
        pacienteId: pac.id,
        pacienteNome: pac.nome,
        tipo: i % 2 === 0 ? 'glicemia' : 'refeicao',
        valor: i % 2 === 0 ? Math.round(90 + Math.random() * 60) : null,
        momento: ['jejum', 'pre', 'pos', 'aleatorio'][i % 4],
        descricao: i % 2 !== 0 ? 'Almoço: arroz, feijão, frango grelhado e salada' : null,
        tipo_refeicao: i % 2 !== 0 ? 'almoco' : null,
        observacao: '',
        criadoEm: new Date(Date.now() - i * 6 * 3600000).toISOString(),
      })
    }
  })

  console.log('✅ Banco de dados inicializado')
  console.log('📧 Login demo: demo@nutricare.com | Senha: Demo@1234')
})()

// ─── Helpers ──────────────────────────────────────────────────────────────────
function gerarTokens(usuario) {
  const payload = { sub: usuario.id, email: usuario.email, role: usuario.role }
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' })
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' })
  db.refreshTokens.add(refreshToken)
  return { accessToken, refreshToken }
}

function usuarioPublico(u) {
  const { senha: _, ...pub } = u
  return pub
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token não fornecido.' })
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET)
    const usuario = db.usuarios.find((u) => u.id === decoded.sub)
    if (!usuario) return res.status(401).json({ message: 'Usuário não encontrado.' })
    req.user = usuario
    next()
  } catch {
    return res.status(401).json({ message: 'Token inválido ou expirado.' })
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

// POST /auth/login
app.post('/auth/login', async (req, res) => {
  const { email, senha } = req.body
  if (!email || !senha) {
    return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' })
  }

  const usuario = db.usuarios.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (!usuario) {
    return res.status(401).json({ message: 'E-mail ou senha incorretos.' })
  }

  const senhaOk = await bcrypt.compare(senha, usuario.senha)
  if (!senhaOk) {
    return res.status(401).json({ message: 'E-mail ou senha incorretos.' })
  }

  const { accessToken, refreshToken } = gerarTokens(usuario)
  return res.json({ user: usuarioPublico(usuario), accessToken, refreshToken })
})

// POST /auth/cadastro
app.post('/auth/cadastro', async (req, res) => {
  const { nome, email, senha, role } = req.body

  if (!nome || !email || !senha) {
    return res.status(400).json({ message: 'Nome, e-mail e senha são obrigatórios.' })
  }
  if (senha.length < 8) {
    return res.status(400).json({ message: 'A senha deve ter pelo menos 8 caracteres.' })
  }
  if (db.usuarios.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ message: 'E-mail já cadastrado.' })
  }

  const hash = await bcrypt.hash(senha, 10)
  const novoUsuario = {
    id: uuidv4(),
    nome,
    email,
    senha: hash,
    role: role || 'nutricionista',
    criadoEm: new Date().toISOString(),
  }
  db.usuarios.push(novoUsuario)

  const { accessToken, refreshToken } = gerarTokens(novoUsuario)
  return res.status(201).json({ user: usuarioPublico(novoUsuario), accessToken, refreshToken })
})

// POST /auth/refresh
app.post('/auth/refresh', (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken || !db.refreshTokens.has(refreshToken)) {
    return res.status(401).json({ message: 'Refresh token inválido.' })
  }
  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET)
    const usuario = db.usuarios.find((u) => u.id === decoded.sub)
    if (!usuario) return res.status(401).json({ message: 'Usuário não encontrado.' })
    db.refreshTokens.delete(refreshToken)
    const tokens = gerarTokens(usuario)
    return res.json(tokens)
  } catch {
    return res.status(401).json({ message: 'Refresh token expirado.' })
  }
})

// POST /auth/google
// Recebe o id_token do Google (via Google Identity Services no frontend)
// Valida o token consultando o endpoint público do Google e faz login/cadastro automático
app.post('/auth/google', async (req, res) => {
  const { credential } = req.body
  if (!credential) {
    return res.status(400).json({ message: 'Token do Google não fornecido.' })
  }

  try {
    // Valida o id_token no endpoint público do Google (sem necessidade de SDK)
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`)
    if (!googleRes.ok) {
      return res.status(401).json({ message: 'Token do Google inválido.' })
    }
    const payload = await googleRes.json()

    // Verifica se o token não está expirado
    if (payload.exp && Date.now() / 1000 > Number(payload.exp)) {
      return res.status(401).json({ message: 'Token do Google expirado.' })
    }

    const { email, name, sub: googleId, picture } = payload

    if (!email) {
      return res.status(400).json({ message: 'Não foi possível obter o e-mail da conta Google.' })
    }

    // Busca ou cria o usuário
    let usuario = db.usuarios.find((u) => u.email.toLowerCase() === email.toLowerCase())

    if (!usuario) {
      // Cadastro automático via Google — role fixo como nutricionista
      usuario = {
        id: uuidv4(),
        nome: name || email.split('@')[0],
        email,
        senha: null,         // conta Google não tem senha local
        googleId,
        picture: picture || null,
        role: 'nutricionista',
        criadoVia: 'google',
        criadoEm: new Date().toISOString(),
      }
      db.usuarios.push(usuario)
    } else {
      // Atualiza dados do Google se necessário
      usuario.googleId = usuario.googleId || googleId
      usuario.picture = picture || usuario.picture
    }

    if (usuario.role !== 'nutricionista') {
      return res.status(403).json({
        message: 'Esta plataforma é exclusiva para nutricionistas. Use o aplicativo mobile para acesso como paciente.',
      })
    }

    const { accessToken, refreshToken } = gerarTokens(usuario)
    return res.json({ user: usuarioPublico(usuario), accessToken, refreshToken })
  } catch (err) {
    console.error('Erro ao validar token Google:', err)
    return res.status(500).json({ message: 'Erro ao autenticar com o Google.' })
  }
})

// POST /auth/esqueci-senha
app.post('/auth/esqueci-senha', (req, res) => {
  const { email } = req.body
  // Em produção: enviar e-mail real. Aqui apenas simulamos.
  const usuario = db.usuarios.find((u) => u.email.toLowerCase() === email?.toLowerCase())
  // Resposta genérica por segurança (não revelar se e-mail existe)
  return res.json({
    message: 'Se o e-mail estiver cadastrado, você receberá as instruções em breve.',
    // Em dev, exibimos se achou ou não
    _dev: usuario ? 'E-mail encontrado (em prod enviaria link)' : 'E-mail não encontrado',
  })
})

// GET /auth/me
app.get('/auth/me', authMiddleware, (req, res) => {
  return res.json({ user: usuarioPublico(req.user) })
})

// ─── Pacientes ────────────────────────────────────────────────────────────────

// GET /pacientes
app.get('/pacientes', authMiddleware, (req, res) => {
  const { busca, status } = req.query
  let lista = [...db.pacientes]

  if (busca) {
    const q = busca.toLowerCase()
    lista = lista.filter(
      (p) => p.nome.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    )
  }
  if (status) {
    lista = lista.filter((p) => p.status === status)
  }

  const total = lista.length
  const ativos = lista.filter((p) => p.status === 'ativo').length
  const comAlertas = lista.filter((p) => (p.glicemiaMedia || 0) > 126).length

  return res.json({ data: lista, meta: { total, ativos, comAlertas } })
})

// POST /pacientes
app.post('/pacientes', authMiddleware, (req, res) => {
  const { nome, email } = req.body
  if (!nome || !email) {
    return res.status(400).json({ message: 'Nome e e-mail são obrigatórios.' })
  }
  const novo = {
    id: uuidv4(),
    nome,
    email,
    glicemiaMedia: null,
    ultimoRegistro: null,
    status: 'ativo',
    criadoEm: new Date().toISOString(),
  }
  db.pacientes.push(novo)
  return res.status(201).json(novo)
})

// GET /pacientes/:id
app.get('/pacientes/:id', authMiddleware, (req, res) => {
  const pac = db.pacientes.find((p) => p.id === req.params.id)
  if (!pac) return res.status(404).json({ message: 'Paciente não encontrado.' })
  return res.json(pac)
})

// PATCH /pacientes/:id
app.patch('/pacientes/:id', authMiddleware, (req, res) => {
  const idx = db.pacientes.findIndex((p) => p.id === req.params.id)
  if (idx === -1) return res.status(404).json({ message: 'Paciente não encontrado.' })
  db.pacientes[idx] = { ...db.pacientes[idx], ...req.body, id: db.pacientes[idx].id }
  return res.json(db.pacientes[idx])
})

// DELETE /pacientes/:id
app.delete('/pacientes/:id', authMiddleware, (req, res) => {
  const idx = db.pacientes.findIndex((p) => p.id === req.params.id)
  if (idx === -1) return res.status(404).json({ message: 'Paciente não encontrado.' })
  db.pacientes.splice(idx, 1)
  return res.status(204).send()
})

// ─── Registros ────────────────────────────────────────────────────────────────

// GET /registros
app.get('/registros', authMiddleware, (req, res) => {
  const { tipo, pacienteId, dias } = req.query
  let lista = [...db.registros].sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm))

  if (tipo && tipo !== 'tudo') lista = lista.filter((r) => r.tipo === tipo)
  if (pacienteId) lista = lista.filter((r) => r.pacienteId === pacienteId)
  if (dias) {
    const limite = new Date(Date.now() - Number(dias) * 24 * 3600000)
    lista = lista.filter((r) => new Date(r.criadoEm) >= limite)
  }

  const glicemiaCount = lista.filter((r) => r.tipo === 'glicemia').length
  const refeicaoCount = lista.filter((r) => r.tipo === 'refeicao').length

  return res.json({ data: lista, meta: { glicemiaCount, refeicaoCount, total: lista.length } })
})

// POST /registros/glicemia
app.post('/registros/glicemia', authMiddleware, (req, res) => {
  const { pacienteId, valor, momento, observacao } = req.body
  if (!valor) return res.status(400).json({ message: 'Valor da glicemia é obrigatório.' })

  const paciente = db.pacientes.find((p) => p.id === pacienteId)
  const registro = {
    id: uuidv4(),
    pacienteId: pacienteId || null,
    pacienteNome: paciente?.nome || 'Desconhecido',
    tipo: 'glicemia',
    valor: Number(valor),
    momento: momento || 'aleatorio',
    descricao: null,
    tipo_refeicao: null,
    observacao: observacao || '',
    criadoEm: new Date().toISOString(),
  }
  db.registros.push(registro)

  // Atualiza glicemiaMedia e ultimoRegistro do paciente
  if (paciente) {
    const regsGlicemia = db.registros.filter((r) => r.pacienteId === pacienteId && r.tipo === 'glicemia')
    paciente.glicemiaMedia = Math.round(regsGlicemia.reduce((s, r) => s + r.valor, 0) / regsGlicemia.length)
    paciente.ultimoRegistro = new Date().toISOString()
  }

  return res.status(201).json(registro)
})

// POST /registros/refeicao
app.post('/registros/refeicao', authMiddleware, (req, res) => {
  const { pacienteId, descricao, tipo_refeicao, carboidratos, observacao } = req.body
  if (!descricao) return res.status(400).json({ message: 'Descrição da refeição é obrigatória.' })

  const paciente = db.pacientes.find((p) => p.id === pacienteId)
  const registro = {
    id: uuidv4(),
    pacienteId: pacienteId || null,
    pacienteNome: paciente?.nome || 'Desconhecido',
    tipo: 'refeicao',
    valor: null,
    momento: null,
    descricao,
    tipo_refeicao: tipo_refeicao || 'almoco',
    carboidratos: carboidratos ? Number(carboidratos) : null,
    observacao: observacao || '',
    criadoEm: new Date().toISOString(),
  }
  db.registros.push(registro)

  if (paciente) paciente.ultimoRegistro = new Date().toISOString()

  return res.status(201).json(registro)
})

// ─── Alimentação ──────────────────────────────────────────────────────────────

// GET /alimentacao
app.get('/alimentacao', authMiddleware, (req, res) => {
  return res.json({ data: db.alimentacao })
})

// POST /alimentacao
app.post('/alimentacao', authMiddleware, (req, res) => {
  const { pacienteId, nome, refeicoes, observacao } = req.body
  const plano = {
    id: uuidv4(),
    pacienteId,
    nome: nome || 'Plano alimentar',
    refeicoes: refeicoes || [],
    observacao: observacao || '',
    criadoEm: new Date().toISOString(),
  }
  db.alimentacao.push(plano)
  return res.status(201).json(plano)
})

// ─── Saúde ────────────────────────────────────────────────────────────────────

// GET /saude/:pacienteId
app.get('/saude/:pacienteId', authMiddleware, (req, res) => {
  const dados = db.saude.filter((s) => s.pacienteId === req.params.pacienteId)
  return res.json({ data: dados })
})

// POST /saude/:pacienteId
app.post('/saude/:pacienteId', authMiddleware, (req, res) => {
  const { peso, altura, imc, meta } = req.body
  const entrada = {
    id: uuidv4(),
    pacienteId: req.params.pacienteId,
    peso: peso ? Number(peso) : null,
    altura: altura ? Number(altura) : null,
    imc: imc ? Number(imc) : peso && altura ? Number((peso / (altura / 100) ** 2).toFixed(1)) : null,
    meta: meta || '',
    criadoEm: new Date().toISOString(),
  }
  db.saude.push(entrada)
  return res.status(201).json(entrada)
})

// ─── Perfil ───────────────────────────────────────────────────────────────────

// GET /perfil
app.get('/perfil', authMiddleware, (req, res) => {
  return res.json(usuarioPublico(req.user))
})

// PATCH /perfil
app.patch('/perfil', authMiddleware, async (req, res) => {
  const { nome, senhaAtual, novaSenha } = req.body
  const idx = db.usuarios.findIndex((u) => u.id === req.user.id)

  if (nome) db.usuarios[idx].nome = nome

  if (senhaAtual && novaSenha) {
    const ok = await bcrypt.compare(senhaAtual, db.usuarios[idx].senha)
    if (!ok) return res.status(400).json({ message: 'Senha atual incorreta.' })
    if (novaSenha.length < 8) return res.status(400).json({ message: 'Nova senha deve ter pelo menos 8 caracteres.' })
    db.usuarios[idx].senha = await bcrypt.hash(novaSenha, 10)
  }

  return res.json(usuarioPublico(db.usuarios[idx]))
})

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /auth/login',
      'POST /auth/cadastro',
      'POST /auth/refresh',
      'POST /auth/esqueci-senha',
      'GET  /auth/me',
      'GET  /pacientes',
      'POST /pacientes',
      'GET  /pacientes/:id',
      'PATCH /pacientes/:id',
      'DELETE /pacientes/:id',
      'GET  /registros',
      'POST /registros/glicemia',
      'POST /registros/refeicao',
      'GET  /alimentacao',
      'POST /alimentacao',
      'GET  /saude/:pacienteId',
      'POST /saude/:pacienteId',
      'GET  /perfil',
      'PATCH /perfil',
    ],
  })
})

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ message: 'Rota não encontrada.' })
})

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ message: 'Erro interno do servidor.' })
})

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║     🥗  NutriCare API rodando!         ║
╠════════════════════════════════════════╣
║  URL:   http://localhost:${PORT}           ║
║  Health: http://localhost:${PORT}/health   ║
╠════════════════════════════════════════╣
║  Login demo:                           ║
║  📧 demo@nutricare.com                 ║
║  🔑 Demo@1234                          ║
╚════════════════════════════════════════╝
  `)
})
