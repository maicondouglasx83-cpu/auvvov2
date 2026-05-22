<?php
// backend/stripe_success.php
// Página de retorno após o cliente completar o checkout no Stripe.
// Stripe redireciona para cá com ?session_id=cs_...
session_start();
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/PaymentGateway.php';

$sessionId = $_GET['session_id'] ?? '';

// Verificar se a sessão Stripe é válida antes de logar o usuário
$verified  = false;
$userEmail = '';

if ($sessionId && STRIPE_SECRET_KEY) {
    try {
        $session   = PaymentGateway::stripeGetSession($sessionId);
        $verified  = ($session['payment_status'] ?? '') === 'paid'
                  || ($session['status'] ?? '') === 'complete';
        $userEmail = $session['customer_email'] ?? $session['customer_details']['email'] ?? '';
    } catch (Exception $e) {
        error_log('[stripe_success] Erro ao verificar sessão: ' . $e->getMessage());
    }
}

// Se verificado, logar o usuário automaticamente
if ($verified && $userEmail) {
    $stmt = $pdo->prepare("SELECT id, name, email FROM users WHERE email = ? LIMIT 1");
    $stmt->execute([$userEmail]);
    $user = $stmt->fetch();

    if ($user) {
        session_regenerate_id(true);
        $_SESSION['user_id']    = $user['id'];
        $_SESSION['user_name']  = $user['name'];
        $_SESSION['user_email'] = $user['email'];
        unset($_SESSION['pending_payment'], $_SESSION['stripe_session_id']);

        header('Location: ../dashboard.php?welcome=1');
        exit;
    }
}

// Se o webhook ainda não processou ou verificação falhou — mostrar página de confirmação
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pagamento Confirmado | Auvvo</title>
    <link rel="stylesheet" href="../app.css">
    <script src="https://unpkg.com/@phosphor-icons/web"></script>
    <meta http-equiv="refresh" content="5;url=../login.php">
</head>
<body style="background: var(--bg-app); display: flex; align-items: center; justify-content: center; min-height: 100vh;">
    <div class="app-card" style="max-width: 480px; text-align: center; padding: 48px 40px;">
        <i class="ph-fill ph-check-circle" style="font-size: 4rem; color: #10B981; margin-bottom: 20px;"></i>
        <h1 style="font-size: 1.8rem; margin-bottom: 12px;">Pagamento Confirmado!</h1>
        <p class="text-muted" style="margin-bottom: 24px; line-height: 1.7;">
            Sua assinatura foi processada com sucesso.<br>
            Você será redirecionado para o login em instantes.
        </p>
        <a href="../login.php" class="btn btn-primary">
            Acessar Minha Conta <i class="ph-bold ph-arrow-right"></i>
        </a>
        <p class="text-muted" style="margin-top: 16px; font-size: 0.8rem;">Redirecionando automaticamente em 5 segundos...</p>
    </div>
</body>
</html>
