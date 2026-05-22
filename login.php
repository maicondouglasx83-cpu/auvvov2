<?php
// login.php
session_start();
require_once 'backend/db.php';
require_once 'includes/i18n.php';

// Redireciona se já autenticado
if (isset($_SESSION['user_id'])) {
    header('Location: dashboard');
    exit;
}

// Gera token CSRF para o formulário de login (sem usar auth.php pois não está autenticado)
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

$error = '';

// ── Rate Limiting por IP (sessão) ──────────────────────────────────────────
$ip_key     = 'login_attempts_' . md5($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$attempts   = $_SESSION[$ip_key]['count']   ?? 0;
$first_try  = $_SESSION[$ip_key]['first_at'] ?? time();
$window     = 15 * 60;
$max_tries  = 10;

if (time() - $first_try > $window) {
    $_SESSION[$ip_key] = ['count' => 0, 'first_at' => time()];
    $attempts = 0;
}

$blocked = $attempts >= $max_tries;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $csrf_ok = hash_equals($_SESSION['csrf_token'] ?? '', $_POST['csrf_token'] ?? '');
    if (!$csrf_ok) {
        $error = t('login_err_csrf');
    } elseif ($blocked) {
        $remaining = ceil(($window - (time() - $first_try)) / 60);
        $error = t('login_err_blocked', ['remaining' => $remaining]);
    } else {
        $email    = trim($_POST['email']    ?? '');
        $password = $_POST['password']      ?? '';

        if ($email && $password) {
            $stmt = $pdo->prepare("SELECT id, password_hash, name FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if ($user && password_verify($password, $user['password_hash'])) {
                session_regenerate_id(true);
                unset($_SESSION[$ip_key]);
                $_SESSION['user_id']   = $user['id'];
                $_SESSION['user_name'] = $user['name'];
                $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
                header('Location: dashboard');
                exit;
            } else {
                $_SESSION[$ip_key] = [
                    'count'    => $attempts + 1,
                    'first_at' => $first_try,
                ];
                $error = t('login_err_invalid');
            }
        } else {
            $error = t('login_err_empty');
        }
    }
}
?>
<!DOCTYPE html>
<html lang="<?= lang_html() ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= t('login_title') ?></title>
    <link rel="stylesheet" href="app.css">
    <script src="https://unpkg.com/@phosphor-icons/web"></script>
    
    <link rel="icon" type="image/png" href="icone.png">
    <style>
    .login-lang-bar {
        position: absolute;
        top: 20px;
        right: 20px;
        display: flex;
        align-items: center;
        gap: 2px;
        background: rgba(255,255,255,0.55);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        padding: 5px 8px;
        border-radius: 99px;
        border: 1px solid rgba(255,255,255,0.85);
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }
    .login-lang-bar .lang-sep {
        width: 1px;
        height: 12px;
        background: rgba(0,0,0,0.12);
        margin: 0 2px;
        border-radius: 1px;
    }
    </style>
</head>
<body>

    <div class="auth-layout">
        <video class="auth-video-bg" src="202604302219.mp4" autoplay loop muted playsinline></video>

        <!-- Language switcher for login page -->
        <div class="login-lang-bar">
            <i class="ph-bold ph-globe" style="font-size:.8rem;color:#8E8E9A;margin-right:2px"></i>
            <?php
            $langs = ['pt_BR' => 'PT-BR', 'es' => 'ES', 'en' => 'EN'];
            $cur   = current_lang();
            $keys  = array_keys($langs);
            foreach ($langs as $code => $label):
                $active = ($code === $cur);
                $last   = ($code === end($keys));
            ?>
            <a href="<?= htmlspecialchars(lang_url($code)) ?>"
               style="font-size:.7rem;font-weight:<?= $active ? '800' : '500' ?>;
                      color:<?= $active ? '#1A1A1E' : '#8E8E9A' ?>;
                      text-decoration:none;padding:3px 6px;border-radius:99px;
                      letter-spacing:.04em;transition:all .15s;
                      <?= $active ? 'background:rgba(255,255,255,0.9);box-shadow:0 1px 4px rgba(0,0,0,0.08);' : '' ?>"
               onmouseover="if(!<?= $active ? 'true' : 'false' ?>)this.style.color='#1A1A1E'"
               onmouseout="if(!<?= $active ? 'true' : 'false' ?>)this.style.color='#8E8E9A'"
            ><?= $label ?></a>
            <?php if (!$last): ?><span class="lang-sep"></span><?php endif; ?>
            <?php endforeach; ?>
        </div>

        <div class="auth-card">
            <div class="auth-header">
                <img src="favicon.png" alt="Auvvo Logo">
                <h2><?= t('login_heading') ?></h2>
                <p class="text-muted"><?= t('login_subtitle') ?></p>
            </div>

            <form action="login" method="POST" id="login-form">
                <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token']) ?>">

                <?php if ($error): ?>
                <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #EF4444; padding: 12px; border-radius: var(--radius-sm); font-size: 0.875rem; margin-bottom: 24px; text-align: center;">
                    <i class="ph-bold ph-warning"></i> <?= htmlspecialchars($error) ?>
                </div>
                <?php endif; ?>

                <?php if ($blocked): ?>
                <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); color: #F59E0B; padding: 12px; border-radius: var(--radius-sm); font-size: 0.875rem; margin-bottom: 24px; text-align: center;">
                    <i class="ph-bold ph-lock"></i> <?= t('login_blocked_banner') ?>
                </div>
                <?php endif; ?>

                <div class="form-group">
                    <label class="form-label"><?= t('login_email_label') ?></label>
                    <input type="email" name="email" class="form-control" placeholder="<?= t('login_email_ph') ?>"
                           value="<?= htmlspecialchars($_POST['email'] ?? '') ?>"
                           <?= $blocked ? 'disabled' : '' ?> required>
                </div>

                <div class="form-group">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <label class="form-label" style="margin-bottom: 0;"><?= t('login_pass_label') ?></label>
                        <a href="#" style="font-size: 0.75rem; color: var(--text-muted); text-decoration: none;"><?= t('login_forgot') ?></a>
                    </div>
                    <input type="password" name="password" class="form-control" placeholder="<?= t('login_pass_ph') ?>"
                           <?= $blocked ? 'disabled' : '' ?> required>
                </div>

                <button type="submit" id="login-btn" class="btn btn-primary btn-block"
                        style="margin-top: 24px;"
                        <?= $blocked ? 'disabled' : '' ?>>
                    <?= t('login_btn') ?>
                </button>

                <div style="text-align: center; margin-top: 24px; font-size: 0.875rem;">
                    <span class="text-muted"><?= t('login_no_account') ?></span>
                    <a href="checkout" style="color: var(--text-primary); font-weight: 600; text-decoration: none;"> <?= t('login_subscribe') ?></a>
                </div>
            </form>
        </div>
    </div>

    <script>
    document.getElementById('login-form').addEventListener('submit', function(e) {
        const btn = document.getElementById('login-btn');
        if (btn.disabled) { e.preventDefault(); return; }
        btn.disabled = true;
        btn.innerHTML = '<i class="ph-bold ph-circle-notch ph-spin"></i> <?= addslashes(t('login_btn_loading')) ?>';
    });
    </script>
</body>
</html>
