# Checklist de publicação no GitHub

- [x] Testar `python -m unittest discover -s tests -v` e `node tests/test_frontend.mjs` (14 testes de backend e suíte de frontend, em 29/10/2026).
- [ ] Executar localmente e conferir Visão geral, Biblioteca, Radar e AI Content Studio.
- [x] Verificação estática inicial: nenhum token explícito, `.env` ou backup foi encontrado no pacote recebido. **Revise manualmente** arquivos, imagens e histórico antes de publicar.
- [ ] Decidir uma licença antes de autorizar reutilização do código.
- [ ] Tirar capturas de tela com **dados fictícios** para inserir no README, se desejar.
- [ ] Criar repositório `sensivo` no GitHub (sem README inicial, pois este pacote já tem um).
- [ ] No terminal da pasta do projeto, executar:

```bash
git init
git add .
git status
git diff --cached --stat
git diff --cached
git commit -m "chore: prepare Sensivo MVP for GitHub"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/sensivo.git
git push -u origin main
```

Substitua `SEU_USUARIO` pelo seu usuário real. Configure autenticação do GitHub quando solicitado.

**Atenção:** `git status` e `git diff --cached` devem ser revisados **antes** do primeiro commit. Se algo confidencial entrar no histórico, removê-lo do commit mais recente pode não bastar: revogue a credencial e limpe o histórico antes de publicar.
