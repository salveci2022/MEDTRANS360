"""MEDTRANS 360 PRO — v9.0"""
import os, json, hashlib, secrets, logging, smtplib, threading, urllib.request, urllib.parse
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, render_template, request, jsonify, redirect, url_for, session, send_file
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from functools import wraps
from collections import defaultdict
from io import BytesIO
import time, anthropic

from database import init_db, get_conn, audit, now_str, hoje_str, hash_senha

# ── Config ────────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(32))
# Filtro enumerate para templates Jinja2
import builtins
app_env = None  # será definido após criação do app

app.config.update(SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE='Lax',
                  PERMANENT_SESSION_LIFETIME=timedelta(hours=12))

TZ = ZoneInfo('America/Sao_Paulo')
app.jinja_env.globals['enumerate'] = enumerate
app.jinja_env.globals['zip'] = zip
log = logging.getLogger('medtrans')
logging.basicConfig(level=logging.INFO)

ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY','')
EMPRESA_WHATSAPP  = os.environ.get('EMPRESA_WHATSAPP','5561993962090')
EMPRESA_EMAIL     = os.environ.get('EMPRESA_EMAIL','medtranscontrole@gmail.com')
GMAIL_USER        = os.environ.get('GMAIL_USER','')
GMAIL_PASS        = os.environ.get('GMAIL_PASS','')
ZAPI_INSTANCE     = os.environ.get('ZAPI_INSTANCE','')
ZAPI_TOKEN        = os.environ.get('ZAPI_TOKEN','')
ZAPI_CLIENT_TOKEN = os.environ.get('ZAPI_CLIENT_TOKEN','')

# ── Rate limit ────────────────────────────────────────────
_rate = defaultdict(list)
def rate_limit(key, max_calls=60, window=60):
    now = time.time()
    _rate[key] = [t for t in _rate[key] if now-t < window]
    if len(_rate[key]) >= max_calls: return True
    _rate[key].append(now); return False

def get_ip(): return request.headers.get('X-Forwarded-For','').split(',')[0].strip() or request.remote_addr or '0.0.0.0'

# ── Auth ──────────────────────────────────────────────────
def login_required(f):
    @wraps(f)
    def dec(*a,**kw):
        if not session.get('user_id'): return redirect(url_for('login'))
        return f(*a,**kw)
    return dec

def perfil_required(*perfis):
    def decorator(f):
        @wraps(f)
        def dec(*a,**kw):
            if not session.get('user_id'): return redirect(url_for('login'))
            if session.get('perfil') not in perfis:
                return render_template('acesso_negado.html', perfil=session.get('perfil'))
            return f(*a,**kw)
        return dec
    return decorator

# ── Logo ──────────────────────────────────────────────────
def get_logo_b64():
    try:
        p = os.path.join(os.path.dirname(__file__),'static','logo_b64.txt')
        return open(p).read().strip()
    except: return ''

@app.context_processor
def inject_globals():
    return {'LOGO_B64': get_logo_b64(), 'hoje': hoje_str()}

@app.after_request
def sec(r):
    r.headers['X-Content-Type-Options'] = 'nosniff'
    r.headers['X-Frame-Options'] = 'SAMEORIGIN'
    return r

# ── Alertas ───────────────────────────────────────────────
_alertas = []
_sistema_status = {'estado':'ativo','pausado_por':None,'pausado_em':None}

def registrar_alerta(tipo, msg, corrida_id=None):
    _alertas.append({'tipo':tipo,'msg':msg,'corrida_id':corrida_id,'ts':datetime.now(TZ).strftime('%H:%M:%S'),'lido':False})
    if len(_alertas) > 50: _alertas.pop(0)

# ── Notificações ──────────────────────────────────────────
def enviar_whatsapp(numero, mensagem):
    def _s():
        try:
            if not ZAPI_TOKEN: return
            url = f"https://api.z-api.io/instances/{ZAPI_INSTANCE}/token/{ZAPI_TOKEN}/send-text"
            payload = json.dumps({"phone":numero,"message":mensagem}).encode()
            req = urllib.request.Request(url, data=payload, headers={"Content-Type":"application/json","Client-Token":ZAPI_CLIENT_TOKEN})
            urllib.request.urlopen(req, timeout=10)
        except Exception as e: log.error(f"WhatsApp: {e}")
    threading.Thread(target=_s, daemon=True).start()

def enviar_email(dest, assunto, html):
    def _s():
        try:
            if not GMAIL_USER: return
            msg = MIMEMultipart("alternative")
            msg["Subject"] = assunto; msg["From"] = f"MEDTRANS 360 <{GMAIL_USER}>"; msg["To"] = dest
            msg.attach(MIMEText(html,"html","utf-8"))
            with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as srv:
                srv.ehlo()
                srv.starttls()
                srv.ehlo()
                srv.login(GMAIL_USER, GMAIL_PASS)
                srv.sendmail(GMAIL_USER, dest, msg.as_string())
        except Exception as e: log.error(f"Email: {e}")
    threading.Thread(target=_s, daemon=True).start()

def notificar_rota_finalizada(cid, mot, pac, dest, km=0, val=0):
    agora = datetime.now(TZ).strftime("%d/%m/%Y às %H:%M")
    enviar_whatsapp(EMPRESA_WHATSAPP,
        f"🚑 *MEDTRANS 360 — ROTA FINALIZADA*\n\n✅ Corrida #{cid}\n👤 Motorista: {mot}\n🏥 Paciente: {pac}\n📍 Destino: {dest}\n📏 KM: {km:.1f}km\n💰 R$ {val:.2f}\n🕐 {agora}")
    enviar_email(EMPRESA_EMAIL, f"[MEDTRANS 360] ✅ Rota #{cid} finalizada",
        f"<div style='font-family:Arial;background:#04080f;color:#e8f0fe;padding:24px;border-radius:12px'>"
        f"<h2 style='color:#00d4ff'>MEDTRANS 360 — Rota #{cid} Finalizada</h2>"
        f"<p>Motorista: <b>{mot}</b> | Paciente: <b>{pac}</b><br>Destino: {dest} | KM: {km:.1f} | R$ {val:.2f}<br>{agora}</p></div>")

# ═══════════════════════════════════════════════════════════
#  ROTAS
# ═══════════════════════════════════════════════════════════

@app.route('/')
def index():
    return redirect(url_for('dashboard') if session.get('user_id') else url_for('login'))

@app.route('/login', methods=['GET','POST'])
def login():
    erro = None
    if request.method == 'POST':
        ip = get_ip()
        if rate_limit(f'login_{ip}',10,60):
            erro = 'Muitas tentativas. Aguarde.'
        else:
            email = request.form.get('email','').strip().lower()
            senha = request.form.get('senha','')
            conn = get_conn()
            u = conn.execute("SELECT * FROM usuarios WHERE email=? AND senha=? AND ativo=1",(email,hash_senha(senha))).fetchone()
            conn.close()
            if u:
                session.permanent = True
                session.update({'user_id':u['id'],'nome':u['nome'],'email':u['email'],
                                'perfil':u['perfil'],'empresa_id':u['empresa_id'] or 1})
                audit(u['email'],'login','',ip)
                if u['perfil'] == 'motorista': return redirect(url_for('painel_motorista'))
                if u['perfil'] == 'clinica':   return redirect(url_for('portal_clinica'))
                return redirect(url_for('dashboard'))
            erro = 'E-mail ou senha incorretos.'
    return render_template('login.html', erro=erro)

@app.route('/logout')
def logout():
    audit(session.get('email',''),'logout')
    session.clear()
    return redirect(url_for('login'))

