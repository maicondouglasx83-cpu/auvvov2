<?php
// backend/webhook_abacatepay.php
// Cadastre no dashboard AbacatePay (produção) com URL:
//   https://SEU-DOMINIO/agentes/backend/webhook_abacatepay.php?webhookSecret=SEU_SECRET
// Eventos: subscription.completed, subscription.renewed, subscription.cancelled
//
// Documentação: https://docs.abacatepay.com/pages/webhooks
//               https://docs.abacatepay.com/pages/webhooks/security

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/PaymentGateway.php';
require_once __DIR__ . '/mail/SubscriptionMailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('Method Not Allowed');
}

$querySecret = $_GET['webhookSecret'] ?? '';
$expected    = defined('ABACATEPAY_WEBHOOK_QUERY_SECRET') ? ABACATEPAY_WEBHOOK_QUERY_SECRET : '';
if ($expected === '' || !hash_equals($expected, $querySecret)) {
    error_log('[AbacatePay Webhook] secret de query inválido ou não configurado.');
    http_response_code(401);
    exit('Unauthorized');
}

$rawBody = file_get_contents('php://input');
$sig     = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '';
if ($rawBody === '' || !PaymentGateway::abacatepayVerifyWebhookSignature($rawBody, $sig)) {
    error_log('[AbacatePay Webhook] assinatura HMAC inválida.');
    http_response_code(400);
    exit('Invalid signature');
}

$payload = json_decode($rawBody, true);
if (!is_array($payload)) {
    http_response_code(400);
    exit('Invalid JSON');
}

$eventId = $payload['id'] ?? '';
$event   = $payload['event'] ?? '';
$data    = $payload['data'] ?? [];

if ($eventId !== '') {
    try {
        $chk = $pdo->prepare('SELECT 1 FROM webhook_event_log WHERE event_id = ? AND source = ? LIMIT 1');
        $chk->execute([$eventId, 'abacatepay']);
        if ($chk->fetch()) {
            http_response_code(200);
            header('Content-Type: application/json');
            echo json_encode(['received' => true, 'duplicate' => true]);
            exit;
        }
    } catch (PDOException $e) {
        error_log('[AbacatePay Webhook] webhook_event_log SELECT: ' . $e->getMessage());
        http_response_code(500);
        exit('Internal Server Error');
    }
}

error_log('[AbacatePay Webhook] evento: ' . $event . ' id=' . $eventId);

/**
 * @return array{user_id:int,plan_id:string}|null
 */
function auvvo_abacatepay_resolve_user_plan(array $data) {
    $checkout = $data['checkout'] ?? [];
    $ext        = $checkout['externalId'] ?? '';
    if (is_string($ext) && preg_match('/^auvvo_u(\d+)_([a-z0-9_]+)$/i', $ext, $m)) {
        return ['user_id' => (int)$m[1], 'plan_id' => strtolower($m[2])];
    }
    $meta = $checkout['metadata'] ?? [];
    if (!empty($meta['user_id'])) {
        return [
            'user_id' => (int)$meta['user_id'],
            'plan_id' => isset($meta['plan_id']) ? (string)$meta['plan_id'] : 'anual',
        ];
    }
    return null;
}

function auvvo_abacatepay_days_for_renewal(?string $frequency) {
    switch ($frequency) {
        case 'WEEKLY':         return 7;
        case 'MONTHLY':        return 30;
        case 'SEMIANNUALLY':   return 183;
        case 'ANNUALLY':       return 365;
        default:               return 30;
    }
}

