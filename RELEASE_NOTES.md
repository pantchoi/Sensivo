# Sensivo — Revisão pré-publicação (v5.9.10)

Revisado a partir do arquivo `Sensivo17.zip` fornecido pelo usuário, sem substituir a lógica de negócio nem o CSS.

## Verificações executadas

- `python -m unittest discover -s tests -v`: **14 testes passaram**.
- `node tests/test_frontend.mjs`: **suíte passou**.
- Arquivo de entrada: 31 arquivos, incluindo os módulos e testes da v5.9.10.
- Inspeção estática inicial: não foram encontrados tokens explícitos, `.env` real ou arquivos de backup no ZIP recebido.
- O servidor está configurado para escutar em `127.0.0.1` (não é serviço público).
- Documentação: README atualizado para v5.9.10; CHANGELOG em ordem decrescente; checklist de publicação atualizado.

## Antes de tornar público

1. Confirmar que o CSV de exemplo e as imagens não contêm dados de pessoas reais sem permissão.
2. Fazer teste manual de navegação e geração com Ollama no seu computador.
3. Escolher uma licença (não foi incluída automaticamente).
4. Adicionar capturas de tela com dados fictícios ao README, se desejado.
5. Conferir `git diff --cached` antes do primeiro commit.

## Limites da revisão

Não houve teste visual em navegador nem geração real via Ollama. A revisão estática não é auditoria de segurança completa. A coleta via Apify depende de credenciais e de serviço externo. Não publique dados privados de comentários.