# ── Dashboard ─────────────────────────────────────────────
@app.route('/dashboard')
@perfil_required('master','operador')
def dashboard():
    conn = get_conn()
    hoje = hoje_str()
    eid = session.get('empresa_id', 1)
    # Stats principais (filtradas por empresa)
    stats = {
        'corridas_hoje':  conn.execute("SELECT COUNT(*) FROM corridas WHERE data_agendada=? AND empresa_id=?",(hoje,eid)).fetchone()[0],
        'em_andamento':   conn.execute("SELECT COUNT(*) FROM corridas WHERE status='em_andamento' AND empresa_id=?",(eid,)).fetchone()[0],
        'agendadas':      conn.execute("SELECT COUNT(*) FROM corridas WHERE status='agendada' AND empresa_id=?",(eid,)).fetchone()[0],
        'concluidas':     conn.execute("SELECT COUNT(*) FROM corridas WHERE status='concluida' AND empresa_id=?",(eid,)).fetchone()[0],
        'motoristas':     conn.execute("SELECT COUNT(*) FROM motoristas WHERE ativo=1 AND empresa_id=?",(eid,)).fetchone()[0],
        'veiculos':       conn.execute("SELECT COUNT(*) FROM veiculos WHERE empresa_id=?",(eid,)).fetchone()[0],
        'pacientes':      conn.execute("SELECT COUNT(*) FROM pacientes WHERE empresa_id=?",(eid,)).fetchone()[0],
        'clinicas':       conn.execute("SELECT COUNT(*) FROM clinicas WHERE ativo=1 AND empresa_id=?",(eid,)).fetchone()[0],
        'receita':        conn.execute("SELECT COALESCE(SUM(valor),0) FROM corridas WHERE status='concluida' AND empresa_id=?",(eid,)).fetchone()[0],
        'km_hoje':        conn.execute("SELECT COALESCE(SUM(km_total),0) FROM corridas WHERE data_agendada=? AND status='concluida' AND empresa_id=?",(hoje,eid)).fetchone()[0],
        'km_mes':         conn.execute("SELECT COALESCE(SUM(km_total),0) FROM corridas WHERE status='concluida' AND empresa_id=?",(eid,)).fetchone()[0],
        'custo_combustivel': conn.execute("SELECT COALESCE(SUM(valor_total),0) FROM combustivel WHERE empresa_id=?",(eid,)).fetchone()[0],
        'pendentes':      conn.execute("SELECT COUNT(*) FROM corridas WHERE status='agendada' AND empresa_id=?",(eid,)).fetchone()[0],
    }
    # Corridas por dia (7 dias)
    corridas_semana = []
    from datetime import datetime as dt, timedelta as td
    for i in range(6,-1,-1):
        d = (dt.now(TZ) - td(days=i)).strftime('%d/%m/%Y')
        n = conn.execute("SELECT COUNT(*) FROM corridas WHERE data_agendada=?",(d,)).fetchone()[0]
        corridas_semana.append({'dia': (dt.now(TZ) - td(days=i)).strftime('%d/%m'), 'total': n})
    # Corridas por tipo (pizza)
    tipos = conn.execute("""SELECT tipo_servico, COUNT(*) as total FROM corridas
                            WHERE status='concluida' GROUP BY tipo_servico""").fetchall()
    tipos_data = [{'tipo': t['tipo_servico'], 'total': t['total']} for t in tipos]
    # Corridas recentes
    corridas = conn.execute("""SELECT c.*, p.nome as paciente_nome, m.nome as motorista_nome,
                               v.modelo as veiculo_modelo, cl.nome as clinica_nome
                               FROM corridas c
                               LEFT JOIN pacientes p ON c.paciente_id=p.id
                               LEFT JOIN motoristas m ON c.motorista_id=m.id
                               LEFT JOIN veiculos v ON c.veiculo_id=v.id
                               LEFT JOIN clinicas cl ON c.clinica_id=cl.id
                               ORDER BY c.id DESC LIMIT 6""").fetchall()
    conn.close()
    return render_template('dashboard.html', stats=stats, corridas=corridas,
                           corridas_semana=json.dumps(corridas_semana),
                           tipos_data=json.dumps(tipos_data),
                           usuario=session.get('nome'), perfil=session.get('perfil'),
                           sys_status=_sistema_status['estado'])

# ── Corridas ──────────────────────────────────────────────
@app.route('/corridas')
@perfil_required('master','operador')
def corridas():
    conn = get_conn()
    lista = conn.execute("""SELECT c.*, p.nome as paciente_nome, m.nome as motorista_nome,
                            v.modelo as veiculo_modelo, cl.nome as clinica_nome
                            FROM corridas c
                            LEFT JOIN pacientes p ON c.paciente_id=p.id
                            LEFT JOIN motoristas m ON c.motorista_id=m.id
                            LEFT JOIN veiculos v ON c.veiculo_id=v.id
                            LEFT JOIN clinicas cl ON c.clinica_id=cl.id
                            ORDER BY c.id DESC""").fetchall()
    pacientes  = conn.execute("SELECT * FROM pacientes ORDER BY nome").fetchall()
    motoristas = conn.execute("SELECT * FROM motoristas WHERE ativo=1 ORDER BY nome").fetchall()
    clinicas   = conn.execute("SELECT * FROM clinicas WHERE ativo=1 ORDER BY nome").fetchall()
    veiculos   = conn.execute("SELECT * FROM veiculos ORDER BY modelo").fetchall()
    conn.close()
    return render_template('corridas.html', corridas=lista, pacientes=pacientes,
                           motoristas=motoristas, clinicas=clinicas, veiculos=veiculos,
                           usuario=session.get('nome'), perfil=session.get('perfil'))

@app.route('/corridas/nova', methods=['POST'])
@perfil_required('master','operador','clinica')
def nova_corrida():
    d = request.form
    conn = get_conn()
    eid = session.get('empresa_id',1)
    conn.execute("""INSERT INTO corridas(empresa_id,paciente_id,motorista_id,veiculo_id,clinica_id,
                    origem,destino,tipo_servico,data_agendada,valor,observacoes,status,criado_em)
                    VALUES(?,?,?,?,?,?,?,?,?,?,?,'agendada',?)""",
                 (eid,d.get('paciente_id'),d.get('motorista_id'),d.get('veiculo_id'),d.get('clinica_id'),
                  d.get('origem'),d.get('destino'),d.get('tipo_servico'),d.get('data_agendada'),
                  d.get('valor') or 0,d.get('observacoes'),now_str()))
    conn.commit(); conn.close()
    return redirect(url_for('corridas'))

@app.route('/corridas/<int:cid>/status', methods=['POST'])
@login_required
def atualizar_status(cid):
    novo_status = request.form.get('status')
    conn = get_conn()
    updates = {'status': novo_status}
    if novo_status == 'em_andamento': updates['data_inicio'] = now_str()
    elif novo_status == 'concluida':
        updates['data_fim'] = now_str()
        c = conn.execute("""SELECT c.*,p.nome as paciente_nome,m.nome as motorista_nome
                            FROM corridas c LEFT JOIN pacientes p ON c.paciente_id=p.id
                            LEFT JOIN motoristas m ON c.motorista_id=m.id WHERE c.id=?""",(cid,)).fetchone()
        if c:
            mot,pac,dest,km,val = c['motorista_nome'] or '?',c['paciente_nome'] or '?',c['destino'] or '?',c['km_total'] or 0,c['valor'] or 0
            registrar_alerta('concluida',f"✅ Rota #{cid} FINALIZADA — Motorista: {mot} | Paciente: {pac} | Destino: {dest}",corrida_id=cid)
            notificar_rota_finalizada(cid,mot,pac,dest,km,val)
    sc = ', '.join(f"{k}=?" for k in updates)
    conn.execute(f"UPDATE corridas SET {sc} WHERE id=?",(*updates.values(),cid))
    conn.commit(); conn.close()
    return redirect(request.referrer or url_for('dashboard'))

