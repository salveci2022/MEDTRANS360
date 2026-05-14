"""MEDTRANS 360 PRO — Database"""
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

def hash_senha(s): return hashlib.sha256(s.encode()).hexdigest()
def now_str(): return datetime.now(TZ).strftime('%d/%m/%Y %H:%M:%S')
def hoje_str(): return datetime.now(TZ).strftime('%d/%m/%Y')

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_conn(); c = conn.cursor()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, email TEXT UNIQUE NOT NULL, senha TEXT NOT NULL, perfil TEXT NOT NULL DEFAULT 'operador', ativo INTEGER DEFAULT 1, criado_em TEXT);
    CREATE TABLE IF NOT EXISTS veiculos (id INTEGER PRIMARY KEY AUTOINCREMENT, modelo TEXT NOT NULL, placa TEXT UNIQUE, ano INTEGER, tipo TEXT DEFAULT 'sedan', km_atual REAL DEFAULT 0, status TEXT DEFAULT 'disponivel', criado_em TEXT);
    CREATE TABLE IF NOT EXISTS motoristas (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, cnh TEXT, telefone TEXT, veiculo_id INTEGER, ativo INTEGER DEFAULT 1, criado_em TEXT);
    CREATE TABLE IF NOT EXISTS pacientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, cpf TEXT, telefone TEXT, endereco TEXT, convenio TEXT, observacoes TEXT, prioridade TEXT DEFAULT 'normal', criado_em TEXT);
    CREATE TABLE IF NOT EXISTS clinicas (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, cnpj TEXT, telefone TEXT, endereco TEXT, responsavel TEXT, email TEXT, ativo INTEGER DEFAULT 1, criado_em TEXT);
    CREATE TABLE IF NOT EXISTS corridas (id INTEGER PRIMARY KEY AUTOINCREMENT, paciente_id INTEGER, motorista_id INTEGER, veiculo_id INTEGER, clinica_id INTEGER, origem TEXT, destino TEXT, status TEXT DEFAULT 'agendada', tipo_servico TEXT DEFAULT 'consulta', data_agendada TEXT, data_inicio TEXT, data_fim TEXT, km_saida_garagem REAL, km_chegada_paciente REAL, km_saida_paciente REAL, km_chegada_destino REAL, km_saida_destino REAL, km_retorno_garagem REAL, km_total REAL DEFAULT 0, valor REAL DEFAULT 0, observacoes TEXT, criado_em TEXT);
    CREATE TABLE IF NOT EXISTS combustivel (id INTEGER PRIMARY KEY AUTOINCREMENT, veiculo_id INTEGER, motorista_id INTEGER, litros REAL, valor_litro REAL, valor_total REAL, km_atual REAL, tipo_combustivel TEXT DEFAULT 'gasolina', posto TEXT, data TEXT, criado_em TEXT);
    CREATE TABLE IF NOT EXISTS checklist (id INTEGER PRIMARY KEY AUTOINCREMENT, veiculo_id INTEGER, motorista_id INTEGER, data TEXT, pneus INTEGER DEFAULT 0, oleo INTEGER DEFAULT 0, freios INTEGER DEFAULT 0, agua INTEGER DEFAULT 0, bateria INTEGER DEFAULT 0, luzes INTEGER DEFAULT 0, limpadores INTEGER DEFAULT 0, documentos INTEGER DEFAULT 0, kit_primeiros_socorros INTEGER DEFAULT 0, extintor INTEGER DEFAULT 0, obs TEXT, criado_em TEXT);
    CREATE TABLE IF NOT EXISTS chat_ia (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER, role TEXT, conteudo TEXT, criado_em TEXT);
    CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario TEXT, acao TEXT, detalhes TEXT, ip TEXT, criado_em TEXT);
    """)
    # Usuários
    for nome,email,senha,perfil in [('Administrador','admin@medtrans360.com.br',hash_senha('Admin@2025!'),'master'),('Operador','operador@medtrans360.com.br',hash_senha('Oper@2025!'),'operador'),('Clínica','clinica@medtrans360.com.br',hash_senha('Clinica@2025!'),'clinica'),('Motorista','motorista@medtrans360.com.br',hash_senha('Motor@2025!'),'motorista')]:
        c.execute("INSERT OR IGNORE INTO usuarios(nome,email,senha,perfil,criado_em) VALUES(?,?,?,?,?)",(nome,email,senha,perfil,now_str()))
    # Veículos
    for m,p,a,t,k in [('Toyota Corolla','ABC-1234',2022,'sedan',45230),('Honda HRV','DEF-5678',2021,'suv',32100),('Renault Master','GHI-9012',2020,'van',78500),('Fiat Doblo','JKL-3456',2023,'minivan',12000),('VW Polo','MNO-7890',2022,'hatch',28400)]:
        c.execute("INSERT OR IGNORE INTO veiculos(modelo,placa,ano,tipo,km_atual,criado_em) VALUES(?,?,?,?,?,?)",(m,p,a,t,k,now_str()))
    # Motoristas
    for n,cnh,tel,vid in [('Carlos Silva','12345678900','(61) 99111-2222',1),('Ana Oliveira','98765432100','(61) 99333-4444',2),('Roberto Lima','11122233344','(61) 99555-6666',3),('Fernanda Costa','55566677788','(61) 99777-8888',4),('João Mendes','99988877766','(61) 99999-0000',5)]:
        c.execute("INSERT OR IGNORE INTO motoristas(nome,cnh,telefone,veiculo_id,criado_em) VALUES(?,?,?,?,?)",(n,cnh,tel,vid,now_str()))
    # Pacientes
    for n,cpf,tel,conv,prior in [('João Pereira','000.000.000-00','(61)98765-4321','Unimed','alta'),('Maria Santos','111.111.111-11','(61)91234-5678','Bradesco Saúde','normal'),('Pedro Alves','222.222.222-22','(61)92345-6789','SUS','normal'),('Lucia Ferreira','333.333.333-33','(61)93456-7890','Amil','alta'),('Carlos Nunes','444.444.444-44','(61)94567-8901','Unimed','normal')]:
        c.execute("INSERT OR IGNORE INTO pacientes(nome,cpf,telefone,convenio,prioridade,criado_em) VALUES(?,?,?,?,?,?)",(n,cpf,tel,conv,prior,now_str()))
    # Clínica
    c.execute("INSERT OR IGNORE INTO clinicas(nome,cnpj,telefone,endereco,criado_em) VALUES(?,?,?,?,?)",('Clínica São Lucas','00.000.000/0001-00','(61)3333-4444','SCS Quadra 2, Brasília-DF',now_str()))
    # Corridas
    for pac,mot,vei,cli,orig,dest,sts,tipo,data,km,val in [(1,1,1,1,'Asa Norte','Clínica São Lucas','concluida','hemodiálise','14/05/2026',28.4,95.0),(2,2,2,1,'Taguatinga','Hospital Santa Lúcia','em_andamento','consulta','14/05/2026',0,75.0),(3,3,3,1,'Guará','Hospital de Base','agendada','fisioterapia','15/05/2026',0,65.0),(4,1,1,1,'Asa Sul','Clínica São Lucas','concluida','hemodiálise','13/05/2026',31.2,95.0),(5,2,2,1,'Ceilândia','Hospital Regional','concluida','exame','13/05/2026',42.0,110.0),(1,3,3,1,'Samambaia','Hospital Santa Lúcia','concluida','retorno médico','12/05/2026',38.5,90.0),(3,1,1,1,'Sobradinho','Clínica São Lucas','agendada','hemodiálise','15/05/2026',0,95.0),(4,4,4,1,'Planaltina','Hospital de Base','agendada','consulta','16/05/2026',0,120.0),(5,5,5,1,'Gama','Hospital Regional','concluida','quimioterapia','11/05/2026',55.0,150.0)]:
        c.execute("INSERT OR IGNORE INTO corridas(paciente_id,motorista_id,veiculo_id,clinica_id,origem,destino,status,tipo_servico,data_agendada,km_total,valor,criado_em) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",(pac,mot,vei,cli,orig,dest,sts,tipo,data,km,val,now_str()))
    # Combustível
    for vid,mid,lit,vl,vt,km,tipo,data in [(1,1,40.0,5.89,235.6,45200,'gasolina','13/05/2026'),(2,2,35.0,5.89,206.15,32050,'gasolina','12/05/2026'),(3,3,60.0,5.69,341.4,78400,'diesel','11/05/2026')]:
        c.execute("INSERT OR IGNORE INTO combustivel(veiculo_id,motorista_id,litros,valor_litro,valor_total,km_atual,tipo_combustivel,data,criado_em) VALUES(?,?,?,?,?,?,?,?,?)",(vid,mid,lit,vl,vt,km,tipo,data,now_str()))
    # Checklist
    c.execute("INSERT OR IGNORE INTO checklist(veiculo_id,motorista_id,data,pneus,oleo,freios,agua,bateria,luzes,limpadores,documentos,kit_primeiros_socorros,extintor,criado_em) VALUES(1,1,?,1,1,1,1,1,1,1,1,1,1,?)",(hoje_str(),now_str()))
    conn.commit(); conn.close()
    print("✅ MEDTRANS PRO banco inicializado")

def audit(usuario, acao, detalhes='', ip=''):
    try:
        conn = get_conn()
        conn.execute("INSERT INTO audit_log(usuario,acao,detalhes,ip,criado_em) VALUES(?,?,?,?,?)",(usuario,acao,detalhes,ip,now_str()))
        conn.commit(); conn.close()
    except: pass
