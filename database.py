"""MEDTRANS 360 PRO — Database PostgreSQL + SQLite fallback"""
import os, hashlib
from datetime import datetime
from zoneinfo import ZoneInfo

TZ = ZoneInfo('America/Sao_Paulo')
DATABASE_URL = os.environ.get('DATABASE_URL', '')
USE_PG = bool(DATABASE_URL and 'postgresql' in DATABASE_URL)

def now_str(): return datetime.now(TZ).strftime('%d/%m/%Y %H:%M:%S')
def hoje_str(): return datetime.now(TZ).strftime('%d/%m/%Y')
def hash_senha(s): return hashlib.sha256(s.encode()).hexdigest()

def get_pg_conn():
    """Conecta ao PostgreSQL tratando caracteres especiais na senha."""
    import psycopg2, psycopg2.extras
    from urllib.parse import urlparse, quote

    url = DATABASE_URL
    parsed = urlparse(url)

    # Re-encode a senha para escapar caracteres especiais como @, #, !
    usuario = parsed.username or ''
    senha = parsed.password or ''
    host = parsed.hostname or ''
    porta = parsed.port or 5432
    banco = (parsed.path or '/postgres').lstrip('/')

    conn = psycopg2.connect(
        host=host,
        port=porta,
        dbname=banco,
        user=usuario,
        password=senha,
        sslmode='require'
    )
    return conn

def get_conn():
    if USE_PG:
        return get_pg_conn()
    else:
        import sqlite3
        db = os.environ.get('MEDTRANS_DB_PATH',
             '/data/medtrans.db' if os.path.exists('/data') else 'data/medtrans.db')
        os.makedirs(os.path.dirname(db), exist_ok=True)
        conn = sqlite3.connect(db)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

def adapt_sql(sql):
    if USE_PG:
        sql = sql.replace('?', '%s')
        sql = sql.replace('INTEGER PRIMARY KEY AUTOINCREMENT', 'SERIAL PRIMARY KEY')
        sql = sql.replace('INSERT OR IGNORE INTO', 'INSERT INTO')
    return sql

def q(sql, params=None, fetchall=False, fetchone=False, scalar=False):
    conn = get_conn()
    try:
        if USE_PG:
            import psycopg2.extras
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        else:
            cur = conn.cursor()
        sql2 = adapt_sql(sql)
        cur.execute(sql2, params or ())
        if fetchall:
            rows = [dict(r) for r in cur.fetchall()]
            conn.close()
            return rows
        if fetchone:
            r = cur.fetchone()
            conn.close()
            return dict(r) if r else None
        if scalar:
            r = cur.fetchone()
            conn.close()
            if r is None: return 0
            v = list(dict(r).values())[0] if USE_PG else r[0]
            return v or 0
        conn.commit()
        conn.close()
    except Exception as e:
        try: conn.rollback()
        except: pass
        conn.close()
        raise e

