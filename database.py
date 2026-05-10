"""
MEDTRANS 360 — Banco de dados SQLite
Versão 2.0 — RBAC completo com painéis separados
"""
import sqlite3, os, hashlib
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo

DB_PATH = Path(os.environ.get('MEDTRANS_DB_PATH', 'data/medtrans.db'))
TZ = ZoneInfo(os.environ.get('APP_TZ', 'America/Sao_Paulo'))

def get_conn():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def _h(s): return hashlib.sha256(s.encode()).hexdigest()

def init_db():
    with get_conn() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            nome        TEXT NOT NULL,
            email       TEXT UNIQUE NOT NULL,
            senha_hash  TEXT NOT NULL,
            perfil      TEXT DEFAULT 'operador',
            clinica_id  INTEGER,
            motorista_id INTEGER,
            ativo       INTEGER DEFAULT 1,
            created_at  TEXT DEFAULT (datetime('now','localtime'))
        );
        CREATE TABLE IF NOT EXISTS clinicas (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            nome        TEXT NOT NULL,
            cnpj        TEXT,
            responsavel TEXT,
            telefone    TEXT,
            email       TEXT,
            endereco    TEXT,
            cidade      TEXT,
            estado      TEXT,
            lat         REAL,
            lng         REAL,
            ativo       INTEGER DEFAULT 1,
            created_at  TEXT DEFAULT (datetime('now','localtime'))
        );
        CREATE TABLE IF NOT EXISTS motoristas (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            nome        TEXT NOT NULL,
            cpf         TEXT,
            cnh         TEXT,
            telefone    TEXT,
            veiculo     TEXT,
            placa       TEXT,
            consumo_km  REAL DEFAULT 10.0,
            status      TEXT DEFAULT 'offline',
            clinica_id  INTEGER,
            ativo       INTEGER DEFAULT 1,
            created_at  TEXT DEFAULT (datetime('now','localtime'))
        );
        CREATE TABLE IF NOT EXISTS pacientes (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            nome            TEXT NOT NULL,
            cpf             TEXT,
            telefone        TEXT,
            endereco        TEXT,
            cidade          TEXT,
            estado          TEXT,
            lat             REAL,
            lng             REAL,
            clinica_id      INTEGER,
            acompanhante    TEXT,
            observacoes     TEXT,
            necessidades    TEXT,
            ativo           INTEGER DEFAULT 1,
            created_at      TEXT DEFAULT (datetime('now','localtime'))
        );
        CREATE TABLE IF NOT EXISTS corridas (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            paciente_id     INTEGER NOT NULL,
            motorista_id    INTEGER,
            clinica_id      INTEGER,
            tipo            TEXT DEFAULT 'ida',
            origem          TEXT,
            destino         TEXT,
            lat_origem      REAL,
            lng_origem      REAL,
            lat_destino     REAL,
            lng_destino     REAL,
            data_agendada   TEXT,
            hora_saida      TEXT,
            hora_chegada    TEXT,
            km_inicial      REAL DEFAULT 0,
            km_final        REAL DEFAULT 0,
            distancia_km    REAL DEFAULT 0,
            status          TEXT DEFAULT 'agendada',
            valor           REAL DEFAULT 0,
            observacoes     TEXT,
            created_at      TEXT DEFAULT (datetime('now','localtime')),
            updated_at      TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY(paciente_id)  REFERENCES pacientes(id),
            FOREIGN KEY(motorista_id) REFERENCES motoristas(id),
            FOREIGN KEY(clinica_id)   REFERENCES clinicas(id)
        );
        CREATE TABLE IF NOT EXISTS despesas (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            corrida_id  INTEGER,
            clinica_id  INTEGER,
            tipo        TEXT,
            descricao   TEXT,
            valor       REAL DEFAULT 0,
            data        TEXT,
            created_at  TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY(corrida_id) REFERENCES corridas(id)
        );
        CREATE TABLE IF NOT EXISTS audit_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario     TEXT,
            acao        TEXT,
            detalhes    TEXT,
            ip          TEXT,
            created_at  TEXT DEFAULT (datetime('now','localtime'))
        );
        CREATE INDEX IF NOT EXISTS idx_corridas_status    ON corridas(status);
        CREATE INDEX IF NOT EXISTS idx_corridas_clinica   ON corridas(clinica_id);
        CREATE INDEX IF NOT EXISTS idx_corridas_motorista ON corridas(motorista_id);
        CREATE INDEX IF NOT EXISTS idx_corridas_data      ON corridas(data_agendada);
        CREATE INDEX IF NOT EXISTS idx_pacientes_clinica  ON pacientes(clinica_id);
        CREATE INDEX IF NOT EXISTS idx_motoristas_status  ON motoristas(status);
        """)

        # Seed usuários demo
        demos = [
            ('Administrador Master', 'admin@medtrans360.com.br',   _h('Admin@2025!'),   'master',   None, None),
            ('Operador Central',     'operador@medtrans360.com.br', _h('Oper@2025!'),    'operador', None, None),
            ('Clínica São Lucas',    'clinica@medtrans360.com.br',  _h('Clinica@2025!'), 'clinica',  None, None),
            ('Motorista João',       'motorista@medtrans360.com.br',_h('Motor@2025!'),   'motorista',None, None),
        ]
        for nome, email, senha, perfil, cid, mid in demos:
            cur = conn.execute("SELECT id FROM users WHERE email=?", (email,))
            if not cur.fetchone():
                conn.execute(
                    "INSERT INTO users(nome,email,senha_hash,perfil,clinica_id,motorista_id) VALUES(?,?,?,?,?,?)",
                    (nome, email, senha, perfil, cid, mid)
                )

        # Seed clínica demo
        cur = conn.execute("SELECT id FROM clinicas WHERE nome='Clínica São Lucas Demo'")
        if not cur.fetchone():
            conn.execute("""INSERT INTO clinicas(nome,cnpj,responsavel,telefone,cidade,estado)
                VALUES('Clínica São Lucas Demo','00.000.000/0001-00','Dr. Demo','(61) 99999-0000','Brasília','DF')""")

        conn.commit()
    print("✅ Banco MEDTRANS 360 v2 inicializado")

def audit(usuario, acao, detalhes='', ip=''):
    with get_conn() as conn:
        conn.execute("INSERT INTO audit_log(usuario,acao,detalhes,ip) VALUES(?,?,?,?)",
                     (usuario, acao, detalhes, ip))
