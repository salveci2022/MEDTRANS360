"""
MEDTRANS 360 — Database
SQLite com suporte a PostgreSQL via DATABASE_URL
"""
import os, sqlite3, hashlib
from datetime import datetime
from zoneinfo import ZoneInfo

TZ = ZoneInfo('America/Sao_Paulo')
DB_PATH = os.environ.get('MEDTRANS_DB_PATH', 'data/medtrans.db')

def get_conn():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def hash_senha(s):
    return hashlib.sha256(s.encode()).hexdigest()

def now_str():
    return datetime.now(TZ).strftime('%d/%m/%Y %H:%M:%S')

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_conn()
    c = conn.cursor()

    c.executescript("""
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        perfil TEXT NOT NULL DEFAULT 'operador',
        ativo INTEGER DEFAULT 1,
        criado_em TEXT
    );

    CREATE TABLE IF NOT EXISTS motoristas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cnh TEXT,
        telefone TEXT,
        veiculo TEXT,
        placa TEXT,
        ativo INTEGER DEFAULT 1,
        criado_em TEXT
    );

    CREATE TABLE IF NOT EXISTS pacientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cpf TEXT,
        telefone TEXT,
        endereco TEXT,
        convenio TEXT,
        observacoes TEXT,
        criado_em TEXT
    );

    CREATE TABLE IF NOT EXISTS clinicas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cnpj TEXT,
        telefone TEXT,
        endereco TEXT,
        responsavel TEXT,
        email TEXT,
        ativo INTEGER DEFAULT 1,
        criado_em TEXT
    );

    CREATE TABLE IF NOT EXISTS corridas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        paciente_id INTEGER,
        motorista_id INTEGER,
        clinica_id INTEGER,
        origem TEXT,
        destino TEXT,
        status TEXT DEFAULT 'agendada',
        tipo_servico TEXT DEFAULT 'consulta',
        data_agendada TEXT,
        data_inicio TEXT,
        data_fim TEXT,
        km_saida_garagem REAL,
        km_chegada_paciente REAL,
        km_saida_paciente REAL,
        km_chegada_destino REAL,
        km_saida_destino REAL,
        km_retorno_garagem REAL,
        km_total REAL DEFAULT 0,
        valor REAL DEFAULT 0,
        observacoes TEXT,
        criado_em TEXT,
        FOREIGN KEY(paciente_id) REFERENCES pacientes(id),
        FOREIGN KEY(motorista_id) REFERENCES motoristas(id),
        FOREIGN KEY(clinica_id) REFERENCES clinicas(id)
    );

    CREATE TABLE IF NOT EXISTS chat_ia (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER,
        role TEXT,
        conteudo TEXT,
        criado_em TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT,
        acao TEXT,
        detalhes TEXT,
        ip TEXT,
        criado_em TEXT
    );
    """)

    # Usuários padrão
    usuarios = [
        ('Administrador', 'admin@medtrans360.com.br', hash_senha('Admin@2025!'), 'master'),
        ('Operador Demo', 'operador@medtrans360.com.br', hash_senha('Oper@2025!'), 'operador'),
        ('Clínica Demo', 'clinica@medtrans360.com.br', hash_senha('Clinica@2025!'), 'clinica'),
        ('Motorista Demo', 'motorista@medtrans360.com.br', hash_senha('Motor@2025!'), 'motorista'),
    ]
    for nome, email, senha, perfil in usuarios:
        c.execute("INSERT OR IGNORE INTO usuarios(nome,email,senha,perfil,criado_em) VALUES(?,?,?,?,?)",
                  (nome, email, senha, perfil, now_str()))

    # Dados demo
    c.execute("INSERT OR IGNORE INTO motoristas(nome,cnh,telefone,veiculo,placa,criado_em) VALUES(?,?,?,?,?,?)",
              ('Carlos Silva', '12345678900', '(61) 99111-2222', 'Toyota Corolla Branco', 'ABC-1234', now_str()))
    c.execute("INSERT OR IGNORE INTO motoristas(nome,cnh,telefone,veiculo,placa,criado_em) VALUES(?,?,?,?,?,?)",
              ('Ana Oliveira', '98765432100', '(61) 99333-4444', 'Honda HRV Prata', 'DEF-5678', now_str()))

    c.execute("INSERT OR IGNORE INTO pacientes(nome,cpf,telefone,convenio,criado_em) VALUES(?,?,?,?,?)",
              ('João Pereira', '000.000.000-00', '(61) 98765-4321', 'Unimed', now_str()))
    c.execute("INSERT OR IGNORE INTO pacientes(nome,cpf,telefone,convenio,criado_em) VALUES(?,?,?,?,?)",
              ('Maria Santos', '111.111.111-11', '(61) 91234-5678', 'Bradesco Saúde', now_str()))

    c.execute("INSERT OR IGNORE INTO clinicas(nome,cnpj,telefone,endereco,criado_em) VALUES(?,?,?,?,?)",
              ('Clínica São Lucas', '00.000.000/0001-00', '(61) 3333-4444', 'SCS Quadra 2, Brasília-DF', now_str()))

    c.execute("""INSERT OR IGNORE INTO corridas(paciente_id,motorista_id,clinica_id,origem,destino,
              status,tipo_servico,data_agendada,km_total,valor,criado_em)
              VALUES(1,1,1,'Asa Norte, Brasília','Clínica São Lucas','concluida','hemodiálise','14/05/2026',28.4,85.0,?)""",
              (now_str(),))
    c.execute("""INSERT OR IGNORE INTO corridas(paciente_id,motorista_id,clinica_id,origem,destino,
              status,tipo_servico,data_agendada,criado_em)
              VALUES(2,2,1,'Taguatinga, DF','Hospital Santa Lúcia','em_andamento','consulta','14/05/2026',?)""",
              (now_str(),))
    c.execute("""INSERT OR IGNORE INTO corridas(paciente_id,motorista_id,clinica_id,origem,destino,
              status,tipo_servico,data_agendada,criado_em)
              VALUES(1,1,1,'Guará, DF','Hospital de Base','agendada','fisioterapia','15/05/2026',?)""",
              (now_str(),))

    conn.commit()
    conn.close()
    print("✅ Banco MEDTRANS 360 inicializado")

def audit(usuario, acao, detalhes='', ip=''):
    try:
        conn = get_conn()
        conn.execute("INSERT INTO audit_log(usuario,acao,detalhes,ip,criado_em) VALUES(?,?,?,?,?)",
                     (usuario, acao, detalhes, ip, now_str()))
        conn.commit()
        conn.close()
    except:
        pass
