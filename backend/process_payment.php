<?php
// backend/process_payment.php — checkout AbacatePay apenas
session_start();
require_once 'db.php';
require_once 'PaymentGateway.php';

// ── Verificação CSRF ────────────────────────────────────────────────────────
$csrf_ok = !empty($_SESSION['csrf_token'])
        && hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'] ?? '');
if (!$csrf_ok) {
    http_response_code(403);
    die('Sessão inválida. Volte e tente novamente.');
}
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));

// ── Configuração dos planos (AbacatePay: IDs de produto no painel) ──────────
$plans = [
    'mensal' => [
        'id'                    => 'mensal',
        'name'                  => 'Plano Mensal',
        'abacatepay_product_id' => ABACATEPAY_PRODUCT_MENSAL,
    ],
    'anual' => [
        'id'                    => 'anual',
        'name'                  => 'Plano Anual',
        'abacatepay_product_id' => ABACATEPAY_PRODUCT_ANUAL,
    ],
];

$plan_id = array_key_exists($_POST['plan'] ?? '', $plans) ? $_POST['plan'] : 'anual';
$plan    = $plans[$plan_id];

// ── Validação dos dados do formulário ────────────────────────────────────────
$name     = trim($_POST['name']     ?? '');
$email    = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
$password = $_POST['password'] ?? '';

if (!$name || !$email || !$password) {
    http_response_code(400);
    die('Preencha todos os campos obrigatórios.');
}
if (strlen($password) < 8) {
    http_response_code(400);
    die('Sua senha deve ter no mínimo 8 caracteres.');
}

// ── Criar ou recuperar usuário no banco ──────────────────────────────────────
try {
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $existingUser = $stmt->fetch();

    if ($existingUser) {
        $user_id = $existingUser['id'];
    } else {
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)"
        );
        $stmt->execute([$name, $email, $hash]);
        $user_id = $pdo->lastInsertId();
    }

    $gateway = 'abacatepay';
    $subStmt = $pdo->prepare(
        "SELECT id FROM subscriptions WHERE user_id = ? AND gateway = ? ORDER BY id DESC LIMIT 1"
    );
    $subStmt->execute([$user_id, $gateway]);
    if (!$subStmt->fetch()) {
        $pdo->prepare(
            "INSERT INTO subscriptions (user_id, plan_id, gateway, status) VALUES (?, ?, ?, 'incomplete')"
        )->execute([$user_id, $plan_id, $gateway]);
    }
} catch (PDOException $e) {
    error_log('[Auvvo] process_payment DB error: ' . $e->getMessage());
    die('Ocorreu um erro interno. Por favor, tente novamente.');
}

// ── Salvar dados do usuário na sessão (para o webhook conseguir identificá-lo)
$_SESSION['pending_payment'] = [
    'user_id'  => $user_id,
    'plan_id'  => $plan_id,
    'email'    => $email,
];

// ── Checkout AbacatePay ──────────────────────────────────────────────────────
try {
    $gw = new PaymentGateway('abacatepay');

    $result = $gw->processPayment(
        [
            'user_id' => $user_id,
            'email'   => $email,
            'name'    => $name,
        ],
        $plan,
        'card'
    );

    if ($result['status'] === 'redirect' && !empty($result['redirect_url'])) {
        if (!empty($result['checkout_id'])) {
            $_SESSION['abacatepay_checkout_id'] = $result['checkout_id'];
        }
        header('Location: ' . $result['redirect_url']);
        exit;
    }

    throw new Exception('Resposta inesperada do gateway.');

} catch (Exception $e) {
    $raw = $e->getMessage();
    error_log('[Auvvo] checkout error (abacatepay): ' . $raw);
    // Mostra mensagem da API ao usuário (produto inválido, sem ciclo, etc.). Oculta só falhas de rede/cURL.
    $showApi = IS_DEV || ABACATEPAY_DEBUG
        || str_starts_with($raw, 'AbacatePay:')
        || str_starts_with($raw, 'AbacatePay HTTP')
        || str_starts_with($raw, 'AbacatePay (cliente):');
    $msg = $showApi ? htmlspecialchars($raw, ENT_QUOTES, 'UTF-8') : 'Não foi possível iniciar o pagamento. Tente novamente.';
    http_response_code(502);
    die($msg);
}
