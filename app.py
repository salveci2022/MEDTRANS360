"""
MEDTRANS 360 — Plataforma Premium de Transporte de Pacientes
Versão 2.0 PRO | SpyNet Tecnologia Forense & Soluções Digitais Ltda
CNPJ: 64.000.808/0001-51
"""
import os, json, hashlib, secrets, logging
from flask import (Flask, render_template, request, jsonify,
                   redirect, url_for, session, make_response)
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from functools import wraps
from collections import defaultdict
import time
import anthropic

from database import init_db, get_conn, audit, now_str, hash_senha

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(32))
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    PERMANENT_SESSION_LIFETIME=timedelta(hours=12),
)

TZ = ZoneInfo('America/Sao_Paulo')
logging.basicConfig(level=logging.INFO)
log = logging.getLogger('medtrans')

ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')

# ── Rate limiting ─────────────────────────────────────────
_rate = defaultdict(list)
def rate_limit(key, max_calls=60, window=60):
    now = time.time()
    _rate[key] = [t for t in _rate[key] if now - t < window]
    if len(_rate[key]) >= max_calls: return True
    _rate[key].append(now)
    return False

def get_ip():
    return (request.headers.get('X-Forwarded-For', '').split(',')[0].strip()
            or request.remote_addr or '0.0.0.0')

# ── Auth ─────────────────────────────────────────────────
def login_required(f):
    @wraps(f)
    def dec(*a, **kw):
        if not session.get('user_id'):
            return redirect(url_for('login'))
        return f(*a, **kw)
    return dec

def perfil_required(*perfis):
    def decorator(f):
        @wraps(f)
        def dec(*a, **kw):
            if not session.get('user_id'):
                return redirect(url_for('login'))
            if session.get('perfil') not in perfis:
                return render_template('acesso_negado.html', perfil=session.get('perfil'))
            return f(*a, **kw)
        return dec
    return decorator

# ── Headers de segurança ─────────────────────────────────
@app.after_request
def sec(r):
    r.headers['X-Content-Type-Options'] = 'nosniff'
    r.headers['X-Frame-Options'] = 'SAMEORIGIN'
    return r

# ─────────────────────────────────────────────────────────
#  ROTAS PÚBLICAS
# ─────────────────────────────────────────────────────────

@app.route('/')
def index():
    if session.get('user_id'):
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    erro = None
    if request.method == 'POST':
        ip = get_ip()
        if rate_limit(f'login_{ip}', 10, 60):
            erro = 'Muitas tentativas. Aguarde 1 minuto.'
        else:
            email = request.form.get('email', '').strip().lower()
            senha = request.form.get('senha', '')
            conn = get_conn()
            u = conn.execute(
                "SELECT * FROM usuarios WHERE email=? AND senha=? AND ativo=1",
                (email, hash_senha(senha))
            ).fetchone()
            conn.close()
            if u:
                session.permanent = True
                session['user_id'] = u['id']
                session['nome'] = u['nome']
                session['email'] = u['email']
                session['perfil'] = u['perfil']
                audit(u['email'], 'login', '', ip)
                perfil = u['perfil']
                if perfil == 'motorista':
                    return redirect(url_for('painel_motorista'))
                elif perfil == 'clinica':
                    return redirect(url_for('painel_clinica'))
                else:
                    return redirect(url_for('dashboard'))
            else:
                erro = 'E-mail ou senha incorretos.'
                audit(email, 'login_falhou', '', ip)
    return render_template('login.html', erro=erro)

@app.route('/logout')
def logout():
    audit(session.get('email', ''), 'logout')
    session.clear()
    return redirect(url_for('login'))

# ─────────────────────────────────────────────────────────
#  DASHBOARD ADMIN/OPERADOR
# ─────────────────────────────────────────────────────────

@app.route('/dashboard')
@perfil_required('master', 'operador')
def dashboard():
    conn = get_conn()
    stats = {
        'corridas_hoje': conn.execute(
            "SELECT COUNT(*) FROM corridas WHERE data_agendada LIKE ?",
            (datetime.now(TZ).strftime('%d/%m/%Y') + '%',)
        ).fetchone()[0],
        'em_andamento': conn.execute(
            "SELECT COUNT(*) FROM corridas WHERE status='em_andamento'"
        ).fetchone()[0],
        'motoristas_ativos': conn.execute(
            "SELECT COUNT(*) FROM motoristas WHERE ativo=1"
        ).fetchone()[0],
        'total_corridas': conn.execute("SELECT COUNT(*) FROM corridas").fetchone()[0],
        'receita_mes': conn.execute(
            "SELECT COALESCE(SUM(valor),0) FROM corridas WHERE status='concluida'"
        ).fetchone()[0],
        'pacientes': conn.execute("SELECT COUNT(*) FROM pacientes").fetchone()[0],
    }
    corridas_recentes = conn.execute("""
        SELECT c.*, p.nome as paciente_nome, m.nome as motorista_nome,
               cl.nome as clinica_nome
        FROM corridas c
        LEFT JOIN pacientes p ON c.paciente_id=p.id
        LEFT JOIN motoristas m ON c.motorista_id=m.id
        LEFT JOIN clinicas cl ON c.clinica_id=cl.id
        ORDER BY c.id DESC LIMIT 8
    """).fetchall()
    conn.close()
    return render_template('dashboard.html', stats=stats,
                           corridas=corridas_recentes,
                           usuario=session.get('nome'),
                           perfil=session.get('perfil'))

