-- Criar banco de dados
CREATE DATABASE IF NOT EXISTS agenda_web;
USE agenda_web;

-- Tabela usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  codigo_verificacao VARCHAR(6) DEFAULT NULL,
  verificado TINYINT(1) NOT NULL DEFAULT 0,
  codigo_expiracao DATETIME DEFAULT NULL
);

-- Tabela eventos
CREATE TABLE IF NOT EXISTS eventos (
  id_evento INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  data_evento DATE NOT NULL,
  hora_evento TIME NOT NULL,
  id_usuario INT NOT NULL,
  urgencia VARCHAR(20) NOT NULL DEFAULT 'normal',
  cor VARCHAR(7) NOT NULL DEFAULT '#3b82f6',
  repeticao VARCHAR(20) NOT NULL DEFAULT 'nenhuma',
  alerta_minutos INT NOT NULL DEFAULT 0,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);