try {
    $eventIdStr = trim((string) $eventId);
    switch ($event) {
        case 'subscription.completed': {
            $subId = $data['subscription']['id'] ?? null;
            $resolved = auvvo_abacatepay_resolve_user_plan($data);
            if (!$subId || !$resolved) {
                error_log('[AbacatePay Webhook] subscription.completed sem subscription.id ou externalId/metadata.');
                break;
            }
            $userId  = $resolved['user_id'];
            $planId  = $resolved['plan_id'];
            if (!in_array($planId, ['mensal', 'anual'], true)) {
                $planId = 'anual';
            }
            $days    = ($planId === 'mensal') ? 30 : 365;
            $periodEnd = date('Y-m-d H:i:s', strtotime("+{$days} days"));

            $q = $pdo->prepare(
                'SELECT id FROM subscriptions WHERE user_id = ? AND gateway = ? ORDER BY id DESC LIMIT 1'
            );
            $q->execute([$userId, 'abacatepay']);
            $row = $q->fetch();

            if ($row) {
                $pdo->prepare(
                    'UPDATE subscriptions
                     SET status = ?, subscription_id = ?, plan_id = ?, current_period_end = ?
                     WHERE id = ?'
                )->execute(['active', $subId, $planId, $periodEnd, $row['id']]);
            } else {
                $pdo->prepare(
                    'INSERT INTO subscriptions (user_id, plan_id, gateway, subscription_id, status, current_period_end)
                     VALUES (?, ?, ?, ?, ?, ?)'
                )->execute([$userId, $planId, 'abacatepay', $subId, 'active', $periodEnd]);
            }
            error_log('[AbacatePay Webhook] Assinatura ativa user_id=' . $userId . ' sub=' . $subId);
            SubscriptionMailer::onSubscriptionCompleted(
                $pdo,
                $userId,
                $planId,
                (string) $subId,
                $data
            );
            break;
        }

        case 'subscription.renewed': {
            $subId = $data['subscription']['id'] ?? null;
            $freq  = $data['subscription']['frequency'] ?? null;
            if (!$subId) {
                break;
            }
            $sel = $pdo->prepare(
                'SELECT s.plan_id, u.name, u.email
                 FROM subscriptions s
                 INNER JOIN users u ON u.id = s.user_id
                 WHERE s.subscription_id = ? AND s.gateway = ?
                 LIMIT 1'
            );
            $sel->execute([$subId, 'abacatepay']);
            $subRow = $sel->fetch(PDO::FETCH_ASSOC);
            if (!$subRow) {
                error_log('[AbacatePay Webhook] subscription.renewed: assinatura não encontrada sub=' . (string) $subId);
                break;
            }
            $days = auvvo_abacatepay_days_for_renewal(is_string($freq) ? $freq : null);
            $periodEnd = date('Y-m-d H:i:s', strtotime("+{$days} days"));
            $stmt = $pdo->prepare(
                'UPDATE subscriptions SET status = ?, current_period_end = ? WHERE subscription_id = ? AND gateway = ?'
            );
            $stmt->execute(['active', $periodEnd, $subId, 'abacatepay']);
            error_log('[AbacatePay Webhook] Renovação sub=' . $subId);
            SubscriptionMailer::onSubscriptionRenewed(
                $pdo,
                $subRow,
                $periodEnd,
                $data,
                $eventIdStr,
                (string) $subId
            );
            break;
        }

        case 'subscription.cancelled': {
            $subId = $data['subscription']['id'] ?? null;
            if (!$subId) {
                break;
            }
            $sel = $pdo->prepare(
                'SELECT s.plan_id, s.current_period_end, u.name, u.email
                 FROM subscriptions s
                 INNER JOIN users u ON u.id = s.user_id
                 WHERE s.subscription_id = ? AND s.gateway = ?
                 LIMIT 1'
            );
            $sel->execute([$subId, 'abacatepay']);
            $subRow = $sel->fetch(PDO::FETCH_ASSOC);
            if ($subRow) {
                $pdo->prepare(
                    'UPDATE subscriptions SET status = ? WHERE subscription_id = ? AND gateway = ?'
                )->execute(['canceled', $subId, 'abacatepay']);
                SubscriptionMailer::onSubscriptionCancelled(
                    $pdo,
                    $subRow,
                    (string) $subId,
                    $eventIdStr
                );
            } else {
                $pdo->prepare(
                    'UPDATE subscriptions SET status = ? WHERE subscription_id = ? AND gateway = ?'
                )->execute(['canceled', $subId, 'abacatepay']);
            }
            error_log('[AbacatePay Webhook] Cancelada sub=' . (string) $subId);
            break;
        }

        default:
            break;
    }
} catch (Exception $e) {
    error_log('[AbacatePay Webhook] erro ao processar ' . $event . ': ' . $e->getMessage());
    http_response_code(500);
    exit('Internal Server Error');
}

if ($eventId !== '') {
    try {
        $pdo->prepare('INSERT INTO webhook_event_log (event_id, source) VALUES (?, ?)')
            ->execute([$eventId, 'abacatepay']);
    } catch (PDOException $e) {
        error_log('[AbacatePay Webhook] falha ao registrar evento: ' . $e->getMessage());
    }
}

http_response_code(200);
header('Content-Type: application/json');
echo json_encode(['received' => true]);
