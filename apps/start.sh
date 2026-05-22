#!/bin/bash
# NutriCare — Inicializar API e Frontend juntos

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     🥗  NutriCare — Iniciando tudo...    ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Instalar dependências da API se necessário
if [ ! -d "nutricare-api/node_modules" ]; then
  echo "📦 Instalando dependências da API..."
  cd nutricare-api && npm install && cd ..
fi

# Instalar dependências do frontend se necessário
if [ ! -d "web_nutricionista/node_modules" ]; then
  echo "📦 Instalando dependências do frontend..."
  cd web_nutricionista && npm install && cd ..
fi

echo ""
echo "🚀 Subindo API em http://localhost:3000"
echo "🌐 Subindo Frontend em http://localhost:5173"
echo ""
echo "📧 Login demo: demo@nutricare.com | Senha: Demo@1234"
echo ""
echo "Pressione Ctrl+C para encerrar tudo."
echo ""

# Rodar API em background e frontend em foreground
(cd nutricare-api && node server.js) &
API_PID=$!

(cd web_nutricionista && npm run dev) &
FRONT_PID=$!

# Aguardar Ctrl+C
trap "echo ''; echo 'Encerrando...'; kill $API_PID $FRONT_PID 2>/dev/null; exit 0" INT TERM
wait