# ─────────────────────────────────────────────────────────
#  CORRIDAS
# ─────────────────────────────────────────────────────────

@app.route('/corridas')
@perfil_required('master', 'operador')
def corridas():
    conn = get_conn()
    lista = conn.execute("""
        SELECT c.*, p.nome as paciente_nome, m.nome as motorista_nome,
               cl.nome as clinica_nome
        FROM corridas c
        LEFT JOIN pacientes p ON c.paciente_id=p.id
        LEFT JOIN motoristas m ON c.motorista_id=m.id
        LEFT JOIN clinicas cl ON c.clinica_id=cl.id
        ORDER BY c.id DESC
    """).fetchall()
    pacientes = conn.execute("SELECT * FROM pacientes ORDER BY nome").fetchall()
    motoristas = conn.execute("SELECT * FROM motoristas WHERE ativo=1 ORDER BY nome").fetchall()
    clinicas = conn.execute("SELECT * FROM clinicas WHERE ativo=1 ORDER BY nome").fetchall()
    conn.close()
    return render_template('corridas.html', corridas=lista,
                           pacientes=pacientes, motoristas=motoristas,
                           clinicas=clinicas, usuario=session.get('nome'),
                           perfil=session.get('perfil'))

@app.route('/corridas/nova', methods=['POST'])
@perfil_required('master', 'operador', 'clinica')
def nova_corrida():
    d = request.form
    conn = get_conn()
    conn.execute("""
        INSERT INTO corridas(paciente_id,motorista_id,clinica_id,origem,destino,
        tipo_servico,data_agendada,valor,observacoes,status,criado_em)
        VALUES(?,?,?,?,?,?,?,?,?,'agendada',?)
    """, (d.get('paciente_id'), d.get('motorista_id'), d.get('clinica_id'),
          d.get('origem'), d.get('destino'), d.get('tipo_servico'),
          d.get('data_agendada'), d.get('valor') or 0, d.get('observacoes'), now_str()))
    conn.commit()
    conn.close()
    audit(session.get('email'), 'nova_corrida', f"Destino: {d.get('destino')}", get_ip())
    return redirect(url_for('corridas'))

@app.route('/corridas/<int:cid>/status', methods=['POST'])
@login_required
def atualizar_status(cid):
    novo_status = request.form.get('status')
    conn = get_conn()
    updates = {'status': novo_status}
    if novo_status == 'em_andamento':
        updates['data_inicio'] = now_str()
    elif novo_status == 'concluida':
        updates['data_fim'] = now_str()
    set_clause = ', '.join(f"{k}=?" for k in updates)
    conn.execute(f"UPDATE corridas SET {set_clause} WHERE id=?",
                 (*updates.values(), cid))
    conn.commit()
    conn.close()
    return redirect(request.referrer or url_for('dashboard'))

@app.route('/corridas/<int:cid>/km', methods=['GET', 'POST'])
@login_required
def registrar_km(cid):
    conn = get_conn()
    corrida = conn.execute("""
        SELECT c.*, p.nome as paciente_nome, m.nome as motorista_nome
        FROM corridas c
        LEFT JOIN pacientes p ON c.paciente_id=p.id
        LEFT JOIN motoristas m ON c.motorista_id=m.id
        WHERE c.id=?
    """, (cid,)).fetchone()
    if not corrida:
        conn.close()
        return redirect(url_for('dashboard'))
    if request.method == 'POST':
        campos = ['km_saida_garagem', 'km_chegada_paciente', 'km_saida_paciente',
                  'km_chegada_destino', 'km_saida_destino', 'km_retorno_garagem']
        vals = {}
        for c in campos:
            v = request.form.get(c)
            if v:
                try:
                    vals[c] = float(v)
                except:
                    pass
        # Calcular KM total
        km_total = 0
        ks = vals.get('km_saida_garagem', corrida['km_saida_garagem'] or 0)
        kr = vals.get('km_retorno_garagem', corrida['km_retorno_garagem'] or 0)
        if ks and kr:
            km_total = kr - ks
        vals['km_total'] = km_total
        if vals:
            set_clause = ', '.join(f"{k}=?" for k in vals)
            conn.execute(f"UPDATE corridas SET {set_clause} WHERE id=?",
                         (*vals.values(), cid))
            conn.commit()
        conn.close()
        return redirect(url_for('painel_motorista') if session.get('perfil') == 'motorista' else url_for('corridas'))
    conn.close()
    return render_template('km_etapas.html', corrida=corrida,
                           usuario=session.get('nome'), perfil=session.get('perfil'))