@app.route('/corridas/<int:cid>/km', methods=['GET','POST'])
@login_required
def registrar_km(cid):
    conn = get_conn()
    c = conn.execute("""SELECT c.*,p.nome as paciente_nome,m.nome as motorista_nome
                        FROM corridas c LEFT JOIN pacientes p ON c.paciente_id=p.id
                        LEFT JOIN motoristas m ON c.motorista_id=m.id WHERE c.id=?""",(cid,)).fetchone()
    if not c: conn.close(); return redirect(url_for('dashboard'))
    if request.method == 'POST':
        campos = ['km_saida_garagem','km_chegada_paciente','km_saida_paciente','km_chegada_destino','km_saida_destino','km_retorno_garagem']
        vals = {}
        for campo in campos:
            v = request.form.get(campo)
            if v:
                try: vals[campo] = float(v)
                except: pass
        ks = vals.get('km_saida_garagem', c['km_saida_garagem'] or 0)
        kr = vals.get('km_retorno_garagem', c['km_retorno_garagem'] or 0)
        vals['km_total'] = max(0, kr - ks) if ks and kr else 0
        if vals:
            sc = ', '.join(f"{k}=?" for k in vals)
            conn.execute(f"UPDATE corridas SET {sc} WHERE id=?",(*vals.values(),cid))
            conn.commit()
        conn.close()
        return redirect(url_for('painel_motorista') if session.get('perfil')=='motorista' else url_for('corridas'))
    conn.close()
    return render_template('km_etapas.html', corrida=c, usuario=session.get('nome'), perfil=session.get('perfil'))

# ── Motoristas ────────────────────────────────────────────
@app.route('/motoristas')
@perfil_required('master','operador')
def motoristas():
    conn = get_conn()
    lista = conn.execute("""SELECT m.*, v.modelo as veiculo_modelo, v.placa FROM motoristas m
                            LEFT JOIN veiculos v ON m.veiculo_id=v.id ORDER BY m.nome""").fetchall()
    veiculos = conn.execute("SELECT * FROM veiculos ORDER BY modelo").fetchall()
    conn.close()
    return render_template('motoristas.html', motoristas=lista, veiculos=veiculos,
                           usuario=session.get('nome'), perfil=session.get('perfil'))

@app.route('/motoristas/novo', methods=['POST'])
@perfil_required('master','operador')
def novo_motorista():
    d = request.form
    conn = get_conn()
    conn.execute("INSERT INTO motoristas(nome,cnh,telefone,veiculo_id,criado_em) VALUES(?,?,?,?,?)",
                 (d.get('nome'),d.get('cnh'),d.get('telefone'),d.get('veiculo_id') or None,now_str()))
    conn.commit(); conn.close()
    return redirect(url_for('motoristas'))

# ── Veículos ──────────────────────────────────────────────
@app.route('/veiculos')
@perfil_required('master','operador')
def veiculos():
    conn = get_conn()
    lista = conn.execute("SELECT * FROM veiculos ORDER BY modelo").fetchall()
    conn.close()
    return render_template('veiculos.html', veiculos=lista,
                           usuario=session.get('nome'), perfil=session.get('perfil'))

@app.route('/veiculos/novo', methods=['POST'])
@perfil_required('master','operador')
def novo_veiculo():
    d = request.form
    conn = get_conn()
    conn.execute("INSERT INTO veiculos(modelo,placa,ano,tipo,km_atual,criado_em) VALUES(?,?,?,?,?,?)",
                 (d.get('modelo'),d.get('placa'),d.get('ano'),d.get('tipo'),d.get('km_atual') or 0,now_str()))
    conn.commit(); conn.close()
    return redirect(url_for('veiculos'))

# ── Pacientes ─────────────────────────────────────────────
@app.route('/pacientes')
@perfil_required('master','operador')
def pacientes():
    conn = get_conn()
    lista = conn.execute("SELECT * FROM pacientes ORDER BY nome").fetchall()
    conn.close()
    return render_template('pacientes.html', pacientes=lista,
                           usuario=session.get('nome'), perfil=session.get('perfil'))

@app.route('/pacientes/novo', methods=['POST'])
@perfil_required('master','operador','clinica')
def novo_paciente():
    d = request.form
    conn = get_conn()
    conn.execute("INSERT INTO pacientes(nome,cpf,telefone,endereco,convenio,prioridade,observacoes,criado_em) VALUES(?,?,?,?,?,?,?,?)",
                 (d.get('nome'),d.get('cpf'),d.get('telefone'),d.get('endereco'),d.get('convenio'),d.get('prioridade','normal'),d.get('observacoes'),now_str()))
    conn.commit(); conn.close()
    return redirect(url_for('pacientes'))

# ── Clínicas ──────────────────────────────────────────────
@app.route('/clinicas')
@perfil_required('master','operador')
def clinicas():
    conn = get_conn()
    lista = conn.execute("SELECT * FROM clinicas ORDER BY nome").fetchall()
    conn.close()
    return render_template('clinicas.html', clinicas=lista,
                           usuario=session.get('nome'), perfil=session.get('perfil'))

@app.route('/clinicas/nova', methods=['POST'])
@perfil_required('master','operador')
def nova_clinica():
    d = request.form
    conn = get_conn()
    conn.execute("INSERT INTO clinicas(nome,cnpj,telefone,endereco,responsavel,email,criado_em) VALUES(?,?,?,?,?,?,?)",
                 (d.get('nome'),d.get('cnpj'),d.get('telefone'),d.get('endereco'),d.get('responsavel'),d.get('email'),now_str()))
    conn.commit(); conn.close()
    return redirect(url_for('clinicas'))

# ── Combustível ───────────────────────────────────────────
@app.route('/combustivel')
@perfil_required('master','operador')
def combustivel():
    conn = get_conn()
    lista = conn.execute("""SELECT c.*, v.modelo, v.placa, m.nome as motorista_nome
                            FROM combustivel c LEFT JOIN veiculos v ON c.veiculo_id=v.id
                            LEFT JOIN motoristas m ON c.motorista_id=m.id ORDER BY c.id DESC""").fetchall()
    veiculos   = conn.execute("SELECT * FROM veiculos ORDER BY modelo").fetchall()
    motoristas = conn.execute("SELECT * FROM motoristas WHERE ativo=1 ORDER BY nome").fetchall()
    total_gasto = conn.execute("SELECT COALESCE(SUM(valor_total),0) FROM combustivel").fetchone()[0]
    conn.close()
    return render_template('combustivel.html', lista=lista, veiculos=veiculos,
                           motoristas=motoristas, total_gasto=total_gasto,
                           usuario=session.get('nome'), perfil=session.get('perfil'))

@app.route('/combustivel/novo', methods=['POST'])
@perfil_required('master','operador','motorista')
def novo_abastecimento():
    d = request.form
    litros     = float(d.get('litros') or 0)
    valor_litro= float(d.get('valor_litro') or 0)
    conn = get_conn()
    conn.execute("""INSERT INTO combustivel(veiculo_id,motorista_id,litros,valor_litro,valor_total,
                    km_atual,tipo_combustivel,posto,data,criado_em) VALUES(?,?,?,?,?,?,?,?,?,?)""",
                 (d.get('veiculo_id'),d.get('motorista_id'),litros,valor_litro,
                  litros*valor_litro,d.get('km_atual') or 0,d.get('tipo_combustivel','gasolina'),
                  d.get('posto'),d.get('data') or hoje_str(),now_str()))
    conn.commit(); conn.close()
    return redirect(url_for('combustivel'))

# ── Checklist ─────────────────────────────────────────────
@app.route('/checklist')
@perfil_required('master','operador','motorista')
def checklist():
    conn = get_conn()
    lista = conn.execute("""SELECT c.*, v.modelo, v.placa, m.nome as motorista_nome
                            FROM checklist c LEFT JOIN veiculos v ON c.veiculo_id=v.id
                            LEFT JOIN motoristas m ON c.motorista_id=m.id ORDER BY c.id DESC""").fetchall()
    veiculos   = conn.execute("SELECT * FROM veiculos ORDER BY modelo").fetchall()
    motoristas = conn.execute("SELECT * FROM motoristas WHERE ativo=1 ORDER BY nome").fetchall()
    conn.close()
    return render_template('checklist.html', lista=lista, veiculos=veiculos,
                           motoristas=motoristas,
                           usuario=session.get('nome'), perfil=session.get('perfil'))

