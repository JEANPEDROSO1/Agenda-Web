# Modelo de Entidade-Relacionamento (DER) - Agenda Web

Este documento descreve a modelagem completa de Banco de Dados Relacional do sistema **Agenda Web**, baseada diretamente no esquema de criação do arquivo `db.js`.

O banco de dados contempla o gerenciamento de usuários, segurança (tokens), agendas pessoais, módulos colaborativos (grupos) e a extensão de quadros Kanban (módulo Trello).

---

## 1. Diagrama Visual (Mermaid)

*Dica: Se você estiver usando o Visual Studio Code, pressione `Ctrl + Shift + V` para renderizar o diagrama abaixo como uma imagem estruturada.*

```mermaid
erDiagram
    %% ==========================================
    %% ENTIDADES CORE & AUTENTICAÇÃO
    %% ==========================================
    USUARIOS {
        int id_usuario PK
        varchar nome
        varchar email
        varchar senha
        varchar codigo_verificacao
        tinyint verificado
        datetime codigo_expiracao
        varchar role
        timestamp criado_em
    }
    
    PERFIS {
        int id_perfil PK
        int id_usuario FK "UNIQUE"
        longtext foto_caminho
    }
    
    REFRESH_TOKENS {
        int id PK
        int id_usuario FK
        varchar token "UNIQUE"
        datetime expira_em
    }

    RECUPERACAO_SENHA {
        int id PK
        varchar email
        varchar codigo
        datetime expira_em
        tinyint verificado
    }

    %% ==========================================
    %% AGENDA PESSOAL
    %% ==========================================
    EVENTOS {
        int id_evento PK
        int id_usuario FK
        varchar titulo
        text descricao
        date data_evento
        time hora_evento
        varchar urgencia
        varchar cor
        varchar repeticao
        int alerta_minutos
        varchar ultimo_alerta_enviado
        varchar ultimo_inicio_enviado
    }

    %% ==========================================
    %% MÓDULO DE GRUPOS E AGENDA COLABORATIVA
    %% ==========================================
    GRUPOS {
        int id_grupo PK
        varchar nome
        int id_criador FK
    }

    GRUPO_PARTICIPANTES {
        int id_participante PK
        int id_grupo FK
        int id_usuario FK
        varchar funcao
    }

    GRUPO_EVENTOS {
        int id_grupo_evento PK
        int id_grupo FK
        int id_criador FK
        varchar titulo
        text descricao
        date data_evento
        time hora_evento
        varchar local
        varchar cor
        varchar urgencia
        varchar repeticao
        int alerta_minutos
    }

    %% ==========================================
    %% MÓDULO TRELLO (KANBAN)
    %% ==========================================
    TRELLO_QUADROS {
        int id_quadro PK
        int id_grupo FK
        varchar nome
    }

    TRELLO_LISTAS {
        int id_lista PK
        int id_quadro FK
        varchar nome
        int posicao
    }

    TRELLO_CARTOES {
        int id_cartao PK
        int id_lista FK
        varchar titulo
        text descricao
        date prazo
        tinyint concluido
        int posicao
    }

    TRELLO_CARTAO_RESPONSAVEIS {
        int id_cartao_responsavel PK
        int id_cartao FK
        int id_usuario FK
    }

    %% ==========================================
    %% RELACIONAMENTOS (CARDINALIDADE)
    %% ==========================================
    
    %% Usuários e Segurança
    USUARIOS ||--|| PERFIS : "possui (1:1)"
    USUARIOS ||--o{ REFRESH_TOKENS : "mantém sessões (1:N)"
    
    %% Agenda Pessoal
    USUARIOS ||--o{ EVENTOS : "cadastra eventos (1:N)"
    
    %% Grupos e Colaboração
    USUARIOS ||--o{ GRUPOS : "cria grupos (1:N)"
    GRUPOS ||--o{ GRUPO_PARTICIPANTES : "possui membros (1:N)"
    USUARIOS ||--o{ GRUPO_PARTICIPANTES : "participa como (1:N)"
    
    GRUPOS ||--o{ GRUPO_EVENTOS : "contém eventos (1:N)"
    USUARIOS ||--o{ GRUPO_EVENTOS : "registra no grupo (1:N)"

    %% Módulo Kanban (Trello)
    GRUPOS ||--o{ TRELLO_QUADROS : "possui quadros (1:N)"
    TRELLO_QUADROS ||--o{ TRELLO_LISTAS : "contém colunas/listas (1:N)"
    TRELLO_LISTAS ||--o{ TRELLO_CARTOES : "agrupa cartões (1:N)"
    
    TRELLO_CARTOES ||--o{ TRELLO_CARTAO_RESPONSAVEIS : "atribuído a (1:N)"
    USUARIOS ||--o{ TRELLO_CARTAO_RESPONSAVEIS : "responsável por (1:N)"

```

