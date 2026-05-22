<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/marketing.php';
?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Auvvo | Automação Simplificada</title>
    <meta name="description"
        content="agente de vendas com IA para WhatsApp. Planos a partir de R$ 69,90/mês ou R$ 297/ano. Atenda e venda 24/7.">
    <meta property="og:title" content="Auvvo | Automação Simplificada">
    <meta property="og:description"
        content="agente de vendas com IA para WhatsApp. Planos a partir de R$ 69,90/mês ou R$ 297/ano.">
    <meta property="og:type" content="website">
    <meta property="og:url" content="<?= htmlspecialchars(mkt_base_url() . '/', ENT_QUOTES, 'UTF-8') ?>">
    <meta property="og:image" content="<?= htmlspecialchars(mkt_og_image_url(), ENT_QUOTES, 'UTF-8') ?>">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="<?= htmlspecialchars(mkt_og_image_url(), ENT_QUOTES, 'UTF-8') ?>">
    <link rel="icon" type="image/png" href="icone.png">

    <link rel="stylesheet" href="style.css">
    <?php mkt_render_tracking_head(); ?>
    <!-- Font Awesome for Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>

<body>
    <?php mkt_render_tracking_body_open(); ?>
    <!-- Background Video -->
    <div class="gif-background">
        <video autoplay muted loop playsinline poster="favicon.png" preload="metadata">
            <source src="202604302219.mp4" type="video/mp4">
        </video>
    </div>

    <!-- Header/Nav -->
    <div class="navbar-container container">
        <nav class="navbar" aria-label="Principal">
            <div class="logo">
                <a href="<?= htmlspecialchars(mkt_base_url() . '/', ENT_QUOTES, 'UTF-8') ?>" aria-label="Auvvo — início"><img src="favicon.png" width="120" height="auto"
                        alt="Auvvo"></a>
            </div>
            <div class="nav-links" id="primary-nav" role="navigation" aria-label="Menu principal">
                <a href="#casos-de-uso">Casos de Uso</a>
                <a href="#como-funciona">Como Funciona</a>
                <a href="#hub">Ecossistema</a>
                <a href="#prova-social">Resultados</a>
                <a href="#precos">Preços</a>
                <a href="#faq">FAQ</a>
                <a href="login" class="nav-mobile-login">Login</a>
            </div>
            <button type="button" class="nav-toggle" id="nav-toggle" aria-label="Abrir menu" aria-expanded="false"
                aria-controls="primary-nav">
                <span class="nav-toggle-bar"></span>
                <span class="nav-toggle-bar"></span>
                <span class="nav-toggle-bar"></span>
            </button>
            <div class="nav-actions">
                <a href="login" class="btn btn-glass" style="padding: 10px 24px; font-size: 0.875rem;">Login</a>
                <a href="checkout?plan=anual" class="btn btn-primary"
                    style="padding: 10px 24px; font-size: 0.875rem;">Começar Agora</a>
            </div>
        </nav>
    </div>
    <div class="nav-backdrop" id="nav-backdrop" aria-hidden="true" hidden></div>

    <!-- Hero Section -->
    <section class="hero container">
        <div class="hero-grid">
            <div class="hero-content reveal">
                <div class="section-tag"><i class="fa-solid fa-sparkles"></i> Inteligência Artificial</div>
                <h1 class="hero-title">O Seu agente de Vendas <br>para o WhatsApp</h1>
                <p class="hero-subtitle">Atenda, qualifique e venda 24h por dia no piloto automático. Aumente seu
                    faturamento sem precisar contratar mais atendentes.</p>
                <div class="hero-actions">
                    <a href="login" class="btn btn-primary">Quero Começar Agora</a>
                    <a href="#como-funciona" class="btn btn-glass">Ver na Prática</a>
                </div>
            </div>
            <div class="hero-visual reveal delay-200">
                <!-- Phone Frame (iPhone Mockup) -->
                <div class="chat-showcase">
                    <!-- Live Notification Popup -->
                    <div class="live-notification" id="live-notification">
                        <div class="live-notif-dot"></div>
                        <div class="live-notif-icon"><i class="fa-solid fa-arrow-trend-up" id="notif-icon"></i></div>
                        <div class="live-notif-content">
                            <span class="live-notif-title" id="notif-title">NOVO ATENDIMENTO</span>
                            <span class="live-notif-desc" id="notif-desc">Cliente aguardando</span>
                        </div>
                    </div>

                    <img src="icone.png" width="256" height="256" style="width:80%; margin-top: 50px; height:auto;"
                        alt="" decoding="async" fetchpriority="high">
                </div>
            </div>
        </div>
        <div class="stats-bar reveal delay-300">
            <div class="stat-item">
                <div class="stat-value">24/7</div>
                <div class="stat-label">Atendimento</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">100%</div>
                <div class="stat-label">Automático</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">Segundos</div>
                <div class="stat-label">Resposta rápida*</div>
            </div>
        </div>
        <p class="hero-stat-note reveal delay-300">*Tempo médio depende da API de IA, da rede e da carga do momento.</p>
    </section>

    <!-- Video Section -->
    <section class="section container">
        <div class="section-header reveal">
            <div class="section-tag">A Máquina Trabalhando</div>
            <h2 class="section-title">Veja os Resultados Acontecendo</h2>
        </div>
        <div class="video-showcase reveal delay-200">
            <div class="video-frame">
                <button type="button" class="play-btn" id="video-play-trigger"
                    aria-label="Assistir demonstração em vídeo">
                    <i class="fa-solid fa-play" aria-hidden="true"></i>
                </button>
                <img src="painel-auvvo-demo.png"
                    alt="Captura do painel Auvvo — métricas e conversas" loading="lazy" decoding="async" width="1200" height="675">
            </div>
        </div>
    </section>

    <!-- Prova social -->
    <section id="prova-social" class="section container">
        <div class="section-header reveal">
            <div class="section-tag">Confiança</div>
            <h2 class="section-title">Operações que escalam no WhatsApp</h2>
        </div>
        <div class="social-proof-stats reveal delay-100">
            <div class="sp-stat">
                <strong>24/7</strong>
                <span>Disponibilidade do agente enquanto sua instância estiver conectada</span>
            </div>
            <div class="sp-stat">
                <strong>1 painel</strong>
                <span>Vários agentes e números organizados no mesmo lugar</span>
            </div>
            <div class="sp-stat">
                <strong>Handoff</strong>
                <span>Transbordo para humano quando você define que deve pausar</span>
            </div>
        </div>
        <p class="sp-disclaimer reveal delay-100">Disponibilidade contínua do agente depende da sua instância WhatsApp
            permanecer conectada e das configurações que você definir. Resultados comerciais variam por nicho, oferta e
            operação.</p>
        <div class="cases-cta-card reveal delay-200">
            <h3 class="section-title" style="font-size: 1.35rem; margin-bottom: 12px;">Cases com nome, foto e números reais</h3>
            <p style="color: var(--text-secondary); line-height: 1.65; margin-bottom: 22px; font-size: 0.98rem;">
                Estamos substituindo depoimentos genéricos por histórias verificáveis de clientes. Se você já usa a Auvvo
                e aceita aparecer aqui, fale com a gente — ou tire dúvidas ao vivo antes de assinar.
            </p>
            <div style="display: flex; flex-wrap: wrap; gap: 12px; justify-content: center;">
                <?php if (mkt_whatsapp_href() !== ''): ?>
                <a class="btn btn-primary" href="<?= htmlspecialchars(mkt_whatsapp_href(), ENT_QUOTES, 'UTF-8') ?>"
                    target="_blank" rel="noopener noreferrer" style="padding: 12px 22px;"><i
                        class="fa-brands fa-whatsapp" style="margin-right: 8px;"></i> WhatsApp</a>
                <?php endif; ?>
                <a class="btn btn-glass" href="mailto:<?= htmlspecialchars(mkt_support_email(), ENT_QUOTES, 'UTF-8') ?>?subject=Depoimento%20ou%20d%C3%BAvidas%20sobre%20a%20Auvvo"
                    style="padding: 12px 22px;"><i class="fa-solid fa-envelope" style="margin-right: 8px;"></i>
                    <?= htmlspecialchars(mkt_support_email(), ENT_QUOTES, 'UTF-8') ?></a>
            </div>
        </div>
    </section>

    <!-- Use Cases Grid (Veja na Prática) -->
    <section id="casos-de-uso" class="section container">
        <div class="section-header reveal">
            <div class="section-tag">Veja na Prática</div>
            <h2 class="section-title">O agente Adaptado ao Seu Nicho</h2>
        </div>
        <div class="use-cases-grid reveal delay-200">
            <div class="use-case-card">
                <div class="uc-header"><i class="fa-solid fa-stethoscope"></i> Clínicas</div>
                <div class="uc-chat">
                    <div class="chat-bubble received">Queria agendar uma consulta.</div>
                    <div class="chat-bubble sent">Claro! Temos horários amanhã às 14h ou 16h. Qual prefere?</div>
                </div>
            </div>
            <div class="use-case-card">
                <div class="uc-header"><i class="fa-solid fa-cart-shopping"></i> E-commerce</div>
                <div class="uc-chat">
                    <div class="chat-bubble received">Tem dessa blusa G?</div>
                    <div class="chat-bubble sent">Temos sim! Aqui está o link com 10% de desconto 🛒</div>
                </div>
            </div>
            <div class="use-case-card">
                <div class="uc-header"><i class="fa-solid fa-burger"></i> Delivery</div>
                <div class="uc-chat">
                    <div class="chat-bubble received">Quero pedir uma pizza.</div>
                    <div class="chat-bubble sent">Ótima escolha! Segue nosso cardápio digital para você pedir 🍕</div>
                </div>
            </div>
            <div class="use-case-card">
                <div class="uc-header"><i class="fa-solid fa-graduation-cap"></i> Infoprodutos</div>
                <div class="uc-chat">
                    <div class="chat-bubble received">Como acesso o curso?</div>
                    <div class="chat-bubble sent">O acesso foi enviado para o seu e-mail! Precisa que eu reenvie? 🎓
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Você no Controle (Antes vs Depois) -->
    <section class="section container">
        <div class="section-header reveal">
            <div class="section-tag">A Verdade Sobre Vendas</div>
            <h2 class="section-title">Você no Controle do Seu Negócio</h2>
        </div>
        <div class="control-grid reveal">
            <div class="control-card before">
                <div class="control-header"><i class="fa-solid fa-xmark"></i> Antes da Auvvo</div>
                <ul class="control-list">
                    <li><i class="fa-regular fa-circle-xmark"></i> Pagar salários fixos e encargos altos</li>
                    <li><i class="fa-regular fa-circle-xmark"></i> Perder vendas de madrugada e finais de semana</li>
                    <li><i class="fa-regular fa-circle-xmark"></i> Clientes irritados com demora no atendimento</li>
                    <li><i class="fa-regular fa-circle-xmark"></i> Treinamento constante de novos atendentes</li>
                </ul>
            </div>
            <div class="control-card after">
                <div class="control-header"><i class="fa-solid fa-check"></i> Com a Auvvo</div>
                <ul class="control-list">
                    <li><i class="fa-regular fa-circle-check"></i> Vendas rodando 24 horas por dia, 7 dias por semana
                    </li>
                    <li><i class="fa-regular fa-circle-check"></i> Atendimento instantâneo para 1.000 pessoas ao mesmo
                        tempo</li>
                    <li><i class="fa-regular fa-circle-check"></i> Custos operacionais reduzidos a frações de centavos
                    </li>
                    <li><i class="fa-regular fa-circle-check"></i> Padrão de qualidade impecável e persuasivo nas
                        mensagens</li>
                </ul>
            </div>
        </div>
    </section>

    <!-- 4 Passos -->
    <section id="como-funciona" class="section container">
        <div class="section-header reveal">
            <div class="section-tag">Simplicidade Absoluta</div>
            <h2 class="section-title">O Seu agente Pronto em 4 Passos</h2>
        </div>
        <div class="steps-grid reveal">
            <div class="step-card">
                <div class="step-number">1</div>
                <h3>Crie sua Conta</h3>
                <p>Acesse o painel da Auvvo em menos de 1 minuto e assine seu plano.</p>
            </div>
            <div class="step-card">
                <div class="step-number">2</div>
                <h3>Conecte</h3>
                <p>Leia o QR Code com seu celular, exatamente como faz no WhatsApp Web.</p>
            </div>
            <div class="step-card">
                <div class="step-number">3</div>
                <h3>Treine a I.A.</h3>
                <p>Cole o texto com informações da sua empresa, seus produtos e preços.</p>
            </div>
            <div class="step-card">
                <div class="step-number">4</div>
                <h3>Ligue a Máquina</h3>
                <p>Ative o piloto automático e veja o agente atender e vender por você 24/7.</p>
            </div>
        </div>
    </section>


    <!-- Bento Features Grid -->
    <section id="hub" class="section container">
        <div class="section-header reveal">
            <div class="section-tag">Poder Extremo</div>
            <h2 class="section-title">Tudo o Que Você Precisa para Dominar as Vendas</h2>
        </div>
        <div class="bento-grid reveal">
            <div class="bento-card">
                <div class="bento-icon"><i class="fa-solid fa-users"></i></div>
                <h3>Atendimentos Simultâneos</h3>
                <p>O agente atende 1, 100 ou 1.000 clientes ao mesmo tempo sem perder a qualidade, sem engasgar e sem
                    gerar filas de espera.</p>
            </div>
            <div class="bento-card">
                <div class="bento-icon"><i class="fa-solid fa-headset"></i></div>
                <h3>Transbordo Humano Inteligente</h3>
                <p>Se a I.A. não souber responder uma dúvida muito específica, ela pausa automaticamente e chama um
                    atendente humano da sua equipe.</p>
            </div>
            <div class="bento-card">
                <div class="bento-icon"><i class="fa-solid fa-microphone"></i></div>
                <h3>Simulação de Áudios</h3>
                <p>Envie áudios gravados simulando que estão sendo gravados na hora (com o status "gravando áudio..."),
                    aumentando a conexão e a conversão.</p>
            </div>
            <div class="bento-card">
                <div class="bento-icon"><i class="fa-solid fa-calendar-check"></i></div>
                <h3>Agendamento e confirmações</h3>
                <p>O agente pode conduzir fluxos de data/horário e confirmações com base no que você documentar na base
                    de conhecimento; integrações nativas com calendários externos dependem do seu fluxo e das
                    ferramentas
                    que você utilizar.</p>
            </div>
        </div>
    </section>

    <!-- Invoice / Economia -->
    <section id="economia" class="section container">
        <div class="section-header reveal">
            <div class="section-tag">Retorno de Investimento</div>
            <h2 class="section-title">A Matemática do Lucro</h2>
        </div>

        <!-- ROI Image Generated by AI -->
        <div style="text-align: center;">
            <img src="roi_comparison_Auvvo_1777771986623.png"
                alt="Comparativo de custos Auvvo versus atendimento tradicional" width="1000" height="560"
                style="width: 100%; max-width: 1000px; height: auto;" loading="lazy" decoding="async">
        </div>

        <div id="precos" class="pricing-plans-wrap reveal delay-200">
            <div class="section-header">
                <div class="section-tag">Investimento</div>
                <h2 class="section-title">Planos claros, sem surpresas</h2>
                <p class="section-subtitle pricing-intro">Mesmo produto nos dois: escolha mensal ou anual.</p>
            </div>
            <div class="pricing-plans-grid">
                <div class="pricing-plan-card">
                    <h3 class="plan-card-title">Mensal</h3>
                    <p class="plan-card-tagline">Flexível, renovação automática</p>
                    <div class="plan-card-price">R$ 69,90<span>/mês</span></div>
                    <p class="plan-card-note">Cancele antes da próxima cobrança, sem burocracia.</p>
                    <ul class="plan-card-features">
                        <li><i class="fa-solid fa-check"></i> Painel completo, vários agentes e base de conhecimento
                        </li>
                        <li><i class="fa-solid fa-check"></i> WhatsApp (QR), campanhas e transbordo humano</li>
                        <li><i class="fa-solid fa-check"></i> Bom para validar antes de comprometer o ano</li>
                    </ul>
                    <div class="plan-card-cta">
                        <a href="checkout?plan=mensal" class="btn-plan btn-plan--outline">Assinar mensal — R$ 69,90</a>
                    </div>
                </div>
                <div class="pricing-plan-card featured">
                    <span class="plan-badge-pill">Recomendado</span>
                    <h3 class="plan-card-title">Anual</h3>
                    <p class="plan-card-tagline">Melhor custo por mês</p>
                    <div class="plan-card-price">R$ 297<span>/ano</span></div>
                    <p class="plan-savings">≈ R$ 24,75/mês · economia frente a 12× R$ 69,90 (R$ 838,80 no total)</p>
                    <p class="plan-card-note">Uma cobrança no ano — previsível e sem mensalidade no cartão.</p>
                    <ul class="plan-card-features">
                        <li><i class="fa-solid fa-check"></i> Tudo do mensal, com preço de lançamento no anual</li>
                        <li><i class="fa-solid fa-check"></i> Menos de R$ 0,82/dia para operar o ano inteiro</li>
                        <li><i class="fa-solid fa-check"></i> Ideal para quem vai escalar no WhatsApp</li>
                    </ul>
                    <div class="plan-card-cta">
                        <a href="checkout?plan=anual" class="btn-plan btn-plan--solid">Assinar anual — R$ 297</a>
                    </div>
                </div>
            </div>
        </div>

        <div class="invoice-wrapper reveal">
            <div class="invoice-card">
                <div class="invoice-items">
                    <p class="invoice-col-label">Referência mensal</p>
                    <h3 class="invoice-col-title">Sem automação no WhatsApp</h3>
                    <p class="invoice-col-desc">Custos típicos que somam quando o atendimento é só humano + ferramentas
                        básicas.</p>
                    <div class="invoice-line">
                        <span class="invoice-label">1 atendente (salário + encargos)</span>
                        <span class="invoice-price">R$ 2.500</span>
                    </div>
                    <div class="invoice-line">
                        <span class="invoice-label">Plataforma de chat simples</span>
                        <span class="invoice-price">R$ 497</span>
                    </div>
                    <div class="invoice-line">
                        <span class="invoice-label">Leads perdidos por demora</span>
                        <span class="invoice-price invoice-price--text">Alto impacto</span>
                    </div>
                </div>
                <div class="invoice-divider" aria-hidden="true"></div>
                <div class="invoice-total">
                    <p class="invoice-col-label invoice-col-label--accent">Com a Auvvo</p>
                    <h3 class="invoice-col-title">Um stack, um valor</h3>
                    <div class="invoice-pricing-lines">
                        <div class="invoice-price-line"><span class="invoice-price-amount">R$ 69,90</span> <span
                                class="invoice-price-period">/mês</span></div>
                        <div class="invoice-price-alt">ou <strong>R$ 297</strong> <span
                                class="invoice-price-period-inline">/ano</span> <span class="invoice-price-hint">(≈ R$
                                24,75/mês)</span></div>
                    </div>
                    <p class="total-desc">Funcionalidades iguais nos planos — só muda como você paga.</p>
                    <a href="checkout?plan=anual" class="btn-plan btn-plan--solid invoice-cta">Começar com o anual</a>
                    <a href="checkout?plan=mensal" class="btn-plan btn-plan--ghost invoice-cta-secondary">Prefiro
                        mensal</a>
                </div>
            </div>
        </div>
    </section>

    <!-- Pricing Banner -->
    <section class="section container">
        <div class="pricing-banner reveal">
            <h2>Comece a Vender no Piloto Automático</h2>
            <p
                style="max-width: 520px; margin: 0 auto 24px; font-size: 1.05rem; color: var(--text-secondary); line-height: 1.6;">
                Escolha o plano mensal (R$ 69,90) ou feche o ano com o melhor custo (R$ 297 à vista no anual).
            </p>
            <div class="pricing-cta-dual">
                <a href="checkout?plan=mensal" class="btn btn-glass" style="padding: 14px 28px;">Mensal — R$ 69,90</a>
                <a href="checkout?plan=anual" class="store-btn" style="margin: 0;">Anual — R$ 297</a>
            </div>
            <div class="bonus-list">
                <div class="bonus-item"><i class="fa-solid fa-check"></i><strong>Atendimentos Ilimitados</strong></div>
                <div class="bonus-item"><i class="fa-solid fa-check"></i><strong>Conexão WhatsApp Simplificada</strong>
                </div>
                <div class="bonus-item"><i class="fa-solid fa-check"></i><strong>I.A. com Conhecimento Exclusivo do Seu
                        Negócio</strong></div>
                <div class="bonus-item"><i class="fa-solid fa-check"></i><strong>Múltiplos Agentes no Mesmo
                        Painel</strong></div>
                <div class="bonus-item"><i class="fa-solid fa-check"></i><strong>Simulação de Áudios & Transbordo
                        Humano</strong></div>
            </div>
            <div class="guarantee-box">
                <i class="fa-solid fa-shield-halved"></i>
                <div class="guarantee-text">
                    <strong>Garantia de 7 Dias</strong>
                    <span>Peça reembolso total sem burocracia.</span>
                </div>
            </div>
        </div>
    </section>

    <!-- FAQ -->
    <section id="faq" class="section container">
        <div class="section-header reveal">
            <div class="section-tag">Dúvidas</div>
            <h2 class="section-title">Perguntas Frequentes</h2>
        </div>
        <div class="faq-list reveal">
            <div class="faq-item">
                <div class="faq-question"><i class="fa-solid fa-circle-question"></i> Preciso saber programar?</div>
                <div class="faq-answer">Não! A Auvvo foi desenhada para pessoas normais. Você só precisa escrever textos
                    simples, copiar e colar as informações do seu negócio (como o seu FAQ atual) para treinar a sua I.A.
                    instantaneamente.</div>
            </div>
            <div class="faq-item">
                <div class="faq-question"><i class="fa-solid fa-circle-question"></i> Funciona no WhatsApp Pessoal e
                    Business?</div>
                <div class="faq-answer">Sim — a conexão é feita via QR Code, no mesmo modelo do WhatsApp Web, e costuma
                    funcionar em contas pessoais e Business. Isso <strong>não é</strong> a API comercial oficial da Meta;
                    a Meta pode mudar regras ou limitar contas. Leia o aviso nos <a href="termos.php">Termos de Uso</a> e
                    a pergunta abaixo antes de escalar volume.</div>
            </div>
            <div class="faq-item">
                <div class="faq-question"><i class="fa-solid fa-circle-question"></i> Isso é a API oficial do WhatsApp
                    (Meta)? Quais riscos?</div>
                <div class="faq-answer">Não. A Auvvo usa pareamento por QR Code (mesma família técnica do WhatsApp Web),
                    diferente da WhatsApp Business Platform contratada com a Meta. Há risco teórico de restrição ou
                    banimento se a Meta entender que o uso viola as políticas dela — principalmente com automação
                    agressiva ou mensagens não solicitadas. Use com consentimento do cliente, boas práticas de LGPD e
                    supervisão humana nos fluxos críticos. Detalhes em <a href="termos.php">Termos de Uso</a>.</div>
            </div>
            <div class="faq-item">
                <div class="faq-question"><i class="fa-solid fa-circle-question"></i> E se a I.A. não souber a resposta?
                </div>
                <div class="faq-answer">Fique tranquilo. Você pode configurar uma regra de "transbordo": se a I.A. se
                    deparar com uma dúvida fora do seu treinamento, ela pausa automaticamente e avisa um atendente
                    humano da sua equipe para assumir a conversa.</div>
            </div>
            <div class="faq-item">
                <div class="faq-question"><i class="fa-solid fa-circle-question"></i> O agente envia áudios?</div>
                <div class="faq-answer">Sim! Você pode fazer upload dos seus áudios gravados e a I.A. vai enviá-los no
                    momento certo, simulando o status de "gravando áudio..." para passar o máximo de humanização ao
                    cliente.</div>
            </div>
            <div class="faq-item">
                <div class="faq-question"><i class="fa-solid fa-circle-question"></i> Consigo conectar mais de um
                    número?</div>
                <div class="faq-answer">Sim, nosso painel permite gerenciar múltiplas instâncias (números de WhatsApp)
                    simultaneamente. Você pode ter um agente diferente treinado para cada número.</div>
            </div>
            <div class="faq-item">
                <div class="faq-question"><i class="fa-solid fa-circle-question"></i> Como funciona a cobrança das
                    mensagens?</div>
                <div class="faq-answer">Você paga a assinatura fixa da Auvvo para ter acesso à plataforma e conexão com
                    WhatsApp. O custo de "inteligência" (API do ChatGPT) é cobrado direto pela OpenAI, custando apenas
                    frações de centavos por mensagem enviada, garantindo o custo mais baixo do mercado.</div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer-box container">
        <div class="footer-grid">
            <div class="footer-col">
                <h3 style="margin-bottom: 16px;">Auvvo</h3>
                <p
                    style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 24px; line-height: 1.6; padding-right: 20px;">
                    Transformando o atendimento via WhatsApp com Inteligência Artificial avançada. Aumente conversões
                    operando 24/7 no piloto automático.
                </p>
                <div class="social-links">
                    <a href="#"><i class="fa-brands fa-instagram"></i></a>
                    <a href="#"><i class="fa-brands fa-linkedin-in"></i></a>
                    <a href="#"><i class="fa-brands fa-youtube"></i></a>
                </div>
            </div>
            <div class="footer-col">
                <h4>Produto</h4>
                <a href="#como-funciona">Como Funciona</a>
                <a href="#casos-de-uso">Casos de Uso</a>
                <a href="#prova-social">Resultados</a>
                <a href="#precos">Preços</a>
                <a href="#faq">FAQ</a>
            </div>
            <div class="footer-col">
                <h4>Empresa</h4>
                <a href="sobre.php">Sobre nós</a>
                <a href="termos.php">Termos de uso</a>
                <a href="privacidade.php">Privacidade</a>
                <a href="mailto:<?= htmlspecialchars(mkt_support_email(), ENT_QUOTES, 'UTF-8') ?>?subject=Programa%20de%20afiliados">Afiliados</a>
            </div>
            <div class="footer-col">
                <h4>Contato</h4>
                <a href="mailto:<?= htmlspecialchars(mkt_support_email(), ENT_QUOTES, 'UTF-8') ?>"><i class="fa-solid fa-envelope" style="margin-right: 8px;"></i>
                    <?= htmlspecialchars(mkt_support_email(), ENT_QUOTES, 'UTF-8') ?></a>
                <?php if (mkt_whatsapp_href() !== ''): ?>
                <a href="<?= htmlspecialchars(mkt_whatsapp_href(), ENT_QUOTES, 'UTF-8') ?>" target="_blank"
                    rel="noopener noreferrer"><i class="fa-brands fa-whatsapp" style="margin-right: 8px;"></i>
                    <?= htmlspecialchars(mkt_whatsapp_footer_label(), ENT_QUOTES, 'UTF-8') ?></a>
                <?php endif; ?>
                <a href="login" class="btn btn-primary"
                    style="margin-top: 16px; padding: 12px; font-size: 0.875rem; text-align: center; justify-content: center; width: 100%;">Área
                    do Cliente</a>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; 2026 Auvvo AI. Todos os direitos reservados.</p>
            <p>Feito com <i class="fa-solid fa-heart" style="color: var(--text-danger);"></i> para times de vendas.</p>
        </div>
    </footer>

    <div class="video-modal" id="video-modal" role="dialog" aria-modal="true" aria-labelledby="video-modal-title"
        hidden>
        <button type="button" class="video-modal-backdrop" id="video-modal-backdrop" aria-label="Fechar vídeo"></button>
        <div class="video-modal-dialog">
            <h2 id="video-modal-title" class="visually-hidden">Demonstração Auvvo</h2>
            <button type="button" class="video-modal-close" id="video-modal-close" aria-label="Fechar">&times;</button>
            <video id="video-modal-player" controls playsinline preload="metadata" poster="favicon.png">
                <source src="202604302219.mp4" type="video/mp4">
            </video>
        </div>
    </div>

    <script>
        // Scroll Reveal Animation
        document.addEventListener('DOMContentLoaded', () => {
            const reveals = document.querySelectorAll('.reveal');

            const toggle = document.getElementById('nav-toggle');
            const navBackdrop = document.getElementById('nav-backdrop');
            const primaryNav = document.getElementById('primary-nav');
            function closeNav() {
                document.body.classList.remove('nav-open');
                toggle?.setAttribute('aria-expanded', 'false');
                navBackdrop?.setAttribute('hidden', '');
                navBackdrop?.setAttribute('aria-hidden', 'true');
            }
            function openNav() {
                document.body.classList.add('nav-open');
                toggle?.setAttribute('aria-expanded', 'true');
                navBackdrop?.removeAttribute('hidden');
                navBackdrop?.setAttribute('aria-hidden', 'false');
            }
            toggle?.addEventListener('click', () => {
                if (document.body.classList.contains('nav-open')) closeNav();
                else openNav();
            });
            navBackdrop?.addEventListener('click', closeNav);
            primaryNav?.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeNav));
            window.addEventListener('resize', () => {
                if (window.innerWidth > 1024) closeNav();
            });

            const videoModal = document.getElementById('video-modal');
            const videoPlayTrigger = document.getElementById('video-play-trigger');
            const videoModalPlayer = document.getElementById('video-modal-player');
            const videoModalClose = document.getElementById('video-modal-close');
            const videoModalBackdropBtn = document.getElementById('video-modal-backdrop');
            function closeVideoModal() {
                if (!videoModal) return;
                videoModal.setAttribute('hidden', '');
                if (videoModalPlayer) {
                    videoModalPlayer.pause();
                    videoModalPlayer.currentTime = 0;
                }
                if (!document.body.classList.contains('nav-open')) {
                    document.body.style.overflow = '';
                }
            }
            function openVideoModal() {
                if (!videoModal) return;
                videoModal.removeAttribute('hidden');
                document.body.style.overflow = 'hidden';
                videoModalPlayer?.play().catch(() => { });
            }
            videoPlayTrigger?.addEventListener('click', openVideoModal);
            videoModalClose?.addEventListener('click', closeVideoModal);
            videoModalBackdropBtn?.addEventListener('click', closeVideoModal);

            const revealOnScroll = () => {
                const windowHeight = window.innerHeight;
                reveals.forEach(reveal => {
                    const revealTop = reveal.getBoundingClientRect().top;
                    if (revealTop < windowHeight - 50) {
                        reveal.classList.add('active');
                    }
                });
            };
            window.addEventListener('scroll', revealOnScroll);
            revealOnScroll(); // Trigger initial check

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    closeNav();
                    closeVideoModal();
                }
            });
        });

        // Live Notifications Animation
        const notifications = [
            { title: 'NOVO ATENDIMENTO', desc: 'Cliente aguardando', icon: 'fa-arrow-trend-up' },
            { title: 'MENSAGEM RESPONDIDA', desc: 'Atendimento ativo', icon: 'fa-check-double' },
            { title: '+1 VENDA REALIZADA', desc: 'Assinatura Auvvo', icon: 'fa-sack-dollar' },
            { title: 'REUNIÃO AGENDADA', desc: 'Amanhã, 14h00', icon: 'fa-calendar-check' }
        ];

        let notifIndex = 0;
        const notifEl = document.getElementById('live-notification');
        const notifTitle = document.getElementById('notif-title');
        const notifDesc = document.getElementById('notif-desc');
        const notifIcon = document.getElementById('notif-icon');

        function rotateNotifications() {
            if (!notifEl) return;

            // Fade out
            notifEl.classList.remove('show');

            setTimeout(() => {
                // Update text and icon
                const n = notifications[notifIndex];
                notifTitle.textContent = n.title;
                notifDesc.textContent = n.desc;
                notifIcon.className = `fa-solid ${n.icon}`;

                // Randomize position (left or right side of the phone)
                if (Math.random() > 0.5) {
                    notifEl.style.left = '-60px';
                    notifEl.style.right = 'auto';
                } else {
                    notifEl.style.left = 'auto';
                    notifEl.style.right = '-60px';
                }

                // Fade in
                notifEl.classList.add('show');

                // Next item
                notifIndex = (notifIndex + 1) % notifications.length;
            }, 500); // Wait for fade out animation
        }

        // Start animation loop
        setTimeout(() => {
            rotateNotifications();
            setInterval(rotateNotifications, 4000); // rotate every 4 seconds
        }, 1000);
    </script>
    <?php mkt_render_floating_whatsapp(); ?>
</body>

</html>