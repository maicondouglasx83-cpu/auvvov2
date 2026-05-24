<?php
/**
 * includes/auth.php
 * Guard centralizado de autenticação.
 * Inclua no topo de TODA página protegida (antes do HTML).
 *
 * Funções disponíveis após include:
 *   csrf_token()  → retorna o token da sessão atual
 *   csrf_field()  → ecoa o <input hidden> pronto para usar em forms
 *   csrf_verify() → verifica o token do POST; encerra com 403 se inválido
 */

// ── Configurar cookie de sessão seguro ─────────────────────────────────────
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['SERVER_PORT'] ?? '') == 443;
$isProduction = (defined('APP_ENV') && APP_ENV === 'production');
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'domain'   => '',
    'secure'   => $isProduction || $isHttps,
    'httponly' => true,
    'samesite' => 'Strict',
]);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ── Internacionalização ────────────────────────────────────────────────────
require_once __DIR__ . '/i18n.php';

// ── Timeout de sessão (8 horas de inatividade) ─────────────────────────────
$sessionTimeout = 8 * 60 * 60;
if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > $sessionTimeout)) {
    session_unset();
    session_destroy();
    header('Location: login?expired=1');
    exit;
}
$_SESSION['last_activity'] = time();

// ── Verificar autenticação ──────────────────────────────────────────────────
if (!isset($_SESSION['user_id'])) {
    header('Location: login');
    exit;
}

// ── CSRF (rotaciona a cada 30 minutos) ─────────────────────────────────────
if (empty($_SESSION['csrf_token']) || empty($_SESSION['csrf_token_created']) || (time() - $_SESSION['csrf_token_created'] > 1800)) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    $_SESSION['csrf_token_created'] = time();
}

function csrf_token(): string {
    return $_SESSION['csrf_token'];
}

function csrf_field(): void {
    echo '<input type="hidden" name="csrf_token" value="' . htmlspecialchars($_SESSION['csrf_token']) . '">';
}

function csrf_verify(): void {
    $token = $_POST['csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!hash_equals($_SESSION['csrf_token'] ?? '', $token)) {
        http_response_code(403);
        die('Requisição inválida. Por favor, recarregue a página e tente novamente.');
    }
}
