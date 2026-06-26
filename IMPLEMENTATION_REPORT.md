# Relatório de Implementação de Funcionalidades (Inspiradas no ClickUp)

Este documento detalha as alterações, arquiteturas e features inspiradas no ClickUp que foram adicionadas ao projeto TaskAI.

## 1. Múltiplas Visões (Views) para os Backlogs

O ClickUp é famoso por permitir visualizar os mesmos dados em diversos formatos. Para implementar isso no TaskAI sem quebrar a consistência, desenvolvemos:

### Infraestrutura de Views
- **`useViewConfig.ts`**: Um hook global (usando Zustand/Context ou estado local unificado via `useLocalStorage`) que gerencia a view ativa do usuário (Lista, Kanban/Board, Calendário, Gantt).
- **`TaskViewToggle.tsx`**: Componente de UI moderno utilizando botões de toggle para transitar suavemente entre as visões do sistema.

### Implementações Específicas
1. **List View (`ListView.tsx`)**:
   - Agrupamento nativo baseado em status e projetos.
   - Tabelas altamente legíveis que exibem as prioridades, datas de entrega e responsáveis de forma rápida.
   - Permite interação rápida como alteração de status inline.

2. **Board View (`KanbanBoardView.tsx`)**:
   - Refatoração do Kanban para suportar as necessidades avançadas de times.
   - **WIP (Work In Progress) Limits**: Visualização clara de gargalos, limitando tarefas na coluna de progresso.
   - **Colapsar Colunas**: Otimização do espaço visual permitindo que colunas irrelevantes fiquem ocultas/colapsadas.

3. **Gantt / Calendar View** (Fundação preparada):
   - Estrutura deixada em stand-by dentro do seletor para habilitar os dados temporais (já inclusos no schema via `start_date` e `end_date` nos projetos e tasks).

## 2. Seed de Dados (WaSpeed) e Melhorias de Arquitetura

Para tangibilizar o uso da plataforma em um cenário real (ex: Empresa WaSpeed), criamos scripts de migrações (Seed) robustos na Supabase.

### Estrutura do Cenário (WaSpeed)
- **Workspaces isolados**: Criação de ambiente de trabalho dedicado.
- **Departamentos (Sectors)**: Comercial, Suporte, Desenvolvimento e Marketing.
- **Projetos Realistas**: "WaSpeed V2" e "Infraestrutura WaSpeed".
- **Usuários (Fake Auth) & Perfis**: Inserção automatizada de usuários como `Alice Comercial`, `Bob Suporte`, `Carol Dev` com vínculo transparente ao schema `auth.users` via bcrypt hardcoded para evitar dependências de extensões complexas em runtime local.
- **Tasks**: Diversas tarefas preenchendo as colunas do Board para enriquecer a experiência base.

## 3. Desafios Superados (Correções Full Stack)
- **Restrições de Schema SQL**: Correção em restrições `NOT NULL` nas chaves de relacionamento como `start_date`, `created_by` em `projects` e `collection_id` e `created_by` em `tasks`.
- **Integridade Referencial em Profiles**: Solucionamos um conflito gerado pela uniqueness constraint de `user_id` em concorrência com o disparo de triggers do `auth.users`, migrando a estratégia para um Update seguro do perfil gerado.
- **Segurança (RLS & Vault)**: Ajustes em permissões `SECURITY INVOKER` nas Edge Functions e resolução de `permission denied` (42501) no acesso a recursos críticos de chaves secretas (Vault).

## 4. Próximos Passos (Evolução)
- Conectar biblioteca de Gantt (ex: `frappe-gantt-react` ou similar) na View correspondente.
- Inserir DnD (Drag n Drop) entre grupos da List View (atualmente a lógica de drag and drop está centralizada no Kanban).
- Expandir filtros globais (Assignees, Tags e Priorities) para propagar para todas as views de forma sincronizada.
