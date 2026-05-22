<?php
require_once 'includes/auth.php';
require_once 'backend/db.php';
require_once __DIR__ . '/backend/migrations.php';

auvvo_run_migrations($pdo);
require_once __DIR__ . '/backend/whatsapp_connections.inc.php';

$user_id = (int) $_SESSION['user_id'];
$whatsapp_connections = auvvo_whatsapp_connections_list($pdo, $user_id);

$stmt = $pdo->prepare('SELECT id, name FROM agents WHERE user_id = ? AND status != ? ORDER BY name');
$stmt->execute([$user_id, 'draft']);
$agents = $stmt->fetchAll();

$online = count(array_filter($whatsapp_connections, static fn ($c) => ($c['status'] ?? '') === 'online'));
?>
<!DOCTYPE html>
<html lang="<?= lang_html() ?>">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Conexões WhatsApp – Auvvo</title>
<link rel="stylesheet" href="app.css">
<link rel="stylesheet" href="assets/conexoes.css?v=20260522">
<script src="https://unpkg.com/@phosphor-icons/web"></script>
<link rel="icon" type="image/png" href="icone.png">
</head>
<body>
<div class="app-container">
<?php include 'includes/sidebar.php'; ?>
<main class="app-main">

  <div class="page-header">
    <div>
      <h1 class="page-title">Conexões WhatsApp</h1>
      <p class="page-hint">Linhas nomeadas (Vendas, Suporte…) independentes dos agentes. Use em <a href="automacoes">Automações</a>, <a href="campanhas">Campanhas</a> e no atendimento.</p>
    </div>
    <div class="page-header-actions">
      <a href="agentes" class="btn btn-outline"><i class="ph-bold ph-brain"></i> Agentes (cérebro)</a>
      <a href="automacoes" class="btn btn-secondary"><i class="ph-bold ph-lightning"></i> Automações</a>
    </div>
  </div>

  <div class="wa-stats">
    <div class="wa-stat">
      <span class="wa-stat-label">Linhas</span>
      <strong><?= count($whatsapp_connections) ?></strong>
    </div>
    <div class="wa-stat wa-stat--ok">
      <span class="wa-stat-label">Conectadas</span>
      <strong><?= $online ?></strong>
    </div>
    <div class="wa-stat">
      <span class="wa-stat-label">Arquitetura</span>
      <strong style="font-size:.875rem;font-weight:600">Linha ≠ Agente</strong>
    </div>
  </div>

  <div class="wa-layout">
    <section class="app-card wa-panel-list">
      <h2 class="wa-panel-title"><i class="ph-bold ph-list"></i> Suas linhas</h2>
      <input type="hidden" id="csrf-token" value="<?= htmlspecialchars(csrf_token()) ?>">

      <label class="form-label">Nova conexão</label>
      <div class="wa-create-row">
        <input type="text" id="wa-new-name" class="form-control" placeholder="Ex: Vendas, Suporte…" maxlength="120">
        <button type="button" class="btn btn-primary" id="btn-wa-create"><i class="ph-bold ph-plus"></i> Criar</button>
      </div>

      <label class="form-label">Agente padrão (cérebro)</label>
      <select id="wa-default-agent" class="form-control wa-field-gap">
        <option value="">— Definir nas automações —</option>
        <?php foreach ($agents as $ag): ?>
        <option value="<?= (int) $ag['id'] ?>"><?= htmlspecialchars($ag['name']) ?></option>
        <?php endforeach; ?>
      </select>

      <div id="wa-conn-list" class="wa-conn-list">
        <?php if (empty($whatsapp_connections)): ?>
        <p class="text-muted wa-empty">Nenhuma conexão ainda. Crie uma acima.</p>
        <?php else: foreach ($whatsapp_connections as $wc):
          $st = (string) ($wc['status'] ?? 'offline');
          $badgeClass = $st === 'online' ? 'online' : ($st === 'waiting_qr' ? 'waiting' : 'offline');
          $badgeLabel = $st === 'online' ? 'Conectado' : ($st === 'waiting_qr' ? 'Aguardando QR' : 'Desconectado');
        ?>
        <div class="wa-conn-item" data-conn-id="<?= (int) $wc['id'] ?>">
          <button type="button" class="wa-conn-select" data-conn-id="<?= (int) $wc['id'] ?>">
            <span class="wa-conn-name"><?= htmlspecialchars($wc['name']) ?></span>
            <span class="wa-conn-badge <?= $badgeClass ?>"><?= $badgeLabel ?></span>
          </button>
          <div class="wa-conn-actions">
            <button type="button" class="wa-conn-btn wa-conn-rename" data-conn-id="<?= (int) $wc['id'] ?>" title="Renomear"><i class="ph-bold ph-pencil-simple"></i></button>
            <button type="button" class="wa-conn-btn wa-conn-delete" data-conn-id="<?= (int) $wc['id'] ?>" title="Excluir"><i class="ph-bold ph-trash"></i></button>
          </div>
        </div>
        <?php endforeach; endif; ?>
      </div>
      <input type="hidden" id="wa-connection-select" value="<?= !empty($whatsapp_connections) ? (int) $whatsapp_connections[0]['id'] : 0 ?>">
    </section>

    <section class="app-card wa-panel-qr">
      <h2 class="wa-panel-title"><i class="ph-bold ph-qr-code"></i> Conectar</h2>
      <div id="evo-qr-box" class="wa-qr-wrap">
        <i class="ph-bold ph-qr-code wa-qr-placeholder"></i>
      </div>
      <div id="evo-status" class="wa-status">Selecione ou crie uma conexão</div>
      <div id="evo-actions" class="wa-actions"></div>

      <div id="evo-conn-edit" class="wa-edit" style="display:none">
        <label class="form-label">Nome da conexão</label>
        <input type="text" id="evo-conn-name" class="form-control" maxlength="120">
        <label class="form-label">Agente padrão (cérebro)</label>
        <select id="evo-conn-default-agent" class="form-control">
          <option value="">— Nenhum —</option>
          <?php foreach ($agents as $ag): ?>
          <option value="<?= (int) $ag['id'] ?>"><?= htmlspecialchars($ag['name']) ?></option>
          <?php endforeach; ?>
        </select>
        <button type="button" class="btn btn-secondary wa-save-btn" id="btn-evo-save-conn">
          <i class="ph-bold ph-floppy-disk"></i> Salvar conexão
        </button>
      </div>

      <div class="wa-help">
        <strong>Como funciona</strong>
        <ol>
          <li>Crie uma linha com nome (ex: <em>Vendas</em>)</li>
          <li>Gere o QR e escaneie no WhatsApp</li>
          <li>Em Automações, escolha a <strong>linha</strong> no gatilho e o <strong>agente</strong> na ação</li>
        </ol>
      </div>
    </section>
  </div>

</main>
</div>
<script src="assets/evolution-connect.js?v=20260522"></script>
<?php include __DIR__ . '/includes/toast.php'; ?>
</body>
</html>