def init_db():
    conn = get_conn()
    try:
        if USE_PG:
            import psycopg2.extras
            cur = conn.cursor()
        else:
            cur = conn.cursor()

        tabelas = """
CREATE TABLE IF NOT EXISTS empresas (id {pk}, nome TEXT NOT NULL, cnpj TEXT, email TEXT, telefone TEXT, plano TEXT DEFAULT 'basico', ativo INTEGER DEFAULT 1, vencimento TEXT, criado_em TEXT);
CREATE TABLE IF NOT EXISTS usuarios (id {pk}, empresa_id INTEGER DEFAULT 1, nome TEXT NOT NULL, email TEXT UNIQUE NOT NULL, senha TEXT NOT NULL, perfil TEXT NOT NULL DEFAULT 'operador', ativo INTEGER DEFAULT 1, criado_em TEXT);
CREATE TABLE IF NOT EXISTS veiculos (id {pk}, empresa_id INTEGER DEFAULT 1, modelo TEXT NOT NULL, placa TEXT, ano INTEGER, tipo TEXT DEFAULT 'sedan', km_atual REAL DEFAULT 0, status TEXT DEFAULT 'disponivel', criado_em TEXT);
CREATE TABLE IF NOT EXISTS motoristas (id {pk}, empresa_id INTEGER DEFAULT 1, nome TEXT NOT NULL, cnh TEXT, telefone TEXT, veiculo_id INTEGER, ativo INTEGER DEFAULT 1, criado_em TEXT);
CREATE TABLE IF NOT EXISTS pacientes (id {pk}, empresa_id INTEGER DEFAULT 1, nome TEXT NOT NULL, cpf TEXT, telefone TEXT, endereco TEXT, convenio TEXT, observacoes TEXT, prioridade TEXT DEFAULT 'normal', criado_em TEXT);
CREATE TABLE IF NOT EXISTS clinicas (id {pk}, empresa_id INTEGER DEFAULT 1, nome TEXT NOT NULL, cnpj TEXT, telefone TEXT, endereco TEXT, responsavel TEXT, email TEXT, ativo INTEGER DEFAULT 1, criado_em TEXT);
CREATE TABLE IF NOT EXISTS corridas (id {pk}, empresa_id INTEGER DEFAULT 1, paciente_id INTEGER, motorista_id INTEGER, veiculo_id INTEGER, clinica_id INTEGER, origem TEXT, destino TEXT, status TEXT DEFAULT 'agendada', tipo_servico TEXT DEFAULT 'consulta', data_agendada TEXT, data_inicio TEXT, data_fim TEXT, km_saida_garagem REAL, km_chegada_paciente REAL, km_saida_paciente REAL, km_chegada_destino REAL, km_saida_destino REAL, km_retorno_garagem REAL, km_total REAL DEFAULT 0, valor REAL DEFAULT 0, observacoes TEXT, criado_em TEXT);
CREATE TABLE IF NOT EXISTS combustivel (id {pk}, empresa_id INTEGER DEFAULT 1, veiculo_id INTEGER, motorista_id INTEGER, litros REAL, valor_litro REAL, valor_total REAL, km_atual REAL, tipo_combustivel TEXT DEFAULT 'gasolina', posto TEXT, data TEXT, criado_em TEXT);
CREATE TABLE IF NOT EXISTS checklist (id {pk}, empresa_id INTEGER DEFAULT 1, veiculo_id INTEGER, motorista_id INTEGER, data TEXT, pneus INTEGER DEFAULT 0, oleo INTEGER DEFAULT 0, freios INTEGER DEFAULT 0, agua INTEGER DEFAULT 0, bateria INTEGER DEFAULT 0, luzes INTEGER DEFAULT 0, limpadores INTEGER DEFAULT 0, documentos INTEGER DEFAULT 0, kit_primeiros_socorros INTEGER DEFAULT 0, extintor INTEGER DEFAULT 0, obs TEXT, criado_em TEXT);
CREATE TABLE IF NOT EXISTS chat_ia (id {pk}, empresa_id INTEGER DEFAULT 1, usuario_id INTEGER, role TEXT, conteudo TEXT, criado_em TEXT);
CREATE TABLE IF NOT EXISTS audit_log (id {pk}, empresa_id INTEGER DEFAULT 1, usuario TEXT, acao TEXT, detalhes TEXT, ip TEXT, criado_em TEXT);
""".format(pk='SERIAL PRIMARY KEY' if USE_PG else 'INTEGER PRIMARY KEY AUTOINCREMENT')

        for stmt in tabelas.strip().split('\n'):
            stmt = stmt.strip()
            if not stmt: continue
            try:
                cur.execute(stmt)
                conn.commit()
            except Exception as e:
                conn.rollback()

        # Dados demo
        def ins(sql, params):
            try:
                if USE_PG:
                    sql2 = sql.replace('?','%s').replace('INSERT OR IGNORE','INSERT').replace('VALUES(','VALUES(') 
                    if 'ON CONFLICT' not in sql2:
                        sql2 += ' ON CONFLICT DO NOTHING'
                    cur.execute(sql2, params)
                else:
                    cur.execute(sql, params)
                conn.commit()
            except:
                conn.rollback()

        ins("INSERT OR IGNORE INTO empresas(id,nome,email,plano,ativo,criado_em) VALUES(1,'MEDTRANS DEMO','medtranscontrole@gmail.com','pro',1,?)",(now_str(),))
        for nome,email,senha,perfil in [('Administrador','admin@medtrans360.com.br',hash_senha('Admin@2025!'),'master'),('Operador','operador@medtrans360.com.br',hash_senha('Oper@2025!'),'operador'),('Clínica','clinica@medtrans360.com.br',hash_senha('Clinica@2025!'),'clinica'),('Motorista','motorista@medtrans360.com.br',hash_senha('Motor@2025!'),'motorista')]:
            ins("INSERT OR IGNORE INTO usuarios(empresa_id,nome,email,senha,perfil,criado_em) VALUES(1,?,?,?,?,?)",(nome,email,senha,perfil,now_str()))
        for m,p,a,t,k in [('Toyota Corolla','ABC-1234',2022,'sedan',45230),('Honda HRV','DEF-5678',2021,'suv',32100),('Renault Master','GHI-9012',2020,'van',78500),('Fiat Doblo','JKL-3456',2023,'minivan',12000),('VW Polo','MNO-7890',2022,'hatch',28400)]:
            ins("INSERT OR IGNORE INTO veiculos(empresa_id,modelo,placa,ano,tipo,km_atual,criado_em) VALUES(1,?,?,?,?,?,?)",(m,p,a,t,k,now_str()))
        for n,cnh,tel,vid in [('Carlos Silva','12345678900','(61)99111-2222',1),('Ana Oliveira','98765432100','(61)99333-4444',2),('Roberto Lima','11122233344','(61)99555-6666',3),('Fernanda Costa','55566677788','(61)99777-8888',4),('João Mendes','99988877766','(61)99999-0000',5)]:
            ins("INSERT OR IGNORE INTO motoristas(empresa_id,nome,cnh,telefone,veiculo_id,criado_em) VALUES(1,?,?,?,?,?)",(n,cnh,tel,vid,now_str()))
        for n,cpf,tel,conv,prior in [('João Pereira','000.000.000-00','(61)98765-4321','Unimed','alta'),('Maria Santos','111.111.111-11','(61)91234-5678','Bradesco','normal'),('Pedro Alves','222.222.222-22','(61)92345-6789','SUS','normal'),('Lucia Ferreira','333.333.333-33','(61)93456-7890','Amil','alta'),('Carlos Nunes','444.444.444-44','(61)94567-8901','Unimed','normal')]:
            ins("INSERT OR IGNORE INTO pacientes(empresa_id,nome,cpf,telefone,convenio,prioridade,criado_em) VALUES(1,?,?,?,?,?,?)",(n,cpf,tel,conv,prior,now_str()))
        ins("INSERT OR IGNORE INTO clinicas(empresa_id,nome,telefone,endereco,criado_em) VALUES(1,?,?,?,?)",('Clínica São Lucas','(61)3333-4444','SCS Quadra 2',now_str()))
        for pac,mot,vei,cli,orig,dest,sts,tipo,data,km,val in [(1,1,1,1,'Asa Norte','Clínica São Lucas','concluida','hemodiálise','14/05/2026',28.4,95.0),(2,2,2,1,'Taguatinga','Hospital Santa Lúcia','em_andamento','consulta','14/05/2026',0,75.0),(3,3,3,1,'Guará','Hospital de Base','agendada','fisioterapia','15/05/2026',0,65.0)]:
            ins("INSERT OR IGNORE INTO corridas(empresa_id,paciente_id,motorista_id,veiculo_id,clinica_id,origem,destino,status,tipo_servico,data_agendada,km_total,valor,criado_em) VALUES(1,?,?,?,?,?,?,?,?,?,?,?,?)",(pac,mot,vei,cli,orig,dest,sts,tipo,data,km,val,now_str()))

        conn.close()
        print(f"✅ Banco {'PostgreSQL' if USE_PG else 'SQLite'} inicializado")
    except Exception as e:
        conn.close()
        print(f"Erro init_db: {e}")

def audit(usuario, acao, detalhes='', ip='', empresa_id=1):
    try:
        q("INSERT OR IGNORE INTO audit_log(empresa_id,usuario,acao,detalhes,ip,criado_em) VALUES(1,?,?,?,?,?)",
          (usuario,acao,detalhes,ip,now_str()))
    except: pass