@app.route('/checklist/novo', methods=['POST'])
@perfil_required('master','operador','motorista')
def novo_checklist():
    d = request.form
    def cb(f): return 1 if d.get(f) else 0
    conn = get_conn()
    conn.execute("""INSERT INTO checklist(veiculo_id,motorista_id,data,pneus,oleo,freios,agua,
                    bateria,luzes,limpadores,documentos,kit_primeiros_socorros,extintor,obs,criado_em)
                    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                 (d.get('veiculo_id'),d.get('motorista_id'),d.get('data') or hoje_str(),
                  cb('pneus'),cb('oleo'),cb('freios'),cb('agua'),cb('bateria'),
                  cb('luzes'),cb('limpadores'),cb('documentos'),cb('kit'),cb('extintor'),
                  d.get('obs'),now_str()))
    conn.commit(); conn.close()
    return redirect(url_for('checklist'))

# ── Painéis ───────────────────────────────────────────────
@app.route('/painel/motorista')
@perfil_required('master','operador','motorista')
def painel_motorista():
    conn = get_conn()
    corridas_ativas = conn.execute("""SELECT c.*,p.nome as paciente_nome,cl.nome as clinica_nome
                                      FROM corridas c LEFT JOIN pacientes p ON c.paciente_id=p.id
                                      LEFT JOIN clinicas cl ON c.clinica_id=cl.id
                                      WHERE c.status IN ('agendada','em_andamento') ORDER BY c.id DESC""").fetchall()
    veiculos   = conn.execute("SELECT * FROM veiculos ORDER BY modelo").fetchall()
    motoristas = conn.execute("SELECT * FROM motoristas WHERE ativo=1 ORDER BY nome").fetchall()
    conn.close()
    return render_template('painel_motorista.html', corridas=corridas_ativas,
                           veiculos=veiculos, motoristas=motoristas,
                           usuario=session.get('nome'), perfil=session.get('perfil'))

@app.route('/portal/clinica')
@perfil_required('master','operador','clinica')
def portal_clinica():
    conn = get_conn()
    corridas = conn.execute("""SELECT c.*,p.nome as paciente_nome,m.nome as motorista_nome
                               FROM corridas c LEFT JOIN pacientes p ON c.paciente_id=p.id
                               LEFT JOIN motoristas m ON c.motorista_id=m.id
                               ORDER BY c.id DESC LIMIT 30""").fetchall()
    pacientes  = conn.execute("SELECT * FROM pacientes ORDER BY nome").fetchall()
    motoristas = conn.execute("SELECT * FROM motoristas WHERE ativo=1").fetchall()
    conn.close()
    return render_template('portal_clinica.html', corridas=corridas,
                           pacientes=pacientes, motoristas=motoristas,
                           usuario=session.get('nome'), perfil=session.get('perfil'))

# ── IA ────────────────────────────────────────────────────
@app.route('/ia')
@login_required
def ia():
    conn = get_conn()
    hist = conn.execute("SELECT * FROM chat_ia WHERE usuario_id=? ORDER BY id DESC LIMIT 20",(session.get('user_id'),)).fetchall()
    conn.close()
    return render_template('ia.html', historico=list(reversed(hist)),
                           usuario=session.get('nome'), perfil=session.get('perfil'))

@app.route('/ia/chat', methods=['POST'])
@login_required
def ia_chat():
    if rate_limit(f"ia_{session.get('user_id')}",20,60):
        return jsonify({'erro':'Limite atingido'}), 429
    d = request.get_json()
    msg = (d.get('mensagem') or '').strip()[:1000]
    if not msg: return jsonify({'erro':'Vazio'}), 400
    conn = get_conn()
    hist = list(reversed(conn.execute("SELECT role,conteudo FROM chat_ia WHERE usuario_id=? ORDER BY id DESC LIMIT 10",(session.get('user_id'),)).fetchall()))
    messages = [{'role':h['role'],'content':h['conteudo']} for h in hist]
    messages.append({'role':'user','content':msg})
    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        r = client.messages.create(model='claude-sonnet-4-20250514', max_tokens=1000,
            system="Você é a IA MEDTRANS — assistente especializada em transporte médico, logística hospitalar e gestão de saúde. Responda sempre em português brasileiro de forma objetiva e profissional.",
            messages=messages)
        resp = r.content[0].text
        conn.execute("INSERT INTO chat_ia(usuario_id,role,conteudo,criado_em) VALUES(?,?,?,?)",(session.get('user_id'),'user',msg,now_str()))
        conn.execute("INSERT INTO chat_ia(usuario_id,role,conteudo,criado_em) VALUES(?,?,?,?)",(session.get('user_id'),'assistant',resp,now_str()))
        conn.commit(); conn.close()
        return jsonify({'resposta':resp})
    except Exception as e:
        conn.close()
        return jsonify({'erro':str(e)}), 500

# ── API ───────────────────────────────────────────────────
@app.route('/api/alertas')
@login_required
def api_alertas():
    nl = [a for a in _alertas if not a['lido']]
    return jsonify({'alertas':nl,'total':len(nl)})

@app.route('/api/alertas/limpar', methods=['POST'])
@login_required
def limpar_alertas_api():
    for a in _alertas: a['lido'] = True
    return jsonify({'ok':True})

@app.route('/api/operacao/<acao>', methods=['POST'])
@perfil_required('master','operador')
def controle_operacao(acao):
    global _sistema_status
    usuario = session.get('nome','?')
    msgs = {'iniciar':('ativo','▶️ Sistema INICIADO'),'pausar':('pausado','⏸️ Sistema PAUSADO'),
            'reiniciar':('ativo','🔄 Sistema REINICIADO'),'finalizar':('finalizado','⏹️ Operação FINALIZADA'),
            'limpar_alertas':None,'limpar_logs':None}
    if acao not in msgs: return jsonify({'erro':'Inválido'}), 400
    if acao in ('limpar_alertas',): _alertas.clear()
    elif acao == 'limpar_logs':
        conn = get_conn(); conn.execute("DELETE FROM audit_log"); conn.commit(); conn.close()
        registrar_alerta('info',f'🗑️ Logs limpos por {usuario}')
    else:
        estado, msg_txt = msgs[acao]
        _sistema_status = {'estado':estado,'pausado_por':usuario,'pausado_em':now_str()}
        registrar_alerta('info',f'{msg_txt} por {usuario}')
    audit(session.get('email'),f'operacao_{acao}','',get_ip())
    return jsonify({'ok':True,'estado':_sistema_status['estado']})

@app.route('/api/sistema/status')
@login_required
def sistema_status():
    return jsonify(_sistema_status)

# ── PDF ───────────────────────────────────────────────────
@app.route('/relatorio/pdf')
@perfil_required('master','operador')
def relatorio_pdf():
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
    from reportlab.lib.enums import TA_CENTER

    conn = get_conn()
    corridas = [dict(r) for r in conn.execute("""SELECT c.*,p.nome as paciente_nome,m.nome as motorista_nome
                FROM corridas c LEFT JOIN pacientes p ON c.paciente_id=p.id
                LEFT JOIN motoristas m ON c.motorista_id=m.id ORDER BY c.id DESC""").fetchall()]
    stats = {'total':len(corridas),'concluidas':sum(1 for c in corridas if c['status']=='concluida'),
             'andamento':sum(1 for c in corridas if c['status']=='em_andamento'),
             'receita':sum(c['valor'] or 0 for c in corridas if c['status']=='concluida')}
    conn.close()

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    azul  = colors.HexColor('#0066ff'); dark = colors.HexColor('#0d1a2e')
    cinza = colors.HexColor('#8ba3c7'); verde= colors.HexColor('#00e676')

    def P(txt, sz=9, bold=False, color=None, align=TA_CENTER):
        fn = 'Helvetica-Bold' if bold else 'Helvetica'
        c  = color or colors.HexColor('#c8d8f0')
        return Paragraph(txt, ParagraphStyle('p', fontSize=sz, fontName=fn, textColor=c, alignment=align))

    story = [
        P('MEDTRANS 360', 22, True, azul),
        P('Relatório Operacional Completo', 10, False, cinza),
        P(f'Gerado em {now_str()}', 8, False, cinza),
        HRFlowable(width='100%', thickness=1, color=azul, spaceAfter=12),
    ]

    stat_t = Table([[P('TOTAL',7,True,cinza),P('CONCLUÍDAS',7,True,cinza),P('EM ANDAMENTO',7,True,cinza),P('RECEITA',7,True,cinza)],
                     [P(str(stats['total']),20,True,colors.HexColor('#00d4ff')),P(str(stats['concluidas']),20,True,verde),
                      P(str(stats['andamento']),20,True,azul),P(f"R$ {stats['receita']:.0f}",16,True,verde)]],
                   colWidths=[4.1*cm]*4, rowHeights=[18,32])
    stat_t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),dark),('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#1a3050')),
                                 ('ALIGN',(0,0),(-1,-1),'CENTER'),('VALIGN',(0,0),(-1,-1),'MIDDLE'),
                                 ('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
    story += [stat_t, Spacer(1,14), P('CORRIDAS REGISTRADAS',10,True,colors.HexColor('#00d4ff'),0)]

    rows = [[P(h,7,True,azul) for h in ['#','Paciente','Motorista','Destino','Tipo','Status','KM','Valor']]]
    for c in corridas:
        rows.append([P(str(c['id']),7), P((c['paciente_nome'] or '—')[:18],7),
                     P((c['motorista_nome'] or '—')[:16],7), P((c['destino'] or '—')[:20],7),
                     P((c['tipo_servico'] or '—')[:14],7), P((c['status'] or '').replace('_',' '),7),
                     P(f"{c['km_total'] or 0:.1f}",7), P(f"R${c['valor'] or 0:.0f}",7,True,verde)])
    t = Table(rows, colWidths=[1*cm,3.2*cm,3*cm,3.2*cm,2.5*cm,2.2*cm,1.6*cm,1.5*cm], repeatRows=1)
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#0c1526')),
                            ('BACKGROUND',(0,1),(-1,-1),dark),('ROWBACKGROUNDS',(0,1),(-1,-1),[dark,colors.HexColor('#102035')]),
                            ('GRID',(0,0),(-1,-1),0.3,colors.HexColor('#1a3050')),
                            ('ALIGN',(0,0),(-1,-1),'CENTER'),('VALIGN',(0,0),(-1,-1),'MIDDLE'),
                            ('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5)]))
    story += [t, Spacer(1,20), HRFlowable(width='100%',thickness=0.5,color=cinza), Spacer(1,6),
              P('SPYNET Tecnologia Forense · CNPJ 64.000.808/0001-51 · medtranscontrole@gmail.com',7,False,cinza),
              P('Documento gerado automaticamente pelo sistema MEDTRANS 360',7,False,cinza)]
    doc.build(story)
    buf.seek(0)
    return send_file(buf, mimetype='application/pdf', as_attachment=True,
                     download_name=f'MEDTRANS360-{datetime.now(TZ).strftime("%Y%m%d-%H%M")}.pdf')


# ── USUÁRIOS ──────────────────────────────────────────────
@app.route('/usuarios')
@perfil_required('master')
def usuarios():
    conn = get_conn()
    lista = conn.execute("""SELECT u.*, e.nome as empresa_nome 
                            FROM usuarios u LEFT JOIN empresas e ON u.empresa_id=e.id 
                            ORDER BY u.id DESC""").fetchall()
    logs = conn.execute("SELECT * FROM audit_log ORDER BY id DESC LIMIT 50").fetchall()
    empresas = conn.execute("SELECT * FROM empresas ORDER BY nome").fetchall()
    perfis_list = ['master','operador','motorista','clinica']
    stats_perfis = []
    for p in perfis_list:
        total = conn.execute("SELECT COUNT(*) FROM usuarios WHERE perfil=?",(p,)).fetchone()[0]
        ativos = conn.execute("SELECT COUNT(*) FROM usuarios WHERE perfil=? AND ativo=1",(p,)).fetchone()[0]
        stats_perfis.append({'perfil':p,'total':total,'ativos':ativos})
    conn.close()
    return render_template('usuarios.html', usuarios=lista, logs=logs,
                           empresas=empresas, stats_perfis=stats_perfis,
                           usuario=session.get('nome'), perfil=session.get('perfil'))

@app.route('/usuarios/novo', methods=['POST'])
@perfil_required('master')
def novo_usuario():
    d = request.form
    conn = get_conn()
    try:
        conn.execute("INSERT INTO usuarios(empresa_id,nome,email,senha,perfil,ativo,criado_em) VALUES(?,?,?,?,?,1,?)",
                    (d.get('empresa_id',1), d.get('nome','').strip(), d.get('email','').strip().lower(),
                     hash_senha(d.get('senha','')), d.get('perfil','operador'), now_str()))
        conn.commit()
        audit(session.get('email'), 'criar_usuario', f"Email: {d.get('email')}", get_ip())
    except: pass
    conn.close()
    return redirect(url_for('usuarios'))

@app.route('/usuarios/editar', methods=['POST'])
@perfil_required('master')
def editar_usuario():
    d = request.form
    uid, nome, email, perfil_u, senha = d.get('id'), d.get('nome','').strip(), d.get('email','').strip().lower(), d.get('perfil','operador'), d.get('senha','').strip()
    conn = get_conn()
    if senha:
        conn.execute("UPDATE usuarios SET nome=?,email=?,perfil=?,senha=? WHERE id=?",(nome,email,perfil_u,hash_senha(senha),uid))
    else:
        conn.execute("UPDATE usuarios SET nome=?,email=?,perfil=? WHERE id=?",(nome,email,perfil_u,uid))
    conn.commit(); conn.close()
    audit(session.get('email'),'editar_usuario',f'ID:{uid}',get_ip())
    return redirect(url_for('usuarios'))

@app.route('/usuarios/toggle/<int:uid>', methods=['POST'])
@perfil_required('master')
def toggle_usuario(uid):
    conn = get_conn()
    u = conn.execute("SELECT ativo FROM usuarios WHERE id=?",(uid,)).fetchone()
    if u:
        novo = 0 if u['ativo'] else 1
        conn.execute("UPDATE usuarios SET ativo=? WHERE id=?",(novo,uid))
        conn.commit()
    conn.close()
    audit(session.get('email'),'toggle_usuario',f'ID:{uid}',get_ip())
    return jsonify({'ok':True})

@app.route('/usuarios/resetar-senha', methods=['POST'])
@perfil_required('master')
def resetar_senha_usuario():
    d = request.get_json()
    uid, senha = d.get('id'), d.get('senha','')
    if not senha or len(senha) < 6: return jsonify({'ok':False,'erro':'Senha muito curta'})
    conn = get_conn()
    conn.execute("UPDATE usuarios SET senha=? WHERE id=?",(hash_senha(senha),uid))
    conn.commit(); conn.close()
    audit(session.get('email'),'resetar_senha',f'ID:{uid}',get_ip())
    return jsonify({'ok':True})

@app.route('/usuarios/excluir/<int:uid>', methods=['POST'])
@perfil_required('master')
def excluir_usuario(uid):
    if uid == session.get('user_id'): return jsonify({'ok':False,'erro':'Não pode excluir sua própria conta'})
    conn = get_conn()
    conn.execute("DELETE FROM usuarios WHERE id=?",(uid,))
    conn.commit(); conn.close()
    audit(session.get('email'),'excluir_usuario',f'ID:{uid}',get_ip())
    return jsonify({'ok':True})

# ── PERFORMANCE DE MOTORISTAS ─────────────────────────────
@app.route('/relatorios/performance')
@perfil_required('master','operador')
def performance_motoristas():
    from datetime import datetime as dt, timedelta as td
    TZ2 = ZoneInfo('America/Sao_Paulo')

    # Valores padrão seguros
    periodo = request.args.get('periodo', '30')
    motorista_id = request.args.get('motorista_id', '').strip()
    eid = session.get('empresa_id', 1)

    # Estrutura de dados vazia para fallback
    dados_vazios = dict(
        motoristas_lista=[], ranking=[], combustivel_mot=[],
        corridas_semana=[{'dia': (dt.now(TZ2) - td(days=i)).strftime('%d/%m'), 'total': 0} for i in range(6,-1,-1)],
        por_tipo=[], corridas_recentes=[],
        stats=dict(total_corridas=0,concluidas=0,em_andamento=0,agendadas=0,
                   km_total=0,receita_total=0,custo_combustivel=0,mot_online=0,
                   mot_total=0,taxa_conclusao=0,custo_por_km=0,receita_por_corrida=0),
        periodo=periodo, motorista_id=motorista_id,
        usuario=session.get('nome'), perfil=session.get('perfil')
    )

    conn = None
    try:
        conn = get_conn()
        dias = int(periodo) if periodo.isdigit() else 30

        # Validar motorista_id
        filtro_mot = ""
        params_mot = [eid]
        if motorista_id and motorista_id.isdigit():
            filtro_mot = " AND c.motorista_id=%s" % motorista_id if USE_PG else " AND c.motorista_id=" + motorista_id

        def scalar(sql, params):
            try:
                r = conn.execute(sql, params).fetchone()
                if r is None: return 0
                v = list(r.values())[0] if USE_PG else r[0]
                return v or 0
            except: return 0

        motoristas_lista = conn.execute(
            "SELECT * FROM motoristas WHERE ativo=1 AND empresa_id=? ORDER BY nome", (eid,)
        ).fetchall() or []

        total_corridas = scalar(f"SELECT COUNT(*) FROM corridas c WHERE c.empresa_id=?{filtro_mot}", (eid,))
        concluidas = scalar(f"SELECT COUNT(*) FROM corridas c WHERE c.status='concluida' AND c.empresa_id=?{filtro_mot}", (eid,))
        em_andamento = scalar(f"SELECT COUNT(*) FROM corridas c WHERE c.status='em_andamento' AND c.empresa_id=?{filtro_mot}", (eid,))
        agendadas = scalar(f"SELECT COUNT(*) FROM corridas c WHERE c.status='agendada' AND c.empresa_id=?{filtro_mot}", (eid,))
        km_total = float(scalar(f"SELECT COALESCE(SUM(km_total),0) FROM corridas c WHERE c.status='concluida' AND c.empresa_id=?{filtro_mot}", (eid,)))
        receita_total = float(scalar(f"SELECT COALESCE(SUM(valor),0) FROM corridas c WHERE c.status='concluida' AND c.empresa_id=?{filtro_mot}", (eid,)))
        custo_combustivel = float(scalar("SELECT COALESCE(SUM(valor_total),0) FROM combustivel WHERE empresa_id=?", (eid,)))
        mot_online = scalar("SELECT COUNT(DISTINCT motorista_id) FROM corridas WHERE status='em_andamento' AND empresa_id=?", (eid,))

        try:
            ranking = conn.execute(f"""
                SELECT m.id, m.nome, m.telefone,
                       COUNT(c.id) as total_corridas,
                       SUM(CASE WHEN c.status='concluida' THEN 1 ELSE 0 END) as concluidas,
                       SUM(CASE WHEN c.status='em_andamento' THEN 1 ELSE 0 END) as em_andamento,
                       COALESCE(SUM(c.km_total),0) as km_total,
                       COALESCE(SUM(c.valor),0) as receita,
                       COALESCE(AVG(c.km_total),0) as km_medio,
                       MAX(c.criado_em) as ultima_corrida
                FROM motoristas m
                LEFT JOIN corridas c ON m.id=c.motorista_id AND c.empresa_id=?
                WHERE m.empresa_id=? AND m.ativo=1
                GROUP BY m.id, m.nome, m.telefone
                ORDER BY concluidas DESC, km_total DESC
            """, (eid, eid)).fetchall() or []
        except Exception as e:
            print(f"[PERF] Erro ranking: {e}")
            ranking = []

        try:
            combustivel_mot = conn.execute("""
                SELECT m.nome,
                       COUNT(cb.id) as abastecimentos,
                       COALESCE(SUM(cb.litros),0) as litros_total,
                       COALESCE(SUM(cb.valor_total),0) as custo_total
                FROM motoristas m
                LEFT JOIN combustivel cb ON m.id=cb.motorista_id
                WHERE m.empresa_id=? AND m.ativo=1
                GROUP BY m.id, m.nome
                ORDER BY custo_total DESC
            """, (eid,)).fetchall() or []
        except Exception as e:
            print(f"[PERF] Erro combustivel: {e}")
            combustivel_mot = []

        corridas_semana = []
        for i in range(6, -1, -1):
            try:
                d = (dt.now(TZ2) - td(days=i)).strftime('%d/%m/%Y')
                n = scalar("SELECT COUNT(*) FROM corridas WHERE data_agendada=? AND empresa_id=?", (d, eid))
                corridas_semana.append({'dia': (dt.now(TZ2) - td(days=i)).strftime('%d/%m'), 'total': int(n)})
            except:
                corridas_semana.append({'dia': '?', 'total': 0})

        try:
            por_tipo = conn.execute("""
                SELECT tipo_servico, COUNT(*) as total,
                       COALESCE(SUM(km_total),0) as km,
                       COALESCE(SUM(valor),0) as receita
                FROM corridas WHERE empresa_id=? AND status='concluida'
                GROUP BY tipo_servico ORDER BY total DESC
            """, (eid,)).fetchall() or []
        except Exception as e:
            print(f"[PERF] Erro por_tipo: {e}")
            por_tipo = []

        try:
            corridas_recentes = conn.execute("""
                SELECT c.*, m.nome as motorista_nome, p.nome as paciente_nome,
                       v.modelo as veiculo_modelo, v.placa
                FROM corridas c
                LEFT JOIN motoristas m ON c.motorista_id=m.id
                LEFT JOIN pacientes p ON c.paciente_id=p.id
                LEFT JOIN veiculos v ON c.veiculo_id=v.id
                WHERE c.empresa_id=?
                ORDER BY c.id DESC LIMIT 20
            """, (eid,)).fetchall() or []
        except Exception as e:
            print(f"[PERF] Erro corridas_recentes: {e}")
            corridas_recentes = []

        conn.close()
        audit(session.get('email'), 'ver_performance', '', get_ip())

        taxa_conclusao = round((concluidas / total_corridas * 100) if total_corridas else 0, 1)
        custo_por_km = round(custo_combustivel / km_total, 2) if km_total > 0 else 0
        receita_por_corrida = round(receita_total / concluidas, 2) if concluidas > 0 else 0

        return render_template('performance.html',
            motoristas_lista=motoristas_lista,
            ranking=ranking,
            combustivel_mot=combustivel_mot,
            corridas_semana=corridas_semana,
            por_tipo=por_tipo,
            corridas_recentes=corridas_recentes,
            stats=dict(
                total_corridas=total_corridas, concluidas=concluidas,
                em_andamento=em_andamento, agendadas=agendadas,
                km_total=round(km_total, 1), receita_total=receita_total,
                custo_combustivel=custo_combustivel, mot_online=mot_online,
                mot_total=len(motoristas_lista), taxa_conclusao=taxa_conclusao,
                custo_por_km=custo_por_km, receita_por_corrida=receita_por_corrida,
            ),
            periodo=periodo, motorista_id=motorista_id,
            usuario=session.get('nome'), perfil=session.get('perfil')
        )

    except Exception as e:
        import traceback
        print(f"[PERF ERROR] {e}")
        print(traceback.format_exc())
        try:
            if conn: conn.close()
        except: pass
        return render_template('performance.html', **dados_vazios)

@app.route('/relatorios/performance/pdf')
@perfil_required('master','operador')
def performance_pdf():
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
    from reportlab.lib.enums import TA_CENTER, TA_LEFT

    conn = get_conn()
    eid = session.get('empresa_id', 1)

    ranking = conn.execute("""
        SELECT m.nome,
               COUNT(c.id) as total_corridas,
               SUM(CASE WHEN c.status='concluida' THEN 1 ELSE 0 END) as concluidas,
               COALESCE(SUM(c.km_total),0) as km_total,
               COALESCE(SUM(c.valor),0) as receita
        FROM motoristas m
        LEFT JOIN corridas c ON m.id=c.motorista_id
        WHERE m.empresa_id=? AND m.ativo=1
        GROUP BY m.id, m.nome ORDER BY concluidas DESC
    """, (eid,)).fetchall()
    conn.close()

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    azul = colors.HexColor('#0066cc')
    dark = colors.HexColor('#0d1a2e')
    verde = colors.HexColor('#00b894')
    cinza = colors.HexColor('#8ba3c7')

    def P(txt, sz=9, bold=False, color=None, align=TA_CENTER):
        fn = 'Helvetica-Bold' if bold else 'Helvetica'
        c = color or colors.HexColor('#333333')
        return Paragraph(txt, ParagraphStyle('p', fontSize=sz, fontName=fn, textColor=c, alignment=align))

    story = [
        P('MEDTRANS 360', 20, True, azul),
        P('Relatório de Performance de Motoristas', 11, False, cinza),
        P(f'Gerado em {now_str()} por {session.get("nome","?")}', 8, False, cinza),
        HRFlowable(width='100%', thickness=1, color=azul, spaceAfter=12),
    ]

    rows = [[P(h, 8, True, azul) for h in ['#', 'Motorista', 'Total Corridas', 'Concluídas', 'KM Total', 'Receita', 'Taxa %']]]
    for i, m in enumerate(ranking, 1):
        taxa = round((m['concluidas'] / m['total_corridas'] * 100) if m['total_corridas'] else 0, 1)
        rows.append([
            P(str(i), 8), P(m['nome'] or '—', 8, False, colors.HexColor('#1a2a3a'), TA_LEFT),
            P(str(m['total_corridas']), 8), P(str(m['concluidas']), 8, True, verde),
            P(f"{m['km_total']:.1f} km", 8), P(f"R$ {m['receita']:.2f}", 8, True, verde),
            P(f"{taxa}%", 8, True, azul)
        ])

    t = Table(rows, colWidths=[1*cm, 5*cm, 2.5*cm, 2.5*cm, 2.5*cm, 2.5*cm, 1.5*cm], repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e8f0fe')),
        ('GRID', (0,0), (-1,-1), 0.3, colors.HexColor('#dde4ed')),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story += [t, Spacer(1, 20),
              HRFlowable(width='100%', thickness=0.5, color=cinza),
              Spacer(1, 6),
              P('SPYNET Tecnologia Forense · CNPJ 64.000.808/0001-51 · medtranscontrole@gmail.com', 7, False, cinza),
              P('Documento gerado automaticamente pelo MEDTRANS 360', 7, False, cinza)]

    doc.build(story)
    buf.seek(0)
    audit(session.get('email'), 'exportar_performance_pdf', '', get_ip())
    return send_file(buf, mimetype='application/pdf', as_attachment=True,
                     download_name=f'Performance-Motoristas-{datetime.now(TZ).strftime("%Y%m%d-%H%M")}.pdf')

@app.route('/vendas')
def vendas():
    return render_template('vendas.html')


# ─────────────────────────────────────────────────────────
#  WEBHOOK HOTMART — Cadastro automático de clientes
# ─────────────────────────────────────────────────────────
import secrets as _secrets

def gerar_senha():
    return _secrets.token_urlsafe(8)

@app.route('/webhook/hotmart', methods=['POST'])
def webhook_hotmart():
    """Recebe notificação do Hotmart e cria empresa + usuário admin"""
    try:
        data = request.get_json(silent=True) or {}
        evento = data.get('event', '')
        
        # Processar apenas compras aprovadas
        if evento not in ('PURCHASE_APPROVED', 'PURCHASE_COMPLETE'):
            return jsonify({'ok': True, 'msg': 'evento ignorado'})
        
        buyer = data.get('data', {}).get('buyer', {})
        subscription = data.get('data', {}).get('subscription', {})
        product = data.get('data', {}).get('product', {})
        
        nome_cliente = buyer.get('name', 'Cliente')
        email_cliente = buyer.get('email', '')
        plano = product.get('name', 'basico')
        
        if not email_cliente:
            return jsonify({'ok': False, 'msg': 'email não encontrado'}), 400
        
        # Verificar se já existe
        conn = get_conn()
        usuario_existente = conn.execute("SELECT * FROM usuarios WHERE email=?", (email_cliente,)).fetchone()
        
        if usuario_existente:
            conn.close()
            return jsonify({'ok': True, 'msg': 'cliente já cadastrado'})
        
        # Criar empresa
        senha = gerar_senha()
        conn.execute("INSERT OR IGNORE INTO empresas(nome,email,plano,ativo,criado_em) VALUES(?,?,?,1,?)",
                     (nome_cliente, email_cliente, plano, now_str()))
        conn.commit()
        empresa = conn.execute("SELECT id FROM empresas WHERE email=?", (email_cliente,)).fetchone()
        empresa_id = empresa['id'] if empresa else 1

        # Criar usuário admin da empresa
        conn.execute("""INSERT OR IGNORE INTO usuarios(empresa_id,nome,email,senha,perfil,ativo,criado_em)
                          VALUES(?,?,?,?,'master',1,?)""",
                       (empresa_id, nome_cliente, email_cliente, hash_senha(senha), now_str()))
        conn.commit()
        conn.close()
        
        # Enviar e-mail de boas-vindas com credenciais
        html_bv = f"""
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#0d1b2e;color:#e8f4ff;padding:24px;border-radius:12px">
          <div style="text-align:center;margin-bottom:20px">
            <div style="font-size:1.4rem;font-weight:900;color:#00bcd4;letter-spacing:2px">MEDTRANS 360</div>
            <div style="font-size:.8rem;color:#4a7898">Plataforma de Transporte Médico</div>
          </div>
          <div style="background:#162840;border:1px solid #1e3a55;border-radius:10px;padding:20px;margin-bottom:16px">
            <div style="font-size:1.1rem;font-weight:700;color:#00bcd4;margin-bottom:16px">🎉 Bem-vindo ao MEDTRANS 360!</div>
            <p style="color:#90bcd8;margin-bottom:16px">Olá, <strong style="color:#e8f4ff">{nome_cliente}</strong>! Seu acesso foi criado com sucesso.</p>
            <table style="width:100%;font-size:.85rem;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#6090b0">Plano</td><td style="color:#00bcd4;font-weight:700">{plano}</td></tr>
              <tr><td style="padding:8px 0;color:#6090b0">URL do sistema</td><td><a href="https://medtrans360.onrender.com" style="color:#00bcd4">medtrans360.onrender.com</a></td></tr>
              <tr><td style="padding:8px 0;color:#6090b0">E-mail de acesso</td><td style="color:#e8f4ff">{email_cliente}</td></tr>
              <tr><td style="padding:8px 0;color:#6090b0">Senha inicial</td><td style="color:#00e676;font-weight:700;font-size:1rem">{senha}</td></tr>
            </table>
          </div>
          <div style="background:rgba(255,152,0,.1);border:1px solid rgba(255,152,0,.3);border-radius:8px;padding:12px;margin-bottom:16px">
            <p style="color:#ff9800;font-size:.8rem;margin:0">⚠️ Por segurança, altere sua senha após o primeiro acesso.</p>
          </div>
          <div style="text-align:center;font-size:.7rem;color:#4a7898">
            SPYNET Tecnologia Forense · CNPJ 64.000.808/0001-51<br>
            Suporte: medtranscontrole@gmail.com · (61) 99396-2090
          </div>
        </div>
        """
        enviar_email(email_cliente, 
                     "🎉 Bem-vindo ao MEDTRANS 360 — Seus dados de acesso",
                     html_bv)
        
        # Notificar empresa
        notif_empresa = f"""
        <div style="font-family:Arial;background:#0d1b2e;color:#e8f4ff;padding:20px;border-radius:10px">
          <h3 style="color:#00e676">✅ Nova venda MEDTRANS 360!</h3>
          <p>Cliente: <strong>{nome_cliente}</strong></p>
          <p>E-mail: {email_cliente}</p>
          <p>Plano: {plano}</p>
          <p>Empresa ID: {empresa_id}</p>
        </div>
        """
        enviar_email(EMPRESA_EMAIL,
                     f"[MEDTRANS 360] ✅ Nova venda — {nome_cliente}",
                     notif_empresa)
        
        log.info(f"Novo cliente Hotmart: {email_cliente} | Plano: {plano}")
        return jsonify({'ok': True, 'msg': 'cliente cadastrado', 'empresa_id': empresa_id})
    
    except Exception as e:
        log.error(f"Webhook Hotmart erro: {e}")
        return jsonify({'ok': False, 'erro': str(e)}), 500


@app.route('/webhook/test', methods=['GET'])
def webhook_test():
    """Testa se o webhook está funcionando"""
    return jsonify({'ok': True, 'msg': 'Webhook MEDTRANS 360 ativo', 'url': request.url})

@app.route('/acesso-negado')
def acesso_negado():
    return render_template('acesso_negado.html', perfil=session.get('perfil',''))

with app.app_context():
    init_db()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT',5000)), debug=False)
# -*- coding: utf-8 -*-
# ============================================================
# ROTAS DE RECUPERAÇÃO DE SENHA — MEDTRANS 360
# Adicionar no app.py após a rota /login
# ============================================================

import random, time
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

TZ = ZoneInfo('America/Sao_Paulo')

# ---- TABELA (rodar uma vez no banco) ----
# CREATE TABLE IF NOT EXISTS recuperacao_senha (
#   id SERIAL PRIMARY KEY,
#   email TEXT NOT NULL,
#   codigo TEXT NOT NULL,
#   token TEXT NOT NULL,
#   ip TEXT,
#   criado_em TEXT NOT NULL,
#   expira_em TEXT NOT NULL,
#   usado INTEGER DEFAULT 0
# );

@app.route('/esqueci-senha', methods=['GET','POST'])
def esqueci_senha():
    msg = erro = None
    if request.method == 'POST':
        email = request.form.get('email','').strip().lower()
        ip = get_ip()

        # Rate limit: máx 3 tentativas por IP em 10 min
        if rate_limit(f'recover_{ip}', 3, 600):
            erro = 'Muitas tentativas. Aguarde 10 minutos.'
            return render_template('esqueci_senha.html', erro=erro)

        try:
            conn = get_conn()
            u = conn.execute(
                "SELECT id, nome, email FROM usuarios WHERE email=? AND ativo=1", (email,)
            ).fetchone()

            if u:
                codigo = str(random.randint(100000, 999999))
                token  = secrets.token_urlsafe(32)
                agora  = datetime.now(TZ)
                expira = (agora + timedelta(minutes=15)).strftime('%d/%m/%Y %H:%M:%S')
                agora_str = agora.strftime('%d/%m/%Y %H:%M:%S')

                conn.execute("""
                    INSERT INTO recuperacao_senha
                    (email, codigo, token, ip, criado_em, expira_em, usado)
                    VALUES (?, ?, ?, ?, ?, ?, 0)
                """, (email, codigo, token, ip, agora_str, expira))
                conn.commit()

                # Enviar e-mail com código
                corpo = f"""
                <div style="font-family:Arial;max-width:600px;margin:0 auto;background:#0a1628;padding:32px;border-radius:12px">
                  <div style="text-align:center;margin-bottom:24px">
                    <h1 style="color:#00d4c8;font-size:24px;margin:0">MEDTRANS 360</h1>
                    <p style="color:#a8bcd4;font-size:13px;margin:4px 0">Recuperação Segura de Acesso</p>
                  </div>
                  <div style="background:#0d1e35;border-radius:8px;padding:24px;border:1px solid #1a3555">
                    <p style="color:#ffffff;font-size:16px">Olá, <strong>{u['nome'] if u else ''}</strong>!</p>
                    <p style="color:#a8bcd4">Recebemos uma solicitação de recuperação de senha.</p>
                    <p style="color:#a8bcd4">Seu código de verificação é:</p>
                    <div style="text-align:center;margin:24px 0">
                      <span style="background:#00d4c8;color:#0a1628;font-size:36px;font-weight:700;
                             letter-spacing:12px;padding:16px 32px;border-radius:8px;display:inline-block">
                        {codigo}
                      </span>
                    </div>
                    <p style="color:#a8bcd4;font-size:13px">
                      ⏱ Este código expira em <strong style="color:#ffffff">15 minutos</strong>.
                    </p>
                    <p style="color:#a8bcd4;font-size:13px">
                      🔒 Se não foi você, ignore este e-mail.
                    </p>
                  </div>
                  <p style="color:#a8bcd4;font-size:11px;text-align:center;margin-top:16px">
                    SPYNET Tecnologia Forense · CNPJ 64.000.808/0001-51
                  </p>
                </div>
                """
                enviar_email(email, '🔐 Código de recuperação — MEDTRANS 360', corpo)
                conn.close()

                # Redirecionar para tela de verificação com token
                return redirect(url_for('verificar_codigo', token=token))
            else:
                # Não revelar se email existe ou não (segurança)
                time.sleep(1)
                msg = 'Se o e-mail estiver cadastrado, você receberá o código em instantes.'
            conn.close()
        except Exception as e:
            print(f'[RECOVER] Erro: {e}')
            erro = 'Erro interno. Tente novamente.'

    return render_template('esqueci_senha.html', msg=msg, erro=erro)


@app.route('/verificar-codigo/<token>', methods=['GET','POST'])
def verificar_codigo(token):
    msg = erro = None
    if request.method == 'POST':
        codigo = request.form.get('codigo','').strip()
        ip = get_ip()

        if rate_limit(f'verify_{ip}', 5, 300):
            erro = 'Muitas tentativas. Aguarde 5 minutos.'
            return render_template('verificar_codigo.html', token=token, erro=erro)

        try:
            conn = get_conn()
            agora = datetime.now(TZ).strftime('%d/%m/%Y %H:%M:%S')
            rec = conn.execute("""
                SELECT * FROM recuperacao_senha
                WHERE token=? AND codigo=? AND usado=0
            """, (token, codigo)).fetchone()

            if rec and rec['expira_em'] >= agora:
                conn.execute(
                    "UPDATE recuperacao_senha SET usado=1 WHERE token=?", (token,)
                )
                conn.commit()
                conn.close()
                # Gerar token de redefinição
                reset_token = secrets.token_urlsafe(32)
                session['reset_email'] = rec['email']
                session['reset_token'] = reset_token
                return redirect(url_for('nova_senha'))
            elif rec and rec['expira_em'] < agora:
                erro = 'Código expirado. Solicite um novo.'
            else:
                erro = 'Código inválido. Verifique e tente novamente.'
            conn.close()
        except Exception as e:
            print(f'[VERIFY] Erro: {e}')
            erro = 'Erro interno. Tente novamente.'

    return render_template('verificar_codigo.html', token=token, msg=msg, erro=erro)


@app.route('/nova-senha', methods=['GET','POST'])
def nova_senha():
    if not session.get('reset_email'):
        return redirect(url_for('esqueci_senha'))

    msg = erro = None
    if request.method == 'POST':
        senha = request.form.get('senha','')
        confirmar = request.form.get('confirmar','')

        if len(senha) < 8:
            erro = 'A senha deve ter no mínimo 8 caracteres.'
        elif senha != confirmar:
            erro = 'As senhas não conferem.'
        else:
            try:
                conn = get_conn()
                email = session.get('reset_email')
                conn.execute(
                    "UPDATE usuarios SET senha=? WHERE email=?",
                    (hash_senha(senha), email)
                )
                conn.commit()
                audit(email, 'recuperar_senha', '', get_ip())
                conn.close()
                session.pop('reset_email', None)
                session.pop('reset_token', None)
                return redirect(url_for('login', msg='Senha redefinida com sucesso!'))
            except Exception as e:
                print(f'[RESET] Erro: {e}')
                erro = 'Erro ao salvar. Tente novamente.'

    return render_template('nova_senha.html', msg=msg, erro=erro)
# -*- coding: utf-8 -*-
# ============================================================
# ROTAS DE RECUPERAÇÃO DE SENHA — MEDTRANS 360
# Adicionar no app.py após a rota /login
# ============================================================

import random, time
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

TZ = ZoneInfo('America/Sao_Paulo')

# ---- TABELA (rodar uma vez no banco) ----
# CREATE TABLE IF NOT EXISTS recuperacao_senha (
#   id SERIAL PRIMARY KEY,
#   email TEXT NOT NULL,
#   codigo TEXT NOT NULL,
#   token TEXT NOT NULL,
#   ip TEXT,
#   criado_em TEXT NOT NULL,
#   expira_em TEXT NOT NULL,
#   usado INTEGER DEFAULT 0
# );

