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

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ── Internacionalização ────────────────────────────────────────────────────
require_once __DIR__ . '/i18n.php';

// ── Verificar autenticação ──────────────────────────────────────────────────
if (!isset($_SESSION['user_id'])) {
    header('Location: login');
    exit;
}

// ── CSRF ───────────────────────────────────────────────────────────────────
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
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