# ─────────────────────────────────────────────────────────
#  MOTORISTAS
# ─────────────────────────────────────────────────────────

@app.route('/motoristas')
@perfil_required('master', 'operador')
def motoristas():
    conn = get_conn()
    lista = conn.execute("SELECT * FROM motoristas ORDER BY nome").fetchall()
    conn.close()
    return render_template('motoristas.html', motoristas=lista,
                           usuario=session.get('nome'), perfil=session.get('perfil'))

@app.route('/motoristas/novo', methods=['POST'])
@perfil_required('master', 'operador')
def novo_motorista():
    d = request.form
    conn = get_conn()
    conn.execute("""INSERT INTO motoristas(nome,cnh,telefone,veiculo,placa,criado_em)
                    VALUES(?,?,?,?,?,?)""",
                 (d.get('nome'), d.get('cnh'), d.get('telefone'),
                  d.get('veiculo'), d.get('placa'), now_str()))
    conn.commit()
    conn.close()
    return redirect(url_for('motoristas'))

# ─────────────────────────────────────────────────────────
#  PACIENTES
# ─────────────────────────────────────────────────────────

@app.route('/pacientes')
@perfil_required('master', 'operador')
def pacientes():
    conn = get_conn()
    lista = conn.execute("SELECT * FROM pacientes ORDER BY nome").fetchall()
    conn.close()
    return render_template('pacientes.html', pacientes=lista,
                           usuario=session.get('nome'), perfil=session.get('perfil'))

@app.route('/pacientes/novo', methods=['POST'])
@perfil_required('master', 'operador', 'clinica')
def novo_paciente():
    d = request.form
    conn = get_conn()
    conn.execute("""INSERT INTO pacientes(nome,cpf,telefone,endereco,convenio,observacoes,criado_em)
                    VALUES(?,?,?,?,?,?,?)""",
                 (d.get('nome'), d.get('cpf'), d.get('telefone'),
                  d.get('endereco'), d.get('convenio'), d.get('observacoes'), now_str()))
    conn.commit()
    conn.close()
    return redirect(url_for('pacientes'))

# ─────────────────────────────────────────────────────────
#  PAINÉIS POR PERFIL
# ─────────────────────────────────────────────────────────

@app.route('/painel/motorista')
@perfil_required('master', 'operador', 'motorista')
def painel_motorista():
    conn = get_conn()
    corridas = conn.execute("""
        SELECT c.*, p.nome as paciente_nome, cl.nome as clinica_nome
        FROM corridas c
        LEFT JOIN pacientes p ON c.paciente_id=p.id
        LEFT JOIN clinicas cl ON c.clinica_id=cl.id
        WHERE c.status IN ('agendada','em_andamento')
        ORDER BY c.id DESC
    """).fetchall()
    conn.close()
    return render_template('painel_motorista.html', corridas=corridas,
                           usuario=session.get('nome'), perfil=session.get('perfil'))

@app.route('/painel/clinica')
@perfil_required('master', 'operador', 'clinica')
def painel_clinica():
    conn = get_conn()
    corridas = conn.execute("""
        SELECT c.*, p.nome as paciente_nome, m.nome as motorista_nome
        FROM corridas c
        LEFT JOIN pacientes p ON c.paciente_id=p.id
        LEFT JOIN motoristas m ON c.motorista_id=m.id
        ORDER BY c.id DESC LIMIT 20
    """).fetchall()
    pacientes = conn.execute("SELECT * FROM pacientes ORDER BY nome").fetchall()
    motoristas = conn.execute("SELECT * FROM motoristas WHERE ativo=1").fetchall()
    conn.close()
    return render_template('painel_clinica.html', corridas=corridas,
                           pacientes=pacientes, motoristas=motoristas,
                           usuario=session.get('nome'), perfil=session.get('perfil'))

# ─────────────────────────────────────────────────────────
#  IA MEDTRANS
# ─────────────────────────────────────────────────────────

