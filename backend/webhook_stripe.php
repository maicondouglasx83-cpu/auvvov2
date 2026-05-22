<?php
// backend/webhook_stripe.php
// Endpoint de webhook para eventos Stripe.
// Registrar em: dashboard.stripe.com/webhooks
// URL: https://seu-dominio.com/agentes/backend/webhook_stripe.php
//
// Eventos necessários a selecionar no Stripe Dashboard:
//   - checkout.session.completed
//   - customer.subscription.updated
//   - customer.subscription.deleted
//   - invoice.payment_failed

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/PaymentGateway.php';

// Apenas aceita POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('Method Not Allowed');
}

$payload   = file_get_contents('php://input');
$sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
$secret    = STRIPE_WEBHOOK_SECRET;

if (empty($secret)) {
    error_log('[Stripe Webhook] STRIPE_WEBHOOK_SECRET não configurado.');
    http_response_code(500);
    exit('Webhook secret not configured.');
}

// ── Verificar assinatura ─────────────────────────────────────────────────────
try {
    $event = PaymentGateway::stripeConstructEvent($payload, $sigHeader, $secret);
} catch (Exception $e) {
    error_log('[Stripe Webhook] Assinatura inválida: ' . $e->getMessage());
    http_response_code(400);
    exit('Webhook signature verification failed.');
}

$type = $event['type'] ?? '';
$data = $event['data']['object'] ?? [];

error_log('[Stripe Webhook] Evento recebido: ' . $type);

try {
    switch ($type) {

        // ── Checkout concluído com sucesso ────────────────────────────────
        case 'checkout.session.completed':
            $userId         = $data['client_reference_id'] ?? null;
            $subscriptionId = $data['subscription'] ?? null;
            $customerId     = $data['customer'] ?? null;
            $planId         = $data['metadata']['plan_id'] ?? null;

            if (!$userId || !$subscriptionId) {
                error_log('[Stripe Webhook] checkout.session.completed sem user_id ou subscription_id.');
                break;
            }

            // Salvar stripe_customer_id no usuário
            if ($customerId) {
                $pdo->prepare("UPDATE users SET stripe_customer_id = ? WHERE id = ?")
                    ->execute([$customerId, $userId]);
            }

            // Calcular fim do período (30 dias para mensal, 365 para anual)
            $days = ($planId === 'mensal') ? 30 : 365;
            $periodEnd = date('Y-m-d H:i:s', strtotime("+{$days} days"));

            // Ativar ou inserir assinatura
            $stmt = $pdo->prepare(
                "SELECT id FROM subscriptions WHERE user_id = ? AND gateway = 'stripe' ORDER BY id DESC LIMIT 1"
            );
            $stmt->execute([$userId]);
            $existing = $stmt->fetch();

            if ($existing) {
                $pdo->prepare(
                    "UPDATE subscriptions
                     SET status = 'active', subscription_id = ?, plan_id = ?, current_period_end = ?
                     WHERE id = ?"
                )->execute([$subscriptionId, $planId ?? 'anual', $periodEnd, $existing['id']]);
            } else {
                $pdo->prepare(
                    "INSERT INTO subscriptions (user_id, plan_id, gateway, subscription_id, status, current_period_end)
                     VALUES (?, ?, 'stripe', ?, 'active', ?)"
                )->execute([$userId, $planId ?? 'anual', $subscriptionId, $periodEnd]);
            }

            error_log('[Stripe Webhook] Assinatura ativada para user_id=' . $userId);
            break;

        // ── Assinatura atualizada (renovação, upgrade, downgrade) ─────────
        case 'customer.subscription.updated':
            $subscriptionId = $data['id'] ?? null;
            $status         = $data['status'] ?? 'incomplete';
            $periodEnd      = isset($data['current_period_end'])
                ? date('Y-m-d H:i:s', $data['current_period_end'])
                : null;

            $dbStatus = match($status) {
                'active', 'trialing'                => 'active',
                'past_due', 'unpaid'                => 'past_due',
                'canceled', 'incomplete_expired'    => 'canceled',
                default                             => 'incomplete',
            };

            $pdo->prepare(
                "UPDATE subscriptions SET status = ?, current_period_end = ? WHERE subscription_id = ?"
            )->execute([$dbStatus, $periodEnd, $subscriptionId]);

            error_log('[Stripe Webhook] Assinatura atualizada: ' . $subscriptionId . ' → ' . $dbStatus);
            break;

        // ── Assinatura cancelada ──────────────────────────────────────────
        case 'customer.subscription.deleted':
            $subscriptionId = $data['id'] ?? null;

            $pdo->prepare(
                "UPDATE subscriptions SET status = 'canceled' WHERE subscription_id = ?"
            )->execute([$subscriptionId]);

            error_log('[Stripe Webhook] Assinatura cancelada: ' . $subscriptionId);
            break;

        // ── Cobrança falhou ───────────────────────────────────────────────
        case 'invoice.payment_failed':
            $subscriptionId = $data['subscription'] ?? null;

            if ($subscriptionId) {
                $pdo->prepare(
                    "UPDATE subscriptions SET status = 'past_due' WHERE subscription_id = ?"
                )->execute([$subscriptionId]);
            }

            error_log('[Stripe Webhook] Pagamento falhou para subscription: ' . $subscriptionId);
            break;

        default:
            // Evento não tratado — apenas confirmar recebimento
            break;
    }
} catch (Exception $e) {
    error_log('[Stripe Webhook] Erro ao processar evento "' . $type . '": ' . $e->getMessage());
    http_response_code(500);
    exit('Internal Server Error');
}

http_response_code(200);
echo json_encode(['received' => true]);
?>
