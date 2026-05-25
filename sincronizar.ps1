Write-Host "---------------------------------------------------" -ForegroundColor Cyan
Write-Host " Sincronizador Automático do GitHub Ativado!" -ForegroundColor Green
Write-Host " O seu TCC está sendo salvo na nuvem a cada 10 segundos." -ForegroundColor Yellow
Write-Host " Deixe esta janela preta aberta enquanto trabalha." -ForegroundColor Yellow
Write-Host " Para parar, basta fechar esta janela." -ForegroundColor Red
Write-Host "---------------------------------------------------" -ForegroundColor Cyan

while ($true) {
    # Verifica se há alguma mudança nos arquivos
    $gitPath = "git"
    $status = & $gitPath status --porcelain
    if ($status) {
        Write-Host ""
        Write-Host "[*] Mudanças detectadas! Preparando para salvar..." -ForegroundColor Magenta
        
        & $gitPath add .
        
        $dataHora = Get-Date -Format "dd/MM/yyyy HH:mm:ss"
        & $gitPath commit -m "Salvo automaticamente em $dataHora"
        
        Write-Host "[*] Enviando para o GitHub..." -ForegroundColor Magenta
        & $gitPath push
        
        Write-Host "[OK] Sucesso! Tudo salvo no GitHub às $dataHora" -ForegroundColor Green
    }
    
    # Pausa de 10 segundos antes de verificar novamente
    Start-Sleep -Seconds 10
}