@app.route('/ia')
@login_required
def ia():
    conn = get_conn()
    historico = conn.execute(
        "SELECT * FROM chat_ia WHERE usuario_id=? ORDER BY id DESC LIMIT 20",
        (session.get('user_id'),)
    ).fetchall()
    conn.close()
    return render_template('ia.html', historico=list(reversed(historico)),
                           usuario=session.get('nome'), perfil=session.get('perfil'))

@app.route('/ia/chat', methods=['POST'])
@login_required
def ia_chat():
    if rate_limit(f"ia_{session.get('user_id')}", 20, 60):
        return jsonify({'erro': 'Limite de mensagens atingido. Aguarde 1 minuto.'}), 429
    
    data = request.get_json()
    msg = (data.get('mensagem') or '').strip()[:1000]
    if not msg:
        return jsonify({'erro': 'Mensagem vazia'}), 400

    conn = get_conn()
    historico = conn.execute(
        "SELECT role, conteudo FROM chat_ia WHERE usuario_id=? ORDER BY id DESC LIMIT 10",
        (session.get('user_id'),)
    ).fetchall()
    historico = list(reversed(historico))

    messages = [{'role': h['role'], 'content': h['conteudo']} for h in historico]
    messages.append({'role': 'user', 'content': msg})

    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        resp = client.messages.create(
            model='claude-sonnet-4-20250514',
            max_tokens=1000,
            system="""Você é a IA MEDTRANS — assistente especializada em transporte de pacientes, 
            logística médica e gestão de saúde. Ajuda operadores, motoristas e clínicas com:
            - Gestão de corridas e rotas
            - Protocolos com pacientes especiais (hemodiálise, oncologia, emergências)
            - Cálculo de custos e distâncias
            - Conformidade ANVISA e CFM para transporte médico
            - Dicas de atendimento humanizado
            Seja objetivo, profissional e sempre em português brasileiro.""",
            messages=messages
        )
        resposta = resp.content[0].text

        conn.execute("INSERT INTO chat_ia(usuario_id,role,conteudo,criado_em) VALUES(?,?,?,?)",
                     (session.get('user_id'), 'user', msg, now_str()))
        conn.execute("INSERT INTO chat_ia(usuario_id,role,conteudo,criado_em) VALUES(?,?,?,?)",
                     (session.get('user_id'), 'assistant', resposta, now_str()))
        conn.commit()
        conn.close()
        return jsonify({'resposta': resposta})
    except Exception as e:
        conn.close()
        log.error(f"IA erro: {e}")
        return jsonify({'erro': f'Erro na IA: {str(e)}'}), 500

# ─────────────────────────────────────────────────────────
#  FINANCEIRO
# ─────────────────────────────────────────────────────────

@app.route('/financeiro')
@perfil_required('master', 'operador')
def financeiro():
    conn = get_conn()
    corridas = conn.execute("""
        SELECT c.*, p.nome as paciente_nome, m.nome as motorista_nome
        FROM corridas c
        LEFT JOIN pacientes p ON c.paciente_id=p.id
        LEFT JOIN motoristas m ON c.motorista_id=m.id
        WHERE c.status='concluida'
        ORDER BY c.id DESC
    """).fetchall()
    total = conn.execute(
        "SELECT COALESCE(SUM(valor),0) FROM corridas WHERE status='concluida'"
    ).fetchone()[0]
    conn.close()
    return render_template('financeiro.html', corridas=corridas, total=total,
                           usuario=session.get('nome'), perfil=session.get('perfil'))

# ─────────────────────────────────────────────────────────
#  API JSON
# ─────────────────────────────────────────────────────────

@app.route('/api/stats')
@login_required
def api_stats():
    conn = get_conn()
    data = {
        'em_andamento': conn.execute("SELECT COUNT(*) FROM corridas WHERE status='em_andamento'").fetchone()[0],
        'agendadas': conn.execute("SELECT COUNT(*) FROM corridas WHERE status='agendada'").fetchone()[0],
        'concluidas_hoje': conn.execute(
            "SELECT COUNT(*) FROM corridas WHERE status='concluida' AND data_fim LIKE ?",
            (datetime.now(TZ).strftime('%d/%m/%Y') + '%',)
        ).fetchone()[0],
    }
    conn.close()
    return jsonify(data)

# ─────────────────────────────────────────────────────────
#  ACESSO NEGADO
# ─────────────────────────────────────────────────────────

@app.route('/acesso-negado')
def acesso_negado():
    return render_template('acesso_negado.html', perfil=session.get('perfil', ''))

# ─────────────────────────────────────────────────────────
#  INIT
# ─────────────────────────────────────────────────────────

with app.app_context():
    init_db()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