---

## 2. Dicionário de Dados

Abaixo estão detalhadas todas as tabelas criadas pela API do sistema. Todas as exclusões são controladas via restrição referencial `ON DELETE CASCADE`, garantindo que não existam dados "órfãos" no banco.

### 2.1. Núcleo de Usuários e Segurança
* **`usuarios`**: Tabela mestre. Armazena as credenciais primárias, *hashes* de senha (Bcrypt), e controla as verificações de e-mail (OTP) e privilégios de sistema (`role` = 'user' ou 'admin').
* **`perfis`**: Relação exclusiva `1:1` com `usuarios`. Armazena a coluna `foto_caminho` (como `LONGTEXT`) para salvar as imagens de avatar em formato *Base64* direto no banco.
* **`refresh_tokens`**: Gerencia a segurança em segundo plano (Arquitetura *Dual-Token*). Armazena o token invisível que renova a sessão do usuário a cada 15 minutos sem precisar refazer login.
* **`recuperacao_senha`**: Tabela temporária para gerenciar solicitações de redefinição de senhas com limites estritos de expiração (`expira_em`).
* **`msal_cache`**: *(Tabela auxiliar)* Mantém o cache persistente da integração com o Azure Active Directory / Microsoft Graph (para os envios de e-mail).

### 2.2. Módulo de Agenda Pessoal
* **`eventos`**: Representa a agenda individual do usuário. Contém metadados do compromisso, regras de repetição, urgência, cores hexadecimais para o front-end e um sistema de travas (`ultimo_alerta_enviado`) para que o agendador automático (Cron) não dispare o mesmo e-mail de notificação duas vezes.

### 2.3. Módulo de Grupos (Colaborativo)
* **`grupos`**: Entidade lógica que representa um agrupamento de pessoas (ex: "Equipe TI", "Família"). Armazena apenas o nome do grupo e o ID do usuário que fundou (`id_criador`).
* **`grupo_participantes`**: Tabela associativa (M:N). Ela interliga um Usuário a um Grupo e define qual é o cargo dele lá dentro (`funcao`: *dono*, *admin* ou *membro*).
* **`grupo_eventos`**: Espelha o funcionamento da agenda pessoal, mas o evento pertence estritamente ao Grupo e não apenas a uma pessoa. Possui chave estrangeira extra identificando quem foi o usuário específico do grupo que criou aquele agendamento (`id_criador`).

### 2.4. Módulo Kanban (Estilo Trello)
O sistema possibilita que os grupos tenham quadros de gerenciamento ágil de tarefas.
* **`trello_quadros`**: Os "Boards". Pertencem a um grupo.
* **`trello_listas`**: As colunas verticais do quadro (Ex: *A Fazer*, *Fazendo*, *Concluído*). Elas ordenam-se através do campo numérico `posicao`.
* **`trello_cartoes`**: As tarefas que são inseridas dentro de uma lista. Contém prazos e marcadores de conclusão (`concluido`). Movem-se visualmente atualizando a `posicao` ou mudando a chave estrangeira `id_lista`.
* **`trello_cartao_responsaveis`**: Tabela associativa que delega usuários a cartões específicos (Ex: Atribuir a "João" a tarefa de "Fazer Relatório").